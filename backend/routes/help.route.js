import express from "express";
import protect from "../middleware/protect.js";
import {
  submitHelpQuestion,
  getMyHelpRequests,
  getAdminHelpRequests,
  replyHelpRequest,
} from "../controllers/help.controller.js";

const router = express.Router();

router.post("/questions", protect, submitHelpQuestion);
router.get("/my", protect, getMyHelpRequests);
router.get("/admin", protect, getAdminHelpRequests);
router.patch("/admin/:id", protect, replyHelpRequest);

export default router;
