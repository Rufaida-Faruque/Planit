import express from "express";
import { toggleStarVendor, getStarredVendors } from "../controllers/user.controller.js";
import protect from "../middleware/protect.js";

const router = express.Router();

router.patch("/star/:vendorId", protect, toggleStarVendor);
router.get("/starred", protect, getStarredVendors);

export default router;