import mongoose from "mongoose";
import Event from "../models/event.model.js";
import LedgerEntry from "../models/ledgerEntry.model.js";
import PendingVendorPayout from "../models/pendingVendorPayout.model.js";
import Notification from "../models/notification.model.js";
import notificationBus from "../utils/notificationBus.js";
import {
  buildSettlementLines,
  CLIENT_MARKUP,
  VENDOR_CUT,
} from "../utils/settlementCalc.js";

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

export const getEventSettlement = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "vendors.vendorId",
      "name email"
    );
    if (!event || event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (!event.postClosureLocked) {
      return res.status(400).json({
        message: "Settlement is available only after the event is closed by admin.",
      });
    }

    const calc = buildSettlementLines(event);
    return res.json({
      alreadyPaid: Boolean(event.settlementPaidAt),
      paidAt: event.settlementPaidAt,
      ...calc,
      eventTitle: event.title,
    });
  } catch {
    return res.status(500).json({ message: "Could not load settlement" });
  }
};

export const payEventSettlement = async (req, res) => {
  const writeSettlement = async ({ event, calc, session = null }) => {
    const dbOpts = session ? { session } : {};

    const existingClientSettlement = await LedgerEntry.findOne({
      type: "client_settlement",
      eventId: event._id,
      userId: req.user.id,
    }).session(session || null);
    if (!existingClientSettlement) {
      await LedgerEntry.create(
        [
          {
            type: "client_settlement",
            eventId: event._id,
            userId: req.user.id,
            amount: calc.clientTotal,
            note: `Client settlement (includes ${CLIENT_MARKUP * 100}% Planit fee on vendor total)`,
          },
        ],
        dbOpts
      );
    }

    for (const line of calc.lines) {
      await PendingVendorPayout.updateOne(
        { eventId: event._id, vendorId: line.vendorId },
        {
          $setOnInsert: {
            eventId: event._id,
            vendorId: line.vendorId,
            offerAmount: line.offerAmount,
            vendorReceives: line.vendorReceives,
            vendorCommission: line.vendorCommission,
            releasedAt: null,
          },
        },
        { upsert: true, ...dbOpts }
      );
    }

    const existingAdminCommission = await LedgerEntry.findOne({
      type: "admin_commission",
      eventId: event._id,
    }).session(session || null);
    if (!existingAdminCommission) {
      await LedgerEntry.create(
        [
          {
            type: "admin_commission",
            eventId: event._id,
            amount: calc.adminCommission,
            note: `Planit commission (${CLIENT_MARKUP * 100}% client + ${VENDOR_CUT * 100}% vendor on hires)`,
          },
        ],
        dbOpts
      );
    }

    event.settlementPaidAt = new Date();
    await event.save(dbOpts);
  };

  const sendPostSettlementNotifications = async ({ event, calc }) => {
    for (const line of calc.lines) {
      await notifyUser({
        userId: line.vendorId,
        title: "Payout pending Planit release",
        message: `Client paid for "${event.title}". Your share (${line.vendorReceives.toLocaleString()} after fees) will be credited when Planit releases it.`,
        link: "/vendor",
      });
    }

    await notifyUser({
      userId: req.user.id,
      title: "Settlement complete",
      message: `Recorded payment of ${calc.clientTotal.toLocaleString()} for "${event.title}".`,
      link: "/client",
    });
  };

  const isNoTransactionSupportError = (e) =>
    String(e?.message || "").toLowerCase().includes("transaction numbers are only allowed");

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const event = await Event.findById(req.params.id)
      .populate("vendors.vendorId", "name email")
      .session(session);

    if (!event || event.clientId.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Not allowed" });
    }
    if (!event.postClosureLocked) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Settlement is available only after the event is closed.",
      });
    }
    if (event.settlementPaidAt) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Payment already recorded for this event." });
    }

    const calc = buildSettlementLines(event);
    if (calc.baseTotal <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "There are no accepted vendor bookings to settle.",
      });
    }

    await writeSettlement({ event, calc, session });

    await session.commitTransaction();

    await sendPostSettlementNotifications({ event, calc });

    const updated = await Event.findById(event._id).lean();
    return res.json({
      ok: true,
      settlement: calc,
      event: updated,
    });
  } catch (e) {
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch {
      // Ignore abort errors; original error is more useful.
    }

    if (isNoTransactionSupportError(e)) {
      try {
        const event = await Event.findById(req.params.id).populate("vendors.vendorId", "name email");
        if (!event || event.clientId.toString() !== req.user.id) {
          return res.status(403).json({ message: "Not allowed" });
        }
        if (!event.postClosureLocked) {
          return res.status(400).json({
            message: "Settlement is available only after the event is closed.",
          });
        }
        if (event.settlementPaidAt) {
          return res.status(400).json({ message: "Payment already recorded for this event." });
        }

        const calc = buildSettlementLines(event);
        if (calc.baseTotal <= 0) {
          return res.status(400).json({
            message: "There are no accepted vendor bookings to settle.",
          });
        }

        await writeSettlement({ event, calc });
        await sendPostSettlementNotifications({ event, calc });

        const updated = await Event.findById(event._id).lean();
        return res.json({
          ok: true,
          settlement: calc,
          event: updated,
          usedTransactionFallback: true,
        });
      } catch (fallbackError) {
        console.error(fallbackError);
        return res.status(500).json({ message: fallbackError?.message || "Settlement failed" });
      }
    }

    console.error(e);
    return res.status(500).json({ message: e?.message || "Settlement failed" });
  } finally {
    session.endSession();
  }
};
