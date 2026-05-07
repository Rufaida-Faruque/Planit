import mongoose from "mongoose";

const stallBookingSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    stallNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    /** What the stall will sell / offer */
    sellingDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    otp: {
      type: String,
      default: "",
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    bookedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

stallBookingSchema.index(
  { eventId: 1, stallNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { verified: true },
  }
);

stallBookingSchema.index(
  { eventId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { verified: true },
  }
);

export default mongoose.model("StallBooking", stallBookingSchema);
