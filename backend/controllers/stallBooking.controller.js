import mongoose from "mongoose";
import Event from "../models/event.model.js";
import StallBooking from "../models/stallBooking.model.js";
import { sendOtpEmail } from "../utils/mailer.js";
import { publicEventQuery } from "../utils/publicEventQuery.js";

const isNoTransactionSupportError = (e) =>
  String(e?.message || "").toLowerCase().includes("transaction numbers are only allowed");

export const getPublicStallsInfo = async (req, res) => {
  try {
    const event = await Event.findOne(publicEventQuery(req.params.eventId)).select(
      "title stallsEnabled stallCount stallLayoutImage stallBookingOpen isPublic"
    );
    if (!event || !event.isPublic) {
      return res.status(404).json({ message: "Public event not found" });
    }
    if (!event.stallsEnabled || event.stallCount <= 0) {
      return res.status(400).json({
        message: "Stall booking is not enabled for this event.",
      });
    }

    const bookings = await StallBooking.find({
      eventId: event._id,
      verified: true,
    })
      .select("stallNumber name sellingDescription")
      .lean();

    const stalls = [];
    for (let i = 1; i <= event.stallCount; i++) {
      const b = bookings.find((x) => x.stallNumber === i);
      stalls.push({
        number: i,
        booked: Boolean(b),
        bookerName: b?.name || "",
        sellingDescription: b?.sellingDescription || "",
      });
    }

    return res.json({
      title: event.title,
      stallCount: event.stallCount,
      stallLayoutImage: event.stallLayoutImage || "",
      stallBookingOpen: event.stallBookingOpen !== false,
      stalls,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Could not load stall info" });
  }
};

export const sendStallBookingOtp = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const {
      name,
      email,
      phone = "",
      stallNumber: stallRaw,
      sellingDescription = "",
    } = req.body;

    const stallNumber = Number(stallRaw);
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }
    if (!sellingDescription || !String(sellingDescription).trim()) {
      return res
        .status(400)
        .json({ message: "Please describe what you will sell or offer at your stall" });
    }
    if (!Number.isFinite(stallNumber) || stallNumber < 1) {
      return res.status(400).json({ message: "Choose a valid stall number" });
    }

    const event = await Event.findOne(publicEventQuery(eventId)).select(
      "title stallsEnabled stallCount stallBookingOpen _id"
    );
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (!event.stallsEnabled || event.stallCount <= 0) {
      return res.status(400).json({ message: "Stall booking is not available" });
    }
    if (stallNumber > event.stallCount) {
      return res.status(400).json({
        message: `Stall numbers are only from 1 to ${event.stallCount}`,
      });
    }
    if (event.stallBookingOpen === false) {
      return res.status(400).json({ message: "Stall booking is closed" });
    }

    const taken = await StallBooking.findOne({
      eventId: event._id,
      stallNumber,
      verified: true,
    });
    if (taken) {
      return res.status(400).json({ message: "This stall is already booked" });
    }

    const emailLower = email.toLowerCase();
    const existingVerified = await StallBooking.findOne({
      eventId: event._id,
      email: emailLower,
      verified: true,
    });
    if (existingVerified) {
      return res.status(400).json({
        message: "You already have a confirmed stall booking for this event",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await StallBooking.findOneAndUpdate(
      { eventId: event._id, email: emailLower },
      {
        eventId: event._id,
        name: String(name).trim(),
        email: emailLower,
        phone: String(phone || "").trim(),
        stallNumber,
        sellingDescription: String(sellingDescription).trim().slice(0, 2000),
        otp,
        otpExpiry,
        verified: false,
        bookedAt: null,
      },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, otp);
    return res.json({ message: "OTP sent to email" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Send OTP failed" });
  }
};

export const verifyStallBookingOtp = async (req, res) => {
  const applyVerify = async ({ eventId, email, otp, session = null }) => {
    const dbOpts = session ? { session } : {};
    const eventQuery = Event.findOne(publicEventQuery(eventId)).select(
      "title timeline stallsEnabled stallCount stallBookingOpen"
    );
    const bookingQuery = StallBooking.findOne({
      eventId: undefined,
      email: String(email || "").toLowerCase(),
    });
    const event = session ? await eventQuery.session(session) : await eventQuery;
    if (!event) {
      return { error: { status: 404, message: "Event not found" } };
    }
    if (!event.stallsEnabled || event.stallCount <= 0) {
      return { error: { status: 400, message: "Stall booking is not available" } };
    }
    if (event.stallBookingOpen === false) {
      return { error: { status: 400, message: "Stall booking is closed" } };
    }

    bookingQuery.where({ eventId: event._id });
    const booking = session ? await bookingQuery.session(session) : await bookingQuery;
    if (!booking) {
      return { error: { status: 404, message: "Booking request not found" } };
    }
    if (booking.verified) {
      return { error: { status: 400, message: "Already confirmed" } };
    }
    if (booking.otp !== String(otp).trim()) {
      return { error: { status: 400, message: "Invalid OTP" } };
    }
    if (!booking.otpExpiry || booking.otpExpiry < new Date()) {
      return { error: { status: 400, message: "OTP expired" } };
    }

    const stallTakenQuery = StallBooking.findOne({
      eventId: event._id,
      stallNumber: booking.stallNumber,
      verified: true,
      _id: { $ne: booking._id },
    });
    const stallTaken = session ? await stallTakenQuery.session(session) : await stallTakenQuery;
    if (stallTaken) {
      return {
        error: {
          status: 400,
          message: "This stall was just booked by someone else. Pick another stall.",
        },
      };
    }

    booking.verified = true;
    booking.otp = "";
    booking.otpExpiry = null;
    booking.bookedAt = new Date();
    await booking.save(dbOpts);

    event.timeline.push({
      type: "stall_booked",
      text: `Stall ${booking.stallNumber} booked (${booking.name})`,
      by: null,
      createdAt: new Date(),
    });
    await event.save(dbOpts);

    return {
      data: {
        message: "Stall booking confirmed",
        stallNumber: booking.stallNumber,
        name: booking.name,
      },
    };
  };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { email, otp } = req.body;
    const eventId = req.params.eventId;

    if (!email || !otp) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Email and OTP are required" });
    }
    const out = await applyVerify({ eventId, email, otp, session });
    if (out.error) {
      await session.abortTransaction();
      return res.status(out.error.status).json({ message: out.error.message });
    }

    await session.commitTransaction();
    return res.json(out.data);
  } catch (e) {
    try {
      if (session.inTransaction()) await session.abortTransaction();
    } catch {
      // Ignore abort errors
    }
    if (isNoTransactionSupportError(e)) {
      try {
        const { email, otp } = req.body;
        const eventId = req.params.eventId;
        if (!email || !otp) {
          return res.status(400).json({ message: "Email and OTP are required" });
        }
        const out = await applyVerify({ eventId, email, otp });
        if (out.error) {
          return res.status(out.error.status).json({ message: out.error.message });
        }
        return res.json({ ...out.data, usedTransactionFallback: true });
      } catch (fallbackError) {
        console.error(fallbackError);
        return res.status(500).json({ message: fallbackError?.message || "Verify OTP failed" });
      }
    }
    console.error(e);
    return res.status(500).json({ message: e?.message || "Verify OTP failed" });
  } finally {
    session.endSession();
  }
};

/** Client dashboard — full booking details including email/phone */
export const getEventStallBookings = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (!event.isPublic || !event.stallsEnabled) {
      return res.json({ stallsEnabled: false, stallCount: 0, bookings: [] });
    }

    const bookings = await StallBooking.find({
      eventId: event._id,
      verified: true,
    })
      .sort({ stallNumber: 1 })
      .lean();

    return res.json({
      stallsEnabled: true,
      stallCount: event.stallCount,
      stallLayoutImage: event.stallLayoutImage || "",
      stallBookingOpen: event.stallBookingOpen !== false,
      bookings,
    });
  } catch {
    return res.status(500).json({ message: "Could not load stall bookings" });
  }
};
