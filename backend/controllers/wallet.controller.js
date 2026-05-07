import mongoose from "mongoose";
import LedgerEntry from "../models/ledgerEntry.model.js";
import User from "../models/user.model.js";
import Event from "../models/event.model.js";
import PendingVendorPayout from "../models/pendingVendorPayout.model.js";
import Notification from "../models/notification.model.js";
import notificationBus from "../utils/notificationBus.js";

const notifyUser = async ({ userId, title, message, link = "" }) => {
  if (!userId) return;
  await Notification.create({
    user: userId,
    title,
    message,
    link,
  });
  notificationBus.emit("notification", {
    userId: userId.toString(),
    title,
    message,
    link,
    createdAt: new Date().toISOString(),
  });
};

const isNoTransactionSupportError = (e) =>
  String(e?.message || "").toLowerCase().includes("transaction numbers are only allowed");

export const getAdminWallet = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const pendingVendorPayouts = await PendingVendorPayout.find({
      releasedAt: null,
    })
      .sort({ createdAt: 1 })
      .populate("eventId", "title date")
      .populate("vendorId", "name email")
      .lean();

    const agg = await LedgerEntry.aggregate([
      { $match: { type: "admin_commission" } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const recent = await LedgerEntry.find()
      .sort({ createdAt: -1 })
      .limit(80)
      .populate("eventId", "title date")
      .populate("userId", "name email")
      .lean();

    const totalCommission = agg[0]?.totalCommission || 0;

    return res.json({
      totalCommission: Math.round(totalCommission * 100) / 100,
      settlementCount: agg[0]?.count || 0,
      recent,
      pendingVendorPayouts,
    });
  } catch {
    return res.status(500).json({ message: "Could not load admin wallet" });
  }
};

export const releaseVendorPayout = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  const applyRelease = async ({ pending, session = null }) => {
    const dbOpts = session ? { session } : {};
    const amount = Math.round(Number(pending.vendorReceives || 0) * 100) / 100;

    await LedgerEntry.create(
      [
        {
          type: "vendor_payout",
          eventId: pending.eventId,
          userId: pending.vendorId,
          amount,
          note: "Vendor share released by Planit admin (after client settlement)",
        },
      ],
      dbOpts
    );

    await User.findByIdAndUpdate(pending.vendorId, { $inc: { accountBalance: amount } }, dbOpts);
    pending.releasedAt = new Date();
    await pending.save(dbOpts);
    return amount;
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const pending = await PendingVendorPayout.findById(req.params.id).session(session);
    if (!pending) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Payout not found" });
    }
    if (pending.releasedAt) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Already released" });
    }

    const amount = await applyRelease({ pending, session });

    await session.commitTransaction();

    const ev = await Event.findById(pending.eventId).select("title").lean();
    await notifyUser({
      userId: pending.vendorId,
      title: "Payment received",
      message: `${amount.toLocaleString()} credited for "${ev?.title || "Event"}" (simulated).`,
      link: "/vendor",
    });

    return res.json({ ok: true, released: amount });
  } catch (e) {
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch {
      // Ignore abort error; keep original failure reason.
    }

    if (isNoTransactionSupportError(e)) {
      try {
        const pending = await PendingVendorPayout.findById(req.params.id);
        if (!pending) return res.status(404).json({ message: "Payout not found" });
        if (pending.releasedAt) return res.status(400).json({ message: "Already released" });

        const amount = await applyRelease({ pending });
        const ev = await Event.findById(pending.eventId).select("title").lean();
        await notifyUser({
          userId: pending.vendorId,
          title: "Payment received",
          message: `${amount.toLocaleString()} credited for "${ev?.title || "Event"}" (simulated).`,
          link: "/vendor",
        });
        return res.json({ ok: true, released: amount, usedTransactionFallback: true });
      } catch (fallbackError) {
        console.error(fallbackError);
        return res.status(500).json({ message: fallbackError?.message || "Release failed" });
      }
    }

    console.error(e);
    return res.status(500).json({ message: e?.message || "Release failed" });
  } finally {
    session.endSession();
  }
};

export const releaseAllVendorPayoutsForEvent = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  const eventId = req.params.eventId;
  const applyReleaseAll = async ({ pendingRows, session = null }) => {
    const dbOpts = session ? { session } : {};
    for (const pending of pendingRows) {
      const amount = Math.round(Number(pending.vendorReceives || 0) * 100) / 100;
      await LedgerEntry.create(
        [
          {
            type: "vendor_payout",
            eventId: pending.eventId,
            userId: pending.vendorId,
            amount,
            note: "Vendor share released by Planit admin (after client settlement)",
          },
        ],
        dbOpts
      );
      await User.findByIdAndUpdate(pending.vendorId, { $inc: { accountBalance: amount } }, dbOpts);
      pending.releasedAt = new Date();
      await pending.save(dbOpts);
    }
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const pendingRows = await PendingVendorPayout.find({
      eventId,
      releasedAt: null,
    }).session(session);

    if (!pendingRows.length) {
      await session.abortTransaction();
      return res.status(400).json({ message: "No pending payouts for this event" });
    }

    await applyReleaseAll({ pendingRows, session });

    await session.commitTransaction();

    const ev = await Event.findById(eventId).select("title").lean();
    for (const pending of pendingRows) {
      const amount = Math.round(Number(pending.vendorReceives || 0) * 100) / 100;
      await notifyUser({
        userId: pending.vendorId,
        title: "Payment received",
        message: `${amount.toLocaleString()} credited for "${ev?.title || "Event"}" (simulated).`,
        link: "/vendor",
      });
    }

    return res.json({ ok: true, releasedCount: pendingRows.length });
  } catch (e) {
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch {
      // Ignore abort error; keep original failure reason.
    }

    if (isNoTransactionSupportError(e)) {
      try {
        const pendingRows = await PendingVendorPayout.find({
          eventId,
          releasedAt: null,
        });
        if (!pendingRows.length) {
          return res.status(400).json({ message: "No pending payouts for this event" });
        }

        await applyReleaseAll({ pendingRows });
        const ev = await Event.findById(eventId).select("title").lean();
        for (const pending of pendingRows) {
          const amount = Math.round(Number(pending.vendorReceives || 0) * 100) / 100;
          await notifyUser({
            userId: pending.vendorId,
            title: "Payment received",
            message: `${amount.toLocaleString()} credited for "${ev?.title || "Event"}" (simulated).`,
            link: "/vendor",
          });
        }

        return res.json({
          ok: true,
          releasedCount: pendingRows.length,
          usedTransactionFallback: true,
        });
      } catch (fallbackError) {
        console.error(fallbackError);
        return res.status(500).json({ message: fallbackError?.message || "Release-all failed" });
      }
    }

    console.error(e);
    return res.status(500).json({ message: e?.message || "Release-all failed" });
  } finally {
    session.endSession();
  }
};

export const getVendorWallet = async (req, res) => {
  try {
    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Vendors only" });
    }

    const user = await User.findById(req.user.id).select("accountBalance name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const payouts = await LedgerEntry.find({
      type: "vendor_payout",
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("eventId", "title date")
      .lean();

    return res.json({
      balance: Math.round(Number(user.accountBalance || 0) * 100) / 100,
      payouts,
    });
  } catch {
    return res.status(500).json({ message: "Could not load vendor wallet" });
  }
};
