import jwt from "jsonwebtoken";
import Message from "../models/message.model.js";
import Event from "../models/event.model.js";
import User from "../models/user.model.js";
import messageBus from "../utils/messageBus.js";
import { JWT_SECRET } from "../config.js";

const canAccessEventChat = (event, userId, otherUserId) => {
  const self = userId.toString();
  const other = otherUserId.toString();
  const clientId = event.clientId.toString();
  const acceptedVendors = (event.vendors || [])
    .filter((v) => v.requestStatus === "accepted")
    .map((v) => v.vendorId.toString());

  const selfIsClient = self === clientId;
  const selfIsAcceptedVendor = acceptedVendors.includes(self);
  const otherIsClient = other === clientId;
  const otherIsAcceptedVendor = acceptedVendors.includes(other);

  if (!selfIsClient && !selfIsAcceptedVendor) return false;
  if (selfIsClient) return otherIsAcceptedVendor;
  if (selfIsAcceptedVendor) return otherIsClient;
  return false;
};

export const getMyChatRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const roomMap = new Map();
    for (const item of rows) {
      const otherUserId =
        item.senderId.toString() === userId.toString()
          ? item.receiverId.toString()
          : item.senderId.toString();
      const key = `${item.eventId.toString()}::${otherUserId}`;
      if (!roomMap.has(key)) {
        roomMap.set(key, {
          eventId: item.eventId.toString(),
          otherUserId,
          lastMessage: item.text,
          lastAt: item.createdAt,
        });
      }
    }

    const rooms = Array.from(roomMap.values());
    const eventIds = [...new Set(rooms.map((r) => r.eventId))];
    const userIds = [...new Set(rooms.map((r) => r.otherUserId))];

    const events = await Event.find({ _id: { $in: eventIds } }).select("title");
    const users = await User.find({ _id: { $in: userIds } }).select("name email");
    const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const payload = rooms
      .filter((r) => eventMap.has(r.eventId) && userMap.has(r.otherUserId))
      .map((r) => ({
        ...r,
        eventTitle: eventMap.get(r.eventId).title,
        otherUser: userMap.get(r.otherUserId),
      }))
      .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

    return res.json(payload);
  } catch {
    return res.status(500).json({ message: "Fetch chat rooms failed" });
  }
};

export const getAvailableChatContacts = async (req, res) => {
  try {
    const userId = req.user.id.toString();
    const role = req.user.role;

    if (role === "client") {
      const events = await Event.find({ clientId: userId }).select("title vendors");
      const contactRows = [];
      for (const event of events) {
        for (const vendor of event.vendors || []) {
          if (vendor.requestStatus !== "accepted") continue;
          contactRows.push({
            eventId: event._id.toString(),
            eventTitle: event.title,
            otherUserId: vendor.vendorId.toString(),
          });
        }
      }
      const uniqueIds = [...new Set(contactRows.map((c) => c.otherUserId))];
      const users = await User.find({ _id: { $in: uniqueIds } }).select("name email");
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));
      const payload = contactRows
        .filter((c) => userMap.has(c.otherUserId))
        .map((c) => ({ ...c, otherUser: userMap.get(c.otherUserId) }));
      return res.json(payload);
    }

    if (role === "vendor") {
      const events = await Event.find({
        "vendors.vendorId": userId,
      }).select("title clientId vendors");
      const payload = events
        .filter((event) =>
          (event.vendors || []).some(
            (v) => v.vendorId.toString() === userId && v.requestStatus === "accepted"
          )
        )
        .map((event) => ({
          eventId: event._id.toString(),
          eventTitle: event.title,
          otherUserId: event.clientId.toString(),
        }));
      const uniqueIds = [...new Set(payload.map((c) => c.otherUserId))];
      const users = await User.find({ _id: { $in: uniqueIds } }).select("name email");
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));
      return res.json(
        payload
          .filter((c) => userMap.has(c.otherUserId))
          .map((c) => ({ ...c, otherUser: userMap.get(c.otherUserId) }))
      );
    }

    return res.json([]);
  } catch {
    return res.status(500).json({ message: "Fetch contacts failed" });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { eventId, otherUserId } = req.query;
    if (!eventId || !otherUserId) {
      return res
        .status(400)
        .json({ message: "eventId and otherUserId are required" });
    }

    const event = await Event.findById(eventId).select("clientId vendors");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!canAccessEventChat(event, req.user.id, otherUserId)) {
      return res.status(403).json({ message: "Chat access denied" });
    }

    const data = await Message.find({
      eventId,
      $or: [
        { senderId: req.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user.id },
      ],
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      {
        eventId,
        senderId: otherUserId,
        receiverId: req.user.id,
        isRead: false,
      },
      { isRead: true }
    );

    return res.json(data);
  } catch {
    return res.status(500).json({ message: "Fetch messages failed" });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const { eventId, receiverId, text } = req.body;
    if (!eventId || !receiverId || !text || !text.trim()) {
      return res.status(400).json({
        message: "eventId, receiverId and text are required",
      });
    }

    const event = await Event.findById(eventId).select("clientId vendors");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!canAccessEventChat(event, req.user.id, receiverId)) {
      return res.status(403).json({ message: "Chat access denied" });
    }

    const data = await Message.create({
      eventId,
      senderId: req.user.id,
      receiverId,
      text: text.trim(),
      isRead: false,
    });

    const payload = {
      event: "message",
      eventId: eventId.toString(),
      from: req.user.id.toString(),
      to: receiverId.toString(),
      createdAt: data.createdAt.toISOString(),
    };
    messageBus.emit("message", payload);

    return res.status(201).json(data);
  } catch {
    return res.status(500).json({ message: "Send message failed" });
  }
};

export const streamMessages = async (req, res) => {
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

    const onMessage = (payload) => {
      if (payload.to !== userId && payload.from !== userId) return;
      res.write(`event: message\ndata: ${JSON.stringify(payload)}\n\n`);
    };
    messageBus.on("message", onMessage);

    const heartbeat = setInterval(() => {
      res.write(`event: ping\ndata: {}\n\n`);
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      messageBus.off("message", onMessage);
    });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
