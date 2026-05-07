import mongoose from "mongoose";

const collabProposalSchema = new mongoose.Schema(
  {
    proposerVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    partnerVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    proposerCategory: {
      type: String,
      required: true,
    },
    partnerCategory: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    proposerOffer: {
      amount: { type: Number, required: true, min: 0 },
      facilities: { type: String, default: "", trim: true },
      time: { type: String, default: "", trim: true },
    },
    partnerOffer: {
      amount: { type: Number, default: 0, min: 0 },
      facilities: { type: String, default: "", trim: true },
      time: { type: String, default: "", trim: true },
    },
    status: {
      type: String,
      enum: [
        "pending_partner",
        "pending_proposer_confirm",
        "rejected_by_partner",
        "rejected_by_proposer",
        "confirmed",
      ],
      default: "pending_partner",
      index: true,
    },
    collabPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollabPackage",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("CollabProposal", collabProposalSchema);

