// // // import mongoose from "mongoose";

// // // const verificationSchema = new mongoose.Schema(
// // //   {
// // //     vendor: {
// // //       type: mongoose.Schema.Types.ObjectId,
// // //       ref: "User",
// // //       required: true,
// // //       unique: true,
// // //     },

// // //     businessName: String,
// // //     ownerName: String,
// // //     phone: String,
// // //     nid: String,
// // //     tradeLicense: String,
// // //     category: [String],
// // //     description: String,

// // //     files: [String],

// // //     status: {
// // //       type: String,
// // //       enum: ["pending", "approved", "rejected", "expired"],
// // //       default: "pending",
// // //     },

// // //     adminComment: {
// // //       type: String,
// // //       default: "",
// // //     },

// // //     expiresAt: Date,
// // //   },
// // //   { timestamps: true }
// // // );

// // // export default mongoose.model(
// // //   "Verification",
// // //   verificationSchema
// // // );


// // import mongoose from "mongoose";

// // const verificationSchema = new mongoose.Schema(
// //   {
// //     vendor: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "User",
// //       unique: true,
// //     },

// //     businessName: String,
// //     ownerName: String,
// //     phone: String,
// //     nid: String,
// //     tradeLicense: String,

// //     category: {
// //       type: String,
// //       enum: ["photography", "catering", "decoration", "venue"],
// //     },

// //     description: String,
// //     files: [String],

// //     status: {
// //       type: String,
// //       enum: ["pending", "approved", "rejected", "expired"],
// //       default: "pending",
// //     },

// //     adminComment: String,
// //     expiresAt: Date,
// //   },
// //   { timestamps: true }
// // );

// // export default mongoose.model(
// //   "Verification",
// //   verificationSchema
// // );
// import mongoose from "mongoose";

// const verificationSchema = new mongoose.Schema(
//   {
//     vendor: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       unique: true,
//       required: true,
//     },

//     businessName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     ownerName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     phone: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     nid: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     tradeLicense: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     category: {
//       type: String,
//       enum: ["photography", "catering", "decoration", "venue"],
//       required: true,
//     },

//     description: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     files: {
//       type: [String],
//       default: [],
//     },

//     status: {
//       type: String,
//       enum: ["pending", "approved", "rejected", "expired"],
//       default: "pending",
//     },

//     adminComment: {
//       type: String,
//       default: "",
//     },

//     // ✅ 1 DAY verification expiry
//     expiresAt: {
//       type: Date,
//       default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
//     },
//   },
//   { timestamps: true }
// );

// // Auto remove expired docs (optional cleanup after DB checks)
// verificationSchema.index(
//   { expiresAt: 1 },
//   { expireAfterSeconds: 0 }
// );

// // ================= VIRTUAL: TIME LEFT =================
// verificationSchema.virtual("timeRemaining").get(function () {
//   if (!this.expiresAt) return null;

//   const diff = this.expiresAt.getTime() - Date.now();

//   if (diff <= 0) return "Expired";

//   const hours = Math.floor(diff / (1000 * 60 * 60));
//   const mins = Math.floor(
//     (diff % (1000 * 60 * 60)) / (1000 * 60)
//   );

//   return `${hours}h ${mins}m remaining`;
// });

// // Include virtuals in JSON response
// verificationSchema.set("toJSON", { virtuals: true });
// verificationSchema.set("toObject", { virtuals: true });

// export default mongoose.model(
//   "Verification",
//   verificationSchema
// );







import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    nid: {
      type: String,
      required: true,
      trim: true,
    },

    tradeLicense: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["photography", "catering", "decoration", "venue"],
      required: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    files: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },

    adminComment: {
      type: String,
      default: "",
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// time left virtual
verificationSchema.virtual("timeRemaining").get(function () {
  if (!this.expiresAt) return null;

  const diff = this.expiresAt.getTime() - Date.now();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor(
    (diff % (1000 * 60 * 60)) / (1000 * 60)
  );

  return `${hours}h ${mins}m remaining`;
});

verificationSchema.set("toJSON", { virtuals: true });
verificationSchema.set("toObject", { virtuals: true });

export default mongoose.model(
  "Verification",
  verificationSchema
);