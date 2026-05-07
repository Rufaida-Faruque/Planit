import express from "express";
import protect from "../middleware/protect.js";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  streamNotifications,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/stream", streamNotifications);
router.get("/", protect, getMyNotifications);
router.patch("/read-all", protect, markAllNotificationsRead);
router.patch("/:id/read", protect, markNotificationRead);

export default router;
