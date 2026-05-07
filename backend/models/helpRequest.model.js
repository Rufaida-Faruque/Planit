import mongoose from "mongoose";

const helpRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["open", "answered"],
      default: "open",
      index: true,
    },
    adminReply: {
      type: String,
      default: "",
      maxlength: 5000,
    },
    answeredAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("HelpRequest", helpRequestSchema);
