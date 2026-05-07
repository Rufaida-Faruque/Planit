import express from "express";
import upload from "../middleware/upload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, upload.single("image"), (req, res) => {
  const filePath = `/${req.file.path.replace(/\\/g, "/")}`;

  res.json({
    url: filePath,
  });
});

export default router;