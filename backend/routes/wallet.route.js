import express from "express";
import protect from "../middleware/protect.js";
import {
  getAdminWallet,
  getVendorWallet,
  releaseVendorPayout,
  releaseAllVendorPayoutsForEvent,
} from "../controllers/wallet.controller.js";

const router = express.Router();

router.get("/admin/balance", protect, getAdminWallet);
router.post("/admin/release-vendor-payout/:id", protect, releaseVendorPayout);
router.post(
  "/admin/release-all-for-event/:eventId",
  protect,
  releaseAllVendorPayoutsForEvent
);
router.get("/vendor/balance", protect, getVendorWallet);

export default router;
