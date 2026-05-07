import multer from "multer";
import fs from "fs";
import path from "path";

// storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const vendorId = req.user.id;

    const dir = `uploads/${vendorId}`;

    // create folder if not exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

export default upload;