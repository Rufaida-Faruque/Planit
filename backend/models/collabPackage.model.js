import mongoose from "mongoose";

const collabMemberSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    facilities: {
      type: String,
      default: "",
      trim: true,
    },
    time: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const collabPackageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    members: {
      type: [collabMemberSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 2,
        message: "Collab package must have exactly 2 members",
      },
      required: true,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "retired"],
      default: "active",
      index: true,
    },
    acceptingNewBookings: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdByVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CollabPackage", collabPackageSchema);

