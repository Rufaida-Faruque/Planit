import express from "express";
import protect from "../middleware/protect.js";
import {
  getMyChatRooms,
  getAvailableChatContacts,
  getChatMessages,
  sendChatMessage,
  streamMessages,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/stream", streamMessages);
router.get("/contacts", protect, getAvailableChatContacts);
router.get("/rooms", protect, getMyChatRooms);
router.get("/", protect, getChatMessages);
router.post("/", protect, sendChatMessage);

export default router;
