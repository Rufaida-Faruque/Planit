// // import Verification from "../models/verification.model.js";


// // // AUTO EXPIRE
// // const autoExpire = async () => {
// //   await Verification.updateMany(
// //     {
// //       status: "approved",
// //       expiresAt: { $lt: new Date() },
// //     },
// //     {
// //       status: "expired",
// //     }
// //   );
// // };



// // // ============================
// // // VENDOR SUBMIT
// // // ============================
// // export const requestVerification = async (req, res) => {
// //   try {
// //     const vendorId = req.user.id;

// //     const existing = await Verification.findOne({
// //       vendor: vendorId,
// //     });

// //     if (
// //       existing &&
// //       (existing.status === "pending" ||
// //         existing.status === "approved")
// //     ) {
// //       return res.status(400).json({
// //         message:
// //           "Already have active request.",
// //       });
// //     }

// //     const files = req.files
// //       ? req.files.map((file) => file.path)
// //       : [];

// //     const payload = {
// //       vendor: vendorId,
// //       businessName: req.body.businessName,
// //       ownerName: req.body.ownerName,
// //       phone: req.body.phone,
// //       nid: req.body.nid,
// //       tradeLicense: req.body.tradeLicense,
// //       category: req.body.category
// //         ? JSON.parse(req.body.category)
// //         : [],
// //       description: req.body.description,
// //       files,
// //       status: "pending",
// //       adminComment: "",
// //       expiresAt: null,
// //     };

// //     const data = await Verification.findOneAndUpdate(
// //       { vendor: vendorId },
// //       payload,
// //       {
// //         upsert: true,
// //         returnDocument: "after",
// //       }
// //     );

// //     res.json(data);
// //   } catch (error) {
// //     res.status(500).json({
// //       message: "Submit failed",
// //     });
// //   }
// // };



// // // ============================
// // // VENDOR GET STATUS
// // // ============================
// // export const getMyVerification = async (
// //   req,
// //   res
// // ) => {
// //   try {
// //     await autoExpire();

// //     const data = await Verification.findOne({
// //       vendor: req.user.id,
// //     });

// //     res.json(data || null);
// //   } catch (error) {
// //     res.status(500).json({
// //       message: "Failed",
// //     });
// //   }
// // };



// // // ============================
// // // ADMIN GET ALL
// // // ============================
// // export const getAllVerifications = async (req, res) => {
// //   try {
// //     await autoExpire();

// //     const data = await Verification.find({
// //       status: "pending",   // ✅ ONLY PENDING
// //     })
// //       .populate("vendor", "name email")
// //       .sort({ createdAt: -1 });

// //     res.json(data);
// //   } catch (error) {
// //     res.status(500).json({
// //       message: "Failed",
// //     });
// //   }
// // };



// // // ============================
// // // ADMIN APPROVE
// // // ============================
// // export const approveVerification = async (
// //   req,
// //   res
// // ) => {
// //   try {
// //     const data =
// //       await Verification.findByIdAndUpdate(
// //         req.params.id,
// //         {
// //           status: "approved",
// //           adminComment: "",
// //           expiresAt: new Date(
// //             Date.now() + 60 * 60 * 1000
// //           ),
// //         },
// //         {
// //           returnDocument: "after",
// //         }
// //       );

// //     res.json(data);
// //   } catch (error) {
// //     res.status(500).json({
// //       message: "Approve failed",
// //     });
// //   }
// // };



// // // ============================
// // // ADMIN REJECT
// // // ============================
// // export const rejectVerification = async (
// //   req,
// //   res
// // ) => {
// //   try {
// //     const data =
// //       await Verification.findByIdAndUpdate(
// //         req.params.id,
// //         {
// //           status: "rejected",
// //           adminComment:
// //             req.body.comment || "",
// //           expiresAt: null,
// //         },
// //         {
// //           returnDocument: "after",
// //         }
// //       );

// //     res.json(data);
// //   } catch (error) {
// //     res.status(500).json({
// //       message: "Reject failed",
// //     });
// //   }
// // };



// // // ============================
// // // MANUAL EXPIRE
// // // ============================
// // export const expireVerification = async (
// //   req,
// //   res
// // ) => {
// //   try {
// //     const data =
// //       await Verification.findByIdAndUpdate(
// //         req.params.id,
// //         {
// //           status: "expired",
// //         },
// //         {
// //           returnDocument: "after",
// //         }
// //       );

