// import express from "express";
// import multer from "multer";

// import protect from "../middleware/protect.js";

// import {
//   requestVerification,
//   getMyVerification,
//   getAllVerifications,
//   approveVerification,
//   rejectVerification,
//   expireVerification,
// } from "../controllers/verification.controller.js";

// const router = express.Router();


// // FILE UPLOAD
// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (req, file, cb) => {
//     cb(
//       null,
//       Date.now() +
//         "-" +
//         file.originalname
//     );
//   },
// });

// const upload = multer({ storage });


// // Vendor
// router.post(
//   "/request",
//   protect,
//   upload.array("files", 5),
//   requestVerification
// );

// router.get(
//   "/me",
//   protect,
//   getMyVerification
// );


// // Admin
// router.get(
//   "/all",
//   protect,
//   getAllVerifications
// );

// router.patch(
//   "/approve/:id",
//   protect,
//   approveVerification
// );

// router.patch(
//   "/reject/:id",
//   protect,
//   rejectVerification
// );

// router.patch(
//   "/expire/:id",
//   protect,
//   expireVerification
// );

// export default router;









import express from "express";
import multer from "multer";

import protect from "../middleware/protect.js";

import {
  requestVerification,
  getMyVerification,
  getAllVerifications,
  approveVerification,
  rejectVerification,
  expireVerification,
} from "../controllers/verification.controller.js";

const router = express.Router();

// upload
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        file.originalname
    );
  },
});

const upload = multer({ storage });

// vendor
router.post(
  "/request",
  protect,
  upload.array("files", 5),
  requestVerification
);

router.get(
  "/me",
  protect,
  getMyVerification
);

// admin
router.get(
  "/all",
  protect,
  getAllVerifications
);

router.patch(
  "/approve/:id",
  protect,
  approveVerification
);

router.patch(
  "/reject/:id",
  protect,
  rejectVerification
);

router.patch(
  "/expire/:id",
  protect,
  expireVerification
);

export default router;