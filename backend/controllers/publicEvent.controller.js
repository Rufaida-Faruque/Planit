import crypto from "crypto";
import Event from "../models/event.model.js";
import Attendee from "../models/attendee.model.js";
import {
  sendOtpEmail,
  sendSignupConfirmationEmail,
} from "../utils/mailer.js";
import { publicEventQuery } from "../utils/publicEventQuery.js";

const makeQrToken = ({ attendeeId, eventId, email }) => {
  const raw = `${attendeeId}:${eventId}:${email}:${Date.now()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
};

export const getPublicEvent = async (req, res) => {
  try {
    const event = await Event.findOne(publicEventQuery(req.params.eventId)).select(
      "title description date location category budget isPublic poster posterSlug"
    );

    if (!event) {
      return res.status(404).json({ message: "Public event not found" });
    }
    return res.json(event);
  } catch {
    return res.status(500).json({ message: "Fetch public event failed" });
  }
};

export const sendPublicSignupOtp = async (req, res) => {
  try {
    const { name, email, phone = "" } = req.body;
    const eventId = req.params.eventId;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const event = await Event.findOne(publicEventQuery(eventId)).select(
      "title poster"
    );
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const maxGuests = Number(event.poster?.maxGuests || 0);
    if (maxGuests > 0) {
      const joined = await Attendee.countDocuments({
        eventId: event._id,
        verified: true,
      });
      if (joined >= maxGuests) {
        return res.status(400).json({ message: "Signup limit reached" });
      }
    }
    if (event.poster?.signupOpen === false) {
      return res.status(400).json({ message: "Signup is closed" });
    }

    const existingVerified = await Attendee.findOne({
      eventId: event._id,
      email: email.toLowerCase(),
      verified: true,
    });
    if (existingVerified) {
      return res.status(400).json({
        message: "You already registered with this email",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    await Attendee.findOneAndUpdate(
      { eventId: event._id, email: email.toLowerCase() },
      {
        eventId: event._id,
        name,
        email: email.toLowerCase(),
        phone,
        otp,
        otpExpiry,
        verified: false,
      },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, otp);
    return res.json({ message: "OTP sent to email" });
  } catch {
    return res.status(500).json({ message: "Send OTP failed" });
  }
};

export const verifyPublicSignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const eventId = req.params.eventId;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const event = await Event.findOne(publicEventQuery(eventId)).select(
      "title timeline"
    );
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendee = await Attendee.findOne({
      eventId: event._id,
      email: email.toLowerCase(),
    });
    if (!attendee) {
      return res.status(404).json({ message: "Signup request not found" });
    }
    if (attendee.verified) {
      return res.status(400).json({ message: "Already verified" });
    }
    if (attendee.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    if (!attendee.otpExpiry || attendee.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const qrCode = makeQrToken({
      attendeeId: attendee._id.toString(),
      eventId: event._id.toString(),
      email: attendee.email,
    });

    attendee.verified = true;
    attendee.otp = "";
    attendee.otpExpiry = null;
    attendee.qrCode = qrCode;
    attendee.joinedAt = new Date();
    await attendee.save();

    event.timeline.push({
      type: "attendee_joined",
      text: "New attendee joined public signup",
      by: null,
      createdAt: new Date(),
    });
    await event.save();

    await sendSignupConfirmationEmail({
      to: attendee.email,
      eventTitle: event.title,
      qrCode,
    });

    return res.json({
      message: "Registration confirmed",
      attendeeId: attendee._id,
      qrCode,
    });
  } catch {
    return res.status(500).json({ message: "Verify OTP failed" });
  }
};
