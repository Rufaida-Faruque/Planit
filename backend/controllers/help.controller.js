import HelpRequest from "../models/helpRequest.model.js";
import Notification from "../models/notification.model.js";
import notificationBus from "../utils/notificationBus.js";

const emitNotification = async ({ userId, title, message, link = "" }) => {
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

export const submitHelpQuestion = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can submit help questions" });
    }
    const message = String(req.body?.message || "").trim();
    if (message.length < 5) {
      return res.status(400).json({ message: "Please enter at least 5 characters" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ message: "Message is too long" });
    }

    const doc = await HelpRequest.create({
      user: req.user.id,
      message,
      status: "open",
    });

    return res.status(201).json(doc);
  } catch {
    return res.status(500).json({ message: "Could not submit question" });
  }
};

export const getMyHelpRequests = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can view their help history" });
    }
    const data = await HelpRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json(data);
  } catch {
    return res.status(500).json({ message: "Could not load help history" });
  }
};

export const getAdminHelpRequests = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }
    const data = await HelpRequest.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json(data);
  } catch {
    return res.status(500).json({ message: "Could not load help requests" });
  }
};

export const replyHelpRequest = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }
    const reply = String(req.body?.reply || "").trim();
    if (reply.length < 1) {
      return res.status(400).json({ message: "Reply is required" });
    }
    if (reply.length > 5000) {
      return res.status(400).json({ message: "Reply is too long" });
    }

    const doc = await HelpRequest.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Request not found" });
    }

    doc.status = "answered";
    doc.adminReply = reply;
    doc.answeredAt = new Date();
    await doc.save();

    const populated = await HelpRequest.findById(doc._id)
      .populate("user", "name email")
      .lean();

    await emitNotification({
      userId: doc.user,
      title: "Reply from Planit support",
      message:
        reply.length > 180 ? `${reply.slice(0, 177)}…` : reply,
      link: "/client",
    });

    return res.json(populated);
  } catch {
    return res.status(500).json({ message: "Could not save reply" });
  }
};
