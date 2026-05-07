import express from "express";
import protect from "../middleware/protect.js";
import {
  getClientEventInvoicePdf,
  getVendorDailyInvoicePdf,
  getAdminDailyInvoicePdf,
} from "../controllers/invoice.controller.js";

const router = express.Router();

router.get("/client/event/:eventId", protect, getClientEventInvoicePdf);
router.get("/vendor/daily", protect, getVendorDailyInvoicePdf);
router.get("/admin/daily", protect, getAdminDailyInvoicePdf);

export default router;
