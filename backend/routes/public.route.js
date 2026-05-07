import express from "express";
import {
  getPublicEvent,
  sendPublicSignupOtp,
  verifyPublicSignupOtp,
} from "../controllers/publicEvent.controller.js";
import {
  getPublicStallsInfo,
  sendStallBookingOtp,
  verifyStallBookingOtp,
} from "../controllers/stallBooking.controller.js";
import {
  getGuestPhotoShareInfo,
  uploadGuestPhoto,
} from "../controllers/photoShare.controller.js";
import guestPhotoUpload from "../middleware/guestPhotoUpload.middleware.js";

const router = express.Router();

router.get("/:eventId/photo-share/:token", getGuestPhotoShareInfo);

router.get("/:eventId/stalls/info", getPublicStallsInfo);
router.post("/:eventId/stalls/send-otp", sendStallBookingOtp);
router.post("/:eventId/stalls/verify", verifyStallBookingOtp);

router.post(
  "/:eventId/photo-share/:token/upload",
  (req, res, next) => {
    guestPhotoUpload.single("photo")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Upload error" });
      }
      next();
    });
  },
  uploadGuestPhoto
);

router.get("/:eventId", getPublicEvent);
router.post("/:eventId/signup/send-otp", sendPublicSignupOtp);
router.post("/:eventId/signup/verify", verifyPublicSignupOtp);

export default router;
