import Event from "../models/event.model.js";
import User from "../models/user.model.js";
import Portfolio from "../models/portfolio.model.js";
import CollabProposal from "../models/collabProposal.model.js";
import CollabPackage from "../models/collabPackage.model.js";
import Verification from "../models/verification.model.js";
import Notification from "../models/notification.model.js";
import notificationBus from "../utils/notificationBus.js";

const VENDOR_CATEGORIES = ["photography", "catering", "decoration", "venue"];

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

const vendorRoleGuard = (req, res) => {
  if (req.user.role !== "vendor") {
    res.status(403).json({ message: "Vendors only" });
    return false;
  }
  return true;
};

const getVendorCategory = async (vendorId) => {
  const p = await Portfolio.findOne({ vendorId, isPublished: true }).select(
    "category displayName"
  );
  return p;
};

const getApprovedVendorIdSet = async () => {
  const [verificationRows, approvedUsers] = await Promise.all([
    Verification.find({ status: "approved" }).select("vendor").lean(),
    User.find({ role: "vendor", verificationStatus: "approved" }).select("_id").lean(),
  ]);

  const ids = new Set();
  for (const row of verificationRows) {
    const id = row?.vendor?.toString?.();
    if (id) ids.add(id);
  }
  for (const user of approvedUsers) {
    const id = user?._id?.toString?.();
    if (id) ids.add(id);
  }
  return ids;
};

export const getCollabCandidates = async (req, res) => {
  try {
    if (!vendorRoleGuard(req, res)) return;
    const myPortfolio = await getVendorCategory(req.user.id);
    if (!myPortfolio) {
      return res.status(400).json({ message: "Publish your portfolio first" });
    }

    const portfolios = await Portfolio.find({
      isPublished: true,
      vendorId: { $ne: req.user.id },
      category: { $in: VENDOR_CATEGORIES },
    })
      .select("vendorId displayName category location")
      .lean();

    const approvedVendorIds = await getApprovedVendorIdSet();
    const users = await User.find({
      _id: {
        $in: portfolios
          .map((p) => p.vendorId)
          .filter((id) => approvedVendorIds.has(id.toString())),
      },
      role: "vendor",
    })
      .select("name email")
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const out = portfolios
      .filter((p) => userMap.has(p.vendorId.toString()))
      .map((p) => ({
        vendorId: p.vendorId,
        category: p.category,
        displayName: p.displayName,
        location: p.location,
        user: userMap.get(p.vendorId.toString()),
      }));

    return res.json({
      myCategory: myPortfolio.category,
      candidates: out,
    });
  } catch {
    return res.status(500).json({ message: "Could not load candidates" });
  }
};

export const createCollabProposal = async (req, res) => {
  try {
    if (!vendorRoleGuard(req, res)) return;
    const myPortfolio = await getVendorCategory(req.user.id);
    if (!myPortfolio) {
      return res.status(400).json({ message: "Publish your portfolio first" });
    }

    const {
      partnerVendorId,
      title = "",
      myAmount = 0,
      myFacilities = "",
      myTime = "",
    } = req.body;

    if (!partnerVendorId) {
      return res.status(400).json({ message: "partnerVendorId is required" });
    }
    if (partnerVendorId.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: "You cannot propose to yourself" });
    }
    if (Number(myAmount || 0) <= 0) {
      return res.status(400).json({ message: "Your offer amount must be > 0" });
    }

    const partnerPortfolio = await getVendorCategory(partnerVendorId);
    if (!partnerPortfolio) {
      return res.status(400).json({ message: "Partner must have a published portfolio" });
    }
    const approvedVendorIds = await getApprovedVendorIdSet();
    if (!approvedVendorIds.has(String(partnerVendorId))) {
      return res.status(400).json({ message: "Partner vendor must be verified" });
    }

    const doc = await CollabProposal.create({
      proposerVendorId: req.user.id,
      partnerVendorId,
      proposerCategory: myPortfolio.category,
      partnerCategory: partnerPortfolio.category,
      title: String(title || "").trim().slice(0, 140),
      proposerOffer: {
        amount: Number(myAmount || 0),
        facilities: String(myFacilities || "").trim().slice(0, 1200),
        time: String(myTime || "").trim().slice(0, 280),
      },
      partnerOffer: {
        amount: 0,
        facilities: "",
        time: "",
      },
      status: "pending_partner",
    });

    await notifyUser({
      userId: partnerVendorId,
      title: "New collab proposal",
      message: `You received a collab proposal from ${myPortfolio.displayName || "a vendor"}.`,
      link: "/vendor",
    });

    return res.status(201).json(doc);
  } catch {
    return res.status(500).json({ message: "Could not create collab proposal" });
  }
};

