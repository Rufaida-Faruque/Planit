import mongoose from "mongoose";

/**
 * Created when a client completes settlement. Admin must release each row
 * before vendor_payout ledger + accountBalance credit apply.
 */
const pendingVendorPayoutSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Agreed hire amount (gross) */
    offerAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Net to credit after vendor commission */
    vendorReceives: {
      type: Number,
      required: true,
      min: 0,
    },
    vendorCommission: {
      type: Number,
      required: true,
      min: 0,
    },
    releasedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

pendingVendorPayoutSchema.index({ eventId: 1, vendorId: 1 }, { unique: true });

export default mongoose.model("PendingVendorPayout", pendingVendorPayoutSchema);
