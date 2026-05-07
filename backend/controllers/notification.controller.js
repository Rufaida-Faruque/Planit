import Notification from "../models/notification.model.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";
import notificationBus from "../utils/notificationBus.js";

export const getMyNotifications = async (req, res) => {
  try {
    const data = await Notification.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    return res.json(data);
  } catch {
    return res
      .status(500)
      .json({ message: "Fetch notifications failed" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const data = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!data) {
      return res
        .status(404)
        .json({ message: "Notification not found" });
    }
    return res.json(data);
  } catch {
    return res
      .status(500)
      .json({ message: "Update notification failed" });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );
    return res.json({ message: "All notifications marked read" });
  } catch {
    return res
      .status(500)
      .json({ message: "Bulk update failed" });
  }
};

export const streamNotifications = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(401).json({ message: "Token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id?.toString();
    if (!userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const onNotification = (payload) => {
      if (payload.userId !== userId) return;
      res.write(
        `event: notification\ndata: ${JSON.stringify(payload)}\n\n`
      );
    };

    notificationBus.on("notification", onNotification);

    const heartbeat = setInterval(() => {
      res.write(`event: ping\ndata: {}\n\n`);
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      notificationBus.off("notification", onNotification);
    });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
