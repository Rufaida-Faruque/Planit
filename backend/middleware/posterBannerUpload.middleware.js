import multer from "multer";
import fs from "fs";
import path from "path";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const eventId = req.params.id;
    const dir = path.join(
      process.cwd(),
      "uploads",
      "events",
      eventId,
      "poster"
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(
      null,
      `banner-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
    );
  },
});

const posterBannerUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

export default posterBannerUpload;
