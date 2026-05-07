import mongoose from "mongoose";

const attendeeSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: "",
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    qrCode: {
      type: String,
      default: "",
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

attendeeSchema.index({ eventId: 1, email: 1 }, { unique: true });

export default mongoose.model("Attendee", attendeeSchema);
