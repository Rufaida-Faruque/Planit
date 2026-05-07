import mongoose from "mongoose";
import Event from "../models/event.model.js";
import VendorReview from "../models/vendorReview.model.js";

const vendorEligibleForReview = (v) => {
  if (!v) return false;
  if (v.requestStatus === "accepted") return true;
  return ["accepted", "working", "completed"].includes(v.status);
};

export const submitVendorReview = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Clients only" });
    }
    const event = await Event.findById(req.params.id);
    if (!event || event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (!event.postClosureLocked) {
      return res.status(400).json({
        message: "You can review vendors only after the event is closed by admin.",
      });
    }

    const { vendorId, rating, comment = "" } = req.body;
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ message: "Valid vendorId is required" });
    }
    const r = Number(rating);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "Rating must be 1–5" });
    }

    const entry = event.vendors.find(
      (item) => item.vendorId.toString() === vendorId
    );
    if (!entry || !vendorEligibleForReview(entry)) {
      return res.status(400).json({
        message: "You can only review vendors you worked with on this event.",
      });
    }

    const doc = await VendorReview.findOneAndUpdate(
      { eventId: event._id, vendorId, clientId: req.user.id },
      {
        $set: {
          rating: Math.round(r),
          comment: String(comment || "").trim().slice(0, 1500),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json(doc);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ message: "Could not save review" });
    }
    return res.status(500).json({ message: "Could not save review" });
  }
};
