import mongoose from "mongoose";
import Event from "../models/event.model.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * For each YYYY-MM-DD string, how many non-rejected vendor rows exist
 * for this vendor with serviceSelection.date equal to that day.
 * Used for portfolio day-slot capacity (booked vs available).
 */
export async function getVendorDateBookingCounts(vendorId) {
  const vid =
    typeof vendorId === "string"
      ? new mongoose.Types.ObjectId(vendorId)
      : vendorId;

  const rows = await Event.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$vendors" },
    { $match: { "vendors.vendorId": vid } },
    { $match: { "vendors.requestStatus": { $ne: "rejected" } } },
    { $match: { "vendors.status": { $ne: "rejected" } } },
    {
      $match: {
        $or: [
          { "vendors.serviceSelection.category": "venue" },
          {
            "vendors.serviceSelection.hallId": {
              $exists: true,
              $nin: [null, ""],
            },
          },
        ],
      },
    },
    {
      $match: {
        "vendors.serviceSelection.date": {
          $exists: true,
          $type: "string",
          $nin: ["", null],
        },
      },
    },
    {
      $group: {
        _id: "$vendors.serviceSelection.date",
        booked: { $sum: 1 },
      },
    },
  ]);

  const out = {};
  for (const r of rows) {
    const key = String(r._id || "").trim();
    if (ISO_DATE.test(key)) out[key] = r.booked;
  }
  return out;
}

/**
 * Booked venue-day counts for all vendors: { [vendorId]: { [isoDate]: booked } }.
 * Used to enrich portfolio browse without N queries per vendor.
 */
export async function getVenueBookingCountsGroupedByVendor() {
  const rows = await Event.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$vendors" },
    { $match: { "vendors.vendorId": { $exists: true, $ne: null } } },
    { $match: { "vendors.requestStatus": { $ne: "rejected" } } },
    { $match: { "vendors.status": { $ne: "rejected" } } },
    {
      $match: {
        $or: [
          { "vendors.serviceSelection.category": "venue" },
          {
            "vendors.serviceSelection.hallId": {
              $exists: true,
              $nin: [null, ""],
            },
          },
        ],
      },
    },
    {
      $match: {
        "vendors.serviceSelection.date": {
          $exists: true,
          $type: "string",
          $nin: ["", null],
        },
      },
    },
    {
      $group: {
        _id: {
          vendorId: "$vendors.vendorId",
          date: "$vendors.serviceSelection.date",
        },
        booked: { $sum: 1 },
      },
    },
  ]);

  const out = {};
  for (const r of rows) {
    const vid = r._id?.vendorId?.toString?.();
    const date = String(r._id?.date || "").trim();
    if (!vid || !ISO_DATE.test(date)) continue;
    if (!out[vid]) out[vid] = {};
    out[vid][date] = r.booked;
  }
  return out;
}
