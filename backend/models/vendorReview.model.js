import mongoose from "mongoose";

const vendorReviewSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      maxlength: 1500,
      trim: true,
    },
  },
  { timestamps: true }
);

vendorReviewSchema.index({ vendorId: 1, eventId: 1, clientId: 1 }, { unique: true });

export default mongoose.model("VendorReview", vendorReviewSchema);