// //     res.json(data);
// //   } catch (error) {
// //     res.status(500).json({
// //       message: "Expire failed",
// //     });
// //   }
// // };








// import Verification from "../models/verification.model.js";

// export const requestVerification = async (req, res) => {
//   try {
//     const vendorId = req.user.id;

//     const {
//       businessName,
//       ownerName,
//       phone,
//       nid,
//       tradeLicense,
//       category,
//       address,
//       details,
//     } = req.body;

//     const files =
//       req.files?.map(
//         (file) => "/uploads/" + file.filename
//       ) || [];

//     const data =
//       await Verification.findOneAndUpdate(
//         { vendor: vendorId },
//         {
//           vendor: vendorId,
//           businessName,
//           ownerName,
//           phone,
//           nid,
//           tradeLicense,
//           category,
//           address,
//           details,
//           files,
//           status: "pending",
//           adminComment: "",
//           expiresAt: null,
//         },
//         {
//           upsert: true,
//           new: true,
//         }
//       );

//     res.json(data);
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       message: "Verification failed",
//     });
//   }
// };










import Verification from "../models/verification.model.js";

// auto expire approved accounts
const autoExpire = async () => {
  await Verification.updateMany(
    {
      status: "approved",
      expiresAt: { $lt: new Date() },
    },
    {
      status: "expired",
    }
  );
};

// =========================
// REQUEST
// =========================
export const requestVerification = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const existing = await Verification.findOne({
      vendor: vendorId,
    });

    if (
      existing &&
      (existing.status === "pending" ||
        existing.status === "approved")
    ) {
      return res.status(400).json({
        message:
          "You already have an active verification.",
      });
    }

    const files = req.files
      ? req.files.map(
          (file) => "/uploads/" + file.filename
        )
      : [];

    const data =
      await Verification.findOneAndUpdate(
        { vendor: vendorId },
        {
          vendor: vendorId,
          businessName: req.body.businessName,
          ownerName: req.body.ownerName,
          phone: req.body.phone,
          nid: req.body.nid,
          tradeLicense: req.body.tradeLicense,
          category: req.body.category,
          address: req.body.address,
          description:
            req.body.description,
          files,
          status: "pending",
          adminComment: "",
          expiresAt: null,
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );

    res.json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Verification failed",
    });
  }
};

// =========================
// MY STATUS
// =========================
export const getMyVerification = async (
  req,
  res
) => {
  try {
    await autoExpire();

    const data = await Verification.findOne({
      vendor: req.user.id,
    });

    res.json(data || null);
  } catch (error) {
    res.status(500).json({
      message: "Failed",
    });
  }
};

// =========================
// ADMIN ALL PENDING
// =========================
export const getAllVerifications = async (
  req,
  res
) => {
  try {
    await autoExpire();

    const data = await Verification.find({
      status: "pending",
    })
      .populate("vendor", "name email")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed",
    });
  }
};

// =========================
// APPROVE
// =========================
export const approveVerification =
  async (req, res) => {
    try {
      const data =
        await Verification.findByIdAndUpdate(
          req.params.id,
          {
            status: "approved",
            adminComment: "",
            expiresAt: new Date(
              Date.now() +
                24 *
                  60 *
                  60 *
                  1000
            ),
          },
          {
            returnDocument:
              "after",
          }
        );

      res.json(data);
    } catch (error) {
      res.status(500).json({
        message:
          "Approve failed",
      });
    }
  };

// =========================
// REJECT
// =========================
export const rejectVerification =
  async (req, res) => {
    try {
      const data =
        await Verification.findByIdAndUpdate(
          req.params.id,
          {
            status: "rejected",
            adminComment:
              req.body.comment ||
              "",
            expiresAt: null,
          },
          {
            returnDocument:
              "after",
          }
        );

      res.json(data);
    } catch (error) {
      res.status(500).json({
        message:
          "Reject failed",
      });
    }
  };

// =========================
// MANUAL EXPIRE
// =========================
export const expireVerification =
  async (req, res) => {
    try {
      const data =
        await Verification.findByIdAndUpdate(
          req.params.id,
          {
            status: "expired",
            expiresAt: null,
          },
          {
            returnDocument:
              "after",
          }
        );

      res.json(data);
    } catch (error) {
      res.status(500).json({
        message:
          "Expire failed",
      });
    }
  };