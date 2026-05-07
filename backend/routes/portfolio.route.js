// import express from "express";
// import {
//   savePortfolio,
//   getMyPortfolio,
//   getPortfolioByVendor,
//   deletePortfolio,
//   restorePortfolio,
// } from "../controllers/portfolio.controller.js";

// import { protect } from "../middleware/auth.middleware.js";

// const router = express.Router();

// router.post("/", protect, savePortfolio);
// router.get("/me", protect, getMyPortfolio);
// router.get("/:vendorId", getPortfolioByVendor);
// router.delete("/", protect, deletePortfolio);
// router.patch("/restore", protect, restorePortfolio);
// router.get("/browse", browsePortfolios);

// export default router;










// import express from "express";
// import protect from "../middleware/protect.js";

// import {
//   savePortfolio,
//   getMyPortfolio,
//   getPortfolioByVendor,
//   deletePortfolio,
//   restorePortfolio,
//   browsePortfolios,   // ✅ ADD THIS
// } from "../controllers/portfolio.controller.js";

// const router = express.Router();

// // PUBLIC
// router.get("/browse", browsePortfolios);
// router.get("/:vendorId", getPortfolioByVendor);

// // PRIVATE (vendor)
// router.get("/me", protect, getMyPortfolio);
// router.post("/", protect, savePortfolio);
// router.delete("/", protect, deletePortfolio);
// router.patch("/restore", protect, restorePortfolio);

// export default router;








import express from "express";
import {
  savePortfolio,
  getMyPortfolio,
  getPortfolioByVendor,
  deletePortfolio,
  restorePortfolio,
  browsePortfolios, // ✅ ADD THIS
  updatePortfolioAvailability,
} from "../controllers/portfolio.controller.js";

import protect from "../middleware/protect.js";

const router = express.Router();

// ================= PRIVATE =================
router.post("/", protect, savePortfolio);
router.get("/me", protect, getMyPortfolio);
router.delete("/", protect, deletePortfolio);
router.patch("/restore", protect, restorePortfolio);
router.patch(
  "/availability",
  protect,
  updatePortfolioAvailability
);

// ================= PUBLIC =================

// ✅ BROWSE (VERY IMPORTANT)
router.get("/browse", browsePortfolios);

// View single vendor portfolio
router.get("/:vendorId", getPortfolioByVendor);

export default router;