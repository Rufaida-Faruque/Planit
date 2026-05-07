import express from "express";
import protect from "../middleware/protect.js";
import posterBannerUpload from "../middleware/posterBannerUpload.middleware.js";
import {
  createEvent,
  getMyEvents,
  getAdminDashboardData,
  getEventById,
  updateEventInfo,
  uploadPosterBanner,
  addVendorToEvent,
  addEventNote,
  getEventAttendees,
  checkInAttendee,
  sendEventQrReminders,
  sendVendorRequest,
  getVendorEvents,
  getVendorEventById,
  vendorRespondToRequest,
  upsertVendorChecklistItem,
  requestVendorRemoval,
  getVendorRemovalRequests,
  reviewVendorRemovalRequest,
  sendPrivateInvitations,
  requestEventDeletion,
  getEventDeletionRequests,
  reviewEventDeletionRequest,
  requestEventClosure,
  getEventClosureRequests,
  reviewEventClosureRequest,
} from "../controllers/event.controller.js";
import {
  startPhotoShare,
  resendPhotoShareEmails,
  downloadGuestPhotoZip,
  emailGuestPhotoZip,
} from "../controllers/photoShare.controller.js";
import { submitVendorReview } from "../controllers/vendorReview.controller.js";
import {
  getEventSettlement,
  payEventSettlement,
} from "../controllers/settlement.controller.js";
import { getEventStallBookings } from "../controllers/stallBooking.controller.js";
import { selectCollabPackageForEvent } from "../controllers/collab.controller.js";

const router = express.Router();

router.post("/", protect, createEvent);
router.get("/", protect, getMyEvents);
router.get("/admin/dashboard", protect, getAdminDashboardData);
router.get("/admin/removal-requests", protect, getVendorRemovalRequests);
router.get(
  "/admin/event-deletion-requests",
  protect,
  getEventDeletionRequests
);
router.get("/admin/closure-requests", protect, getEventClosureRequests);
router.patch(
  "/admin/removal-requests/:requestId/review",
  protect,
  reviewVendorRemovalRequest
);
router.patch(
  "/admin/event-deletion-requests/:requestId/review",
  protect,
  reviewEventDeletionRequest
);
router.patch(
  "/admin/closure-requests/:requestId/review",
  protect,
  reviewEventClosureRequest
);
router.get("/vendor/my-events", protect, getVendorEvents);
router.get("/vendor/:id", protect, getVendorEventById);
router.patch("/vendor/:id/respond", protect, vendorRespondToRequest);
router.patch("/vendor/:id/checklist", protect, upsertVendorChecklistItem);
router.post(
  "/:id/poster/banner",
  protect,
  (req, res, next) => {
    posterBannerUpload.single("banner")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err.message || "Upload rejected",
        });
      }
      next();
    });
  },
  uploadPosterBanner
);
router.post("/:id/photo-share/start", protect, startPhotoShare);
router.post("/:id/photo-share/resend-emails", protect, resendPhotoShareEmails);
router.get("/:id/photo-share/zip", protect, downloadGuestPhotoZip);
router.post("/:id/photo-share/email-zip", protect, emailGuestPhotoZip);
router.post("/:id/closure-request", protect, requestEventClosure);
router.post("/:id/vendor-reviews", protect, submitVendorReview);
router.get("/:id/settlement", protect, getEventSettlement);
router.post("/:id/settlement/pay", protect, payEventSettlement);
router.post("/:id/collabs/:packageId/select", protect, selectCollabPackageForEvent);
router.get("/:id/stall-bookings", protect, getEventStallBookings);
router.get("/:id", protect, getEventById);
router.patch("/:id", protect, updateEventInfo);
router.post("/:id/vendors", protect, addVendorToEvent);
router.post("/:id/vendors/request", protect, sendVendorRequest);
router.post("/:id/vendors/:vendorId/remove-request", protect, requestVendorRemoval);
router.post("/:id/notes", protect, addEventNote);
router.get("/:id/attendees", protect, getEventAttendees);
router.post("/:id/attendees/check-in", protect, checkInAttendee);
router.post("/:id/attendees/send-reminders", protect, sendEventQrReminders);
router.post("/:id/invitations/send", protect, sendPrivateInvitations);
router.post("/:id/delete-request", protect, requestEventDeletion);

export default router;