export const getMyCollabProposals = async (req, res) => {
  try {
    if (!vendorRoleGuard(req, res)) return;
    const incoming = await CollabProposal.find({
      partnerVendorId: req.user.id,
    })
      .sort({ updatedAt: -1 })
      .populate("proposerVendorId", "name email")
      .populate("partnerVendorId", "name email")
      .lean();
    const outgoing = await CollabProposal.find({
      proposerVendorId: req.user.id,
    })
      .sort({ updatedAt: -1 })
      .populate("proposerVendorId", "name email")
      .populate("partnerVendorId", "name email")
      .lean();
    return res.json({ incoming, outgoing });
  } catch {
    return res.status(500).json({ message: "Could not load collab proposals" });
  }
};

export const respondToCollabProposal = async (req, res) => {
  try {
    if (!vendorRoleGuard(req, res)) return;
    const { action, myAmount = 0, myFacilities = "", myTime = "" } = req.body;
    const proposal = await CollabProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    if (proposal.partnerVendorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (proposal.status !== "pending_partner") {
      return res.status(400).json({ message: "Proposal is not awaiting partner response" });
    }

    if (action === "reject") {
      proposal.status = "rejected_by_partner";
      await proposal.save();
      await notifyUser({
        userId: proposal.proposerVendorId,
        title: "Collab rejected",
        message: "Your collab proposal was rejected by the partner vendor.",
        link: "/vendor",
      });
      return res.json(proposal);
    }

    if (Number(myAmount || 0) <= 0) {
      return res.status(400).json({ message: "Your offer amount must be > 0" });
    }
    proposal.partnerOffer = {
      amount: Number(myAmount || 0),
      facilities: String(myFacilities || "").trim().slice(0, 1200),
      time: String(myTime || "").trim().slice(0, 280),
    };
    proposal.status = "pending_proposer_confirm";
    await proposal.save();

    await notifyUser({
      userId: proposal.proposerVendorId,
      title: "Collab offer received",
      message: "Partner vendor responded. Confirm to create package.",
      link: "/vendor",
    });
    return res.json(proposal);
  } catch {
    return res.status(500).json({ message: "Could not respond to proposal" });
  }
};

export const confirmCollabProposal = async (req, res) => {
  try {
    if (!vendorRoleGuard(req, res)) return;
    const { action, finalTitle = "", description = "" } = req.body;
    const proposal = await CollabProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    if (proposal.proposerVendorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (proposal.status !== "pending_proposer_confirm") {
      return res.status(400).json({ message: "Proposal is not awaiting your confirmation" });
    }

    if (action === "reject") {
      proposal.status = "rejected_by_proposer";
      await proposal.save();
      await notifyUser({
        userId: proposal.partnerVendorId,
        title: "Collab cancelled",
        message: "The proposer cancelled the collab proposal.",
        link: "/vendor",
      });
      return res.json(proposal);
    }

    const total =
      Number(proposal.proposerOffer?.amount || 0) +
      Number(proposal.partnerOffer?.amount || 0);
    if (total <= 0) {
      return res.status(400).json({ message: "Invalid combined package amount" });
    }

    const pkg = await CollabPackage.create({
      title:
        String(finalTitle || "").trim() ||
        String(proposal.title || "").trim() ||
        `${proposal.proposerCategory} + ${proposal.partnerCategory} collab`,
      description: String(description || "").trim().slice(0, 1600),
      members: [
        {
          vendorId: proposal.proposerVendorId,
          category: proposal.proposerCategory,
          grossAmount: Number(proposal.proposerOffer?.amount || 0),
          facilities: proposal.proposerOffer?.facilities || "",
          time: proposal.proposerOffer?.time || "",
        },
        {
          vendorId: proposal.partnerVendorId,
          category: proposal.partnerCategory,
          grossAmount: Number(proposal.partnerOffer?.amount || 0),
          facilities: proposal.partnerOffer?.facilities || "",
          time: proposal.partnerOffer?.time || "",
        },
      ],
      finalPrice: total,
      status: "active",
      acceptingNewBookings: true,
      createdByVendorId: req.user.id,
      usageCount: 0,
    });

    proposal.status = "confirmed";
    proposal.collabPackageId = pkg._id;
    await proposal.save();

    await notifyUser({
      userId: proposal.partnerVendorId,
      title: "Collab package created",
      message: `A new collab package "${pkg.title}" is now live.`,
      link: "/vendor",
    });

    return res.json(pkg);
  } catch {
    return res.status(500).json({ message: "Could not confirm proposal" });
  }
};

export const getMyCollabPackages = async (req, res) => {
  try {
    if (!vendorRoleGuard(req, res)) return;
    const docs = await CollabPackage.find({
      "members.vendorId": req.user.id,
    })
      .sort({ updatedAt: -1 })
      .populate("members.vendorId", "name email")
      .lean();
    return res.json(docs);
  } catch {
    return res.status(500).json({ message: "Could not load collab packages" });
  }
};

export const retireCollabPackage = async (req, res) => {
  try {
    if (!vendorRoleGuard(req, res)) return;
    const doc = await CollabPackage.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Package not found" });
    }
    const member = (doc.members || []).some(
      (m) => m.vendorId.toString() === req.user.id.toString()
    );
    if (!member) {
      return res.status(403).json({ message: "Only package members can retire it" });
    }
    doc.acceptingNewBookings = false;
    doc.status = "retired";
    await doc.save();
    return res.json(doc);
  } catch {
    return res.status(500).json({ message: "Could not retire package" });
  }
};

export const browseCollabPackages = async (req, res) => {
  try {
    const docs = await CollabPackage.find({
      status: "active",
      acceptingNewBookings: true,
    })
      .sort({ updatedAt: -1 })
      .populate("members.vendorId", "name")
      .lean();

    const payload = docs.map((d) => ({
      _id: d._id,
      title: d.title,
      description: d.description,
      finalPrice: d.finalPrice,
      usageCount: d.usageCount || 0,
      members: (d.members || []).map((m) => ({
        vendorId: m.vendorId?._id || m.vendorId,
        vendorName: m.vendorId?.name || "Vendor",
        category: m.category,
        facilities: m.facilities,
        time: m.time,
      })),
    }));
    return res.json(payload);
  } catch {
    return res.status(500).json({ message: "Could not browse collab packages" });
  }
};

export const selectCollabPackageForEvent = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Clients only" });
    }
    const event = await Event.findById(req.params.id);
    if (!event || event.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (event.postClosureLocked) {
      return res.status(403).json({
        message: "This event is closed. Editing vendors is disabled.",
      });
    }

    const pkg = await CollabPackage.findById(req.params.packageId).lean();
    if (!pkg) {
      return res.status(404).json({ message: "Collab package not found" });
    }
    if (!pkg.acceptingNewBookings || pkg.status !== "active") {
      return res.status(400).json({ message: "This collab package is not open for new bookings" });
    }
    if (!Array.isArray(pkg.members) || pkg.members.length !== 2) {
      return res.status(400).json({ message: "Invalid collab package members" });
    }

    const alreadyHasPkg = (event.vendors || []).some(
      (v) => String(v.serviceSelection?.collabPackageId || "") === String(pkg._id)
    );

    for (const member of pkg.members) {
      const idx = event.vendors.findIndex(
        (v) => v.vendorId.toString() === member.vendorId.toString()
      );
      const payload = {
        vendorId: member.vendorId,
        category: member.category,
        collabPackageId: pkg._id,
        status: "accepted",
        requestStatus: "accepted",
        offerAmount: Number(member.grossAmount || 0),
        offerPackage: `Collab package: ${pkg.title}`,
        serviceSelection: {
          type: "collab",
          collabPackageId: pkg._id,
          collabTitle: pkg.title,
          bundleFinalPrice: pkg.finalPrice,
          hiddenSplitFromClient: true,
        },
        selectedAt: new Date(),
        completedAt: null,
        checklist: [],
      };
      if (idx >= 0) {
        event.vendors[idx] = { ...event.vendors[idx].toObject(), ...payload };
      } else {
        event.vendors.push(payload);
      }
      await notifyUser({
        userId: member.vendorId,
        title: "Collab package selected",
        message: `Client selected collab package "${pkg.title}" for event "${event.title}".`,
        link: `/vendor/events/${event._id}`,
      });
    }

    event.timeline.push({
      type: "collab_package_selected",
      text: `Client selected collab package: ${pkg.title}`,
      by: req.user.id,
      createdAt: new Date(),
    });
    await event.save();

    if (!alreadyHasPkg) {
      await CollabPackage.findByIdAndUpdate(pkg._id, { $inc: { usageCount: 1 } });
    }

    const updated = await Event.findById(event._id).populate("vendors.vendorId", "name email");
    return res.json(updated);
  } catch {
    return res.status(500).json({ message: "Could not select collab package" });
  }
};

