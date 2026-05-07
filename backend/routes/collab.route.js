import express from "express";
import protect from "../middleware/protect.js";
import {
  getCollabCandidates,
  createCollabProposal,
  getMyCollabProposals,
  respondToCollabProposal,
  confirmCollabProposal,
  getMyCollabPackages,
  retireCollabPackage,
  browseCollabPackages,
} from "../controllers/collab.controller.js";

const router = express.Router();

router.get("/browse", protect, browseCollabPackages);
router.get("/candidates", protect, getCollabCandidates);
router.get("/proposals", protect, getMyCollabProposals);
router.post("/proposals", protect, createCollabProposal);
router.post("/proposals/:id/respond", protect, respondToCollabProposal);
router.post("/proposals/:id/confirm", protect, confirmCollabProposal);
router.get("/my-packages", protect, getMyCollabPackages);
router.post("/packages/:id/retire", protect, retireCollabPackage);

export default router;

