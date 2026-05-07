import mongoose from "mongoose";

const ledgerEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["client_settlement", "vendor_payout", "admin_commission"],
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    /** Client who paid (client_settlement) or vendor who received (vendor_payout) */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("LedgerEntry", ledgerEntrySchema);
