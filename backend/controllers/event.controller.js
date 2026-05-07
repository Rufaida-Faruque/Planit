import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Event from "../models/event.model.js";
import User from "../models/user.model.js";
import StallBooking from "../models/stallBooking.model.js";
import Notification from "../models/notification.model.js";
import Attendee from "../models/attendee.model.js";
import VendorRemovalRequest from "../models/vendorRemovalRequest.model.js";
import EventDeletionRequest from "../models/eventDeletionRequest.model.js";
import EventClosureRequest from "../models/eventClosureRequest.model.js";
import VendorReview from "../models/vendorReview.model.js";
import { sendQrReminderEmail } from "../utils/mailer.js";
import { sendInvitationCardEmail } from "../utils/mailer.js";
import notificationBus from "../utils/notificationBus.js";
import { defaultClientChecklistForCreate } from "../constants/defaultClientChecklist.js";

const VENDOR_CATEGORIES = [
  "photography",
  "catering",
  "decoration",
  "venue",
];

const addTimeline = (eventDoc, activity, actorId) => {
  eventDoc.timeline.push({
    type: activity.type,
    text: activity.text,
    by: actorId || null,
    createdAt: new Date(),
  });
};

const createNotification = async ({
  userId,
  title,
  message,
  link = "",
}) => {
  if (!userId) return;
  await Notification.create({
    user: userId,
    title,
    message,
    link,
  });
  notificationBus.emit("notification", {
    userId: userId.toString(),
    title,
    message,
    link,
    createdAt: new Date().toISOString(),
  });
};

const makePosterSlug = (title, id) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "event"}-${id.toString().slice(-6)}`;
};

/** Vendor counts toward spend once hired (accepted request). Supports legacy docs missing requestStatus. */
const vendorCountsTowardBudget = (v) => {
  if (v.requestStatus === "accepted") return true;
  if (v.requestStatus === "pending" || v.requestStatus === "rejected") {
    return false;
  }
  return v.status === "accepted";
};

/** Sum of accepted vendor offers + manual budget line items */
const computeBudgetUsed = (event) => {
  const vendorSpend = (event.vendors || []).reduce((sum, v) => {
    if (!vendorCountsTowardBudget(v)) return sum;
    return sum + Number(v.offerAmount || 0);
  }, 0);
  const extraSpend = (event.budgetExtras || []).reduce(
    (sum, x) => sum + Number(x.amount || 0),
    0
  );
  const total = vendorSpend + extraSpend;
  return Math.round(total * 100) / 100;
};

const applyBudgetUsedToEvent = (event) => {
  event.budgetUsed = computeBudgetUsed(event);
};

/** After admin-approved closure, most event edits are blocked (photo sharing + chat stay open). */
const rejectIfEventLocked = (event, res) => {
  if (event.postClosureLocked) {
    res.status(403).json({
      message:
        "This event is closed. Only photo sharing and messages can still be used.",
    });
    return true;
  }
  return false;
};

/** Calendar day of event has ended (local end-of-day). */
export const isEventPastDeadline = (eventDate) => {
  const d = new Date(eventDate);
  d.setHours(23, 59, 59, 999);
  return Date.now() > d.getTime();
};

export const createEvent = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Clients only" });
    }

    const {
      title,
      description = "",
      date,
      location = "",
      budget = 0,
      status = "draft",
      isPublic = false,
    } = req.body;

    if (!title || !date) {
      return res
        .status(400)
        .json({ message: "Title and date are required" });
    }

    const event = await Event.create({
      title,
      description,
      date,
      location,
      budget: Number(budget || 0),
      status,
      isPublic,
      clientId: req.user.id,
      posterSlug: undefined,
      timeline: [
        {
          type: "event_created",
          text: "Event created",
          by: req.user.id,
          createdAt: new Date(),
        },
      ],
      poster: {
        eventTitle: title,
        description,
        venue: location,
        date,
        signupOpen: true,
      },
      clientChecklist: defaultClientChecklistForCreate(),
    });

    if (event.isPublic) {
      event.posterSlug = makePosterSlug(event.title, event._id);
      await event.save();
    }

    await createNotification({
      userId: req.user.id,
      title: "Event Created",
      message: `${title} has been created successfully`,
      link: `/client/events/${event._id}`,
    });

    return res.status(201).json(event);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        message:
          "Event create conflict. Please retry once (poster slug/index issue).",
      });
    }
    return res.status(500).json({ message: "Create event failed" });
  }
};

export const getMyEvents = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Clients only" });
    }

    const events = await Event.find({ clientId: req.user.id }).sort({
      createdAt: -1,
    });
    return res.json(events);
  } catch {
    return res.status(500).json({ message: "Fetch events failed" });
  }
};

export const getAdminDashboardData = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const [vendors, clients, events] = await Promise.all([
      User.find({ role: "vendor" })
        .select("name email verificationStatus createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: "client" })
        .select("name email createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Event.find({})
        .select("title status date location clientId createdAt postClosureLocked")
        .populate("clientId", "name email")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.json({ vendors, clients, events });
  } catch {
    return res.status(500).json({ message: "Could not load admin dashboard data" });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("vendors.vendorId", "name email role")
      .populate("timeline.by", "name role")
      .populate("notes.by", "name role");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const prevUsed = Number(event.budgetUsed || 0);
    applyBudgetUsedToEvent(event);
    if (Number(event.budgetUsed) !== prevUsed) {
      await event.save();
    }

    const closureRequest = await EventClosureRequest.findOne({ eventId: event._id })
      .sort({ createdAt: -1 })
      .lean();
    const myVendorReviews = await VendorReview.find({
      eventId: event._id,
      clientId: req.user.id,
    }).lean();

    return res.json({
      ...event.toObject(),
      closureRequest: closureRequest || null,
      myVendorReviews,
    });
  } catch {
    return res.status(500).json({ message: "Fetch event failed" });
  }
};

export const updateEventInfo = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const {
      title,
      description,
      date,
      location,
      budget,
      status,
      isPublic,
      poster,
      invitationCard,
      privateGuestList,
      budgetExtras,
      clientChecklist,
      stallsEnabled,
      stallCount,
      stallLayoutImage,
      stallBookingOpen,
    } = req.body;

    const budgetBefore = event.budget;
    const statusBefore = event.status;

    if (isPublic !== undefined && Boolean(isPublic) !== Boolean(event.isPublic)) {
      return res.status(400).json({
        message:
          "Event visibility (public vs private) is set when the event is created and cannot be changed.",
      });
    }

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (date !== undefined) event.date = date;
    if (location !== undefined) event.location = location;
    if (budget !== undefined) event.budget = Number(budget);
    if (status !== undefined) event.status = status;
    if (poster !== undefined && typeof poster === "object") {
      event.poster = {
        ...event.poster?.toObject?.(),
        ...poster,
      };
    }
    if (invitationCard !== undefined && typeof invitationCard === "object") {
      event.invitationCard = {
        ...event.invitationCard?.toObject?.(),
        ...invitationCard,
        updatedAt: new Date(),
      };
      addTimeline(
        event,
        { type: "invitation_updated", text: "Private invitation card updated" },
        req.user.id
      );
    }
    if (privateGuestList !== undefined && Array.isArray(privateGuestList)) {
      event.privateGuestList = privateGuestList
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean);
    }
    if (budgetExtras !== undefined && Array.isArray(budgetExtras)) {
      event.budgetExtras = budgetExtras
        .map((row) => ({
          label: String(row.label || "").trim().slice(0, 120),
          amount: Math.max(0, Number(row.amount || 0)),
        }))
        .filter((row) => row.label.length > 0);
      addTimeline(
        event,
        { type: "budget_extras_updated", text: "Other expenses updated" },
        req.user.id
      );
    }
    if (stallsEnabled !== undefined) {
      if (!event.isPublic && Boolean(stallsEnabled)) {
        return res.status(400).json({
          message: "Stalls are only available for public events.",
        });
      }
      event.stallsEnabled = Boolean(stallsEnabled);
    }
    if (stallBookingOpen !== undefined) {
      event.stallBookingOpen = Boolean(stallBookingOpen);
    }
    if (stallLayoutImage !== undefined && typeof stallLayoutImage === "string") {
      event.stallLayoutImage = stallLayoutImage.slice(0, 500);
    }
    if (stallCount !== undefined) {
      const n = Math.max(0, Math.floor(Number(stallCount)));
      const highest = await StallBooking.findOne({
        eventId: event._id,
        verified: true,
      })
        .sort({ stallNumber: -1 })
        .select("stallNumber")
        .lean();
      if (highest && highest.stallNumber > n) {
        return res.status(400).json({
          message: `Cannot reduce stalls below ${highest.stallNumber} — that stall is booked.`,
        });
      }
      event.stallCount = n;
    }

    if (clientChecklist !== undefined && Array.isArray(clientChecklist)) {
      event.clientChecklist = clientChecklist
        .filter((row) => String(row.text || "").trim())
        .map((row, index) => {
          const item = {
            text: String(row.text || "").trim().slice(0, 500),
            done: Boolean(row.done),
            notes: String(row.notes || "").trim().slice(0, 500),
            sortOrder: Number(row.sortOrder ?? index),
            updatedAt: new Date(),
          };
          if (row._id && mongoose.Types.ObjectId.isValid(row._id)) {
            item._id = row._id;
          }
          return item;
        });
      addTimeline(
        event,
        {
          type: "client_checklist_updated",
          text: "Planning checklist updated",
        },
        req.user.id
      );
    }

    applyBudgetUsedToEvent(event);

    if (budget !== undefined && Number(budgetBefore) !== Number(budget)) {
      addTimeline(
        event,
        { type: "budget_updated", text: "Budget updated" },
        req.user.id
      );
    }
    if (status !== undefined && statusBefore !== status) {
      addTimeline(
        event,
        { type: "status_updated", text: `Status changed to ${status}` },
        req.user.id
      );
    }

    await event.save();
    return res.json(event);
  } catch {
    return res.status(500).json({ message: "Update event failed" });
  }
};

export const uploadPosterBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const relativePath = `/uploads/events/${req.params.id}/poster/${req.file.filename}`;
    const prev = event.poster?.bannerImage;
    if (
      prev &&
      typeof prev === "string" &&
      prev.startsWith("/uploads/events/") &&
      !prev.startsWith("http")
    ) {
      try {
        const abs = path.join(process.cwd(), prev.replace(/^\//, ""));
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch {
        /* ignore */
      }
    }

    event.poster = {
      ...(event.poster?.toObject?.() || {}),
      bannerImage: relativePath,
    };
    await event.save();

    return res.json({ bannerImage: relativePath });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Banner upload failed" });
  }
};

export const addVendorToEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const { vendorId, category = "" } = req.body;
    if (!vendorId) {
      return res.status(400).json({ message: "vendorId is required" });
    }

    const exists = event.vendors.some(
      (item) => item.vendorId.toString() === vendorId
    );
    if (exists) {
      return res.status(400).json({ message: "Vendor already added" });
    }

    event.vendors.push({
      vendorId,
      category,
      status: "accepted",
      requestStatus: "accepted",
      offerAmount: 0,
      offerPackage: "",
      selectedAt: new Date(),
      completedAt: null,
      checklist: [],
    });
    addTimeline(
      event,
      { type: "vendor_invited", text: "Vendor invited to event" },
      req.user.id
    );

    applyBudgetUsedToEvent(event);
    await event.save();

    await createNotification({
      userId: req.user.id,
      title: "Vendor Added",
      message: "Vendor has been invited to your event",
      link: `/client/events/${event._id}`,
    });

    return res.json(event);
  } catch {
    return res.status(500).json({ message: "Add vendor failed" });
  }
};

export const sendVendorRequest = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const {
      vendorId,
      category = "",
      offerAmount = 0,
      offerPackage = "",
      serviceSelection,
    } = req.body;
    if (!vendorId) {
      return res.status(400).json({ message: "vendorId is required" });
    }
    if (!VENDOR_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: "Invalid vendor category",
      });
    }

    const existing = event.vendors.find(
      (item) => item.vendorId.toString() === vendorId
    );

    if (existing) {
      existing.category = category || existing.category;
      existing.offerAmount = Number(offerAmount || 0);
      existing.offerPackage = offerPackage || "";
      existing.serviceSelection =
        serviceSelection && typeof serviceSelection === "object"
          ? serviceSelection
          : existing.serviceSelection || {};
      existing.requestStatus = "pending";
      existing.status = "invited";
      existing.selectedAt = new Date();
    } else {
      event.vendors.push({
        vendorId,
        category,
        status: "invited",
        requestStatus: "pending",
        offerAmount: Number(offerAmount || 0),
        offerPackage: offerPackage || "",
        serviceSelection:
          serviceSelection && typeof serviceSelection === "object"
            ? serviceSelection
            : {},
        selectedAt: new Date(),
        completedAt: null,
        checklist: [],
      });
    }

    addTimeline(
      event,
      { type: "vendor_request_sent", text: "Vendor request sent with package" },
      req.user.id
    );
    applyBudgetUsedToEvent(event);
    await event.save();

    await createNotification({
      userId: vendorId,
      title: "New Event Request",
      message: `You received a request for event ${event.title}`,
      link: `/vendor/events/${event._id}`,
    });

    return res.json(event);
  } catch {
    return res.status(500).json({ message: "Send vendor request failed" });
  }
};

export const updateVendorStatus = async (req, res) => {
  return res.status(403).json({
    message:
      "Client cannot change vendor status. Vendor must respond.",
  });
};

export const addEventNote = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Note text is required" });
    }

    event.notes.push({
      text: text.trim(),
      by: req.user.id,
      createdAt: new Date(),
    });
    addTimeline(
      event,
      { type: "note_added", text: "New note added" },
      req.user.id
    );

    await event.save();
    return res.json(event);
  } catch {
    return res.status(500).json({ message: "Add note failed" });
  }
};

export const getVendorEvents = async (req, res) => {
  try {
    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Vendors only" });
    }

    const data = await Event.find({
      "vendors.vendorId": req.user.id,
    })
      .populate("clientId", "name email")
      .sort({ createdAt: -1 });

    const mapped = data.map((item) => {
      const vendorView = item.vendors.find(
        (v) => v.vendorId.toString() === req.user.id
      );
      return {
        _id: item._id,
        title: item.title,
        date: item.date,
        status: item.status,
        location: item.location,
        client: item.clientId,
        offerAmount: vendorView?.offerAmount || 0,
        offerPackage: vendorView?.offerPackage || "",
        requestStatus: vendorView?.requestStatus || "pending",
        vendorStatus: vendorView?.status || "invited",
      };
    });

    return res.json(mapped);
  } catch {
    return res.status(500).json({ message: "Fetch vendor events failed" });
  }
};

export const getVendorEventById = async (req, res) => {
  try {
    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Vendors only" });
    }

    const event = await Event.findById(req.params.id).populate(
      "clientId",
      "name email phone"
    );
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const vendorEntry = event.vendors.find(
      (v) => v.vendorId.toString() === req.user.id
    );
    if (!vendorEntry) {
      return res.status(403).json({ message: "No access to this event" });
    }

    return res.json({
      _id: event._id,
      title: event.title,
      date: event.date,
      location: event.location,
      status: event.status,
      budget: event.budget,
      budgetUsed: event.budgetUsed,
      client: event.clientId,
      offerAmount: vendorEntry.offerAmount,
      offerPackage: vendorEntry.offerPackage,
      requestStatus: vendorEntry.requestStatus,
      vendorStatus: vendorEntry.status,
      checklist: vendorEntry.checklist || [],
    });
  } catch {
    return res.status(500).json({ message: "Fetch vendor event failed" });
  }
};

export const vendorRespondToRequest = async (req, res) => {
  try {
    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Vendors only" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const { accept } = req.body;
    const vendorEntry = event.vendors.find(
      (v) => v.vendorId.toString() === req.user.id
    );
    if (!vendorEntry) {
      return res.status(403).json({ message: "No request found" });
    }

    if (Boolean(accept)) {
      vendorEntry.requestStatus = "accepted";
      vendorEntry.status = "accepted";
      addTimeline(
        event,
        { type: "vendor_accepted", text: "Vendor accepted request" },
        req.user.id
      );
      await createNotification({
        userId: event.clientId,
        title: "Vendor Accepted",
        message: `${event.title}: vendor accepted your request`,
        link: `/client/events/${event._id}`,
      });
    } else {
      vendorEntry.requestStatus = "rejected";
      vendorEntry.status = "rejected";
      addTimeline(
        event,
        { type: "vendor_rejected", text: "Vendor rejected request" },
        req.user.id
      );
      await createNotification({
        userId: event.clientId,
        title: "Vendor Rejected",
        message: `${event.title}: vendor rejected your request`,
        link: `/client/events/${event._id}`,
      });
    }

    applyBudgetUsedToEvent(event);
    await event.save();
    const updated = await Event.findById(event._id).populate(
      "vendors.vendorId",
      "name email"
    );
    return res.json({ message: "Response saved", event: updated });
  } catch {
    return res.status(500).json({ message: "Vendor response failed" });
  }
};

export const upsertVendorChecklistItem = async (req, res) => {
  try {
    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Vendors only" });
    }
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const vendorEntry = event.vendors.find(
      (v) => v.vendorId.toString() === req.user.id
    );
    if (!vendorEntry) {
      return res.status(403).json({ message: "No access to this event" });
    }

    const { checklistItemId, text, done } = req.body;

    if (checklistItemId) {
      const item = vendorEntry.checklist.find(
        (row) => row._id.toString() === checklistItemId
      );
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      if (text !== undefined) item.text = text;
      if (done !== undefined) item.done = Boolean(done);
      item.updatedAt = new Date();
    } else {
      if (!text || !text.trim()) {
        return res.status(400).json({ message: "Checklist text required" });
      }
      vendorEntry.checklist.push({
        text: text.trim(),
        done: Boolean(done),
        updatedAt: new Date(),
      });
    }

    addTimeline(
      event,
      { type: "vendor_checklist", text: "Vendor checklist updated" },
      req.user.id
    );
    await event.save();

    await createNotification({
      userId: event.clientId,
      title: "Checklist Updated",
      message: `${event.title}: vendor updated checklist`,
      link: `/client/events/${event._id}`,
    });

    return res.json({ checklist: vendorEntry.checklist, event });
  } catch {
    return res.status(500).json({ message: "Checklist update failed" });
  }
};

export const getEventAttendees = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select("clientId");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const attendees = await Attendee.find({
      eventId: req.params.id,
      verified: true,
    }).sort({ joinedAt: -1 });

    return res.json(attendees);
  } catch {
    return res.status(500).json({ message: "Fetch attendees failed" });
  }
};

export const checkInAttendee = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const { qrCode } = req.body;
    if (!qrCode) {
      return res.status(400).json({ message: "QR code is required" });
    }

    const attendee = await Attendee.findOne({
      eventId: req.params.id,
      qrCode,
      verified: true,
    });
    if (!attendee) {
      return res.status(404).json({ message: "Attendee not found for QR" });
    }
    if (attendee.checkedIn) {
      return res.status(400).json({ message: "Already checked in" });
    }

    attendee.checkedIn = true;
    await attendee.save();

    addTimeline(
      event,
      {
        type: "attendee_checked_in",
        text: `${attendee.name} checked in`,
      },
      req.user.id
    );
    await event.save();

    return res.json({ message: "Check-in successful", attendee });
  } catch {
    return res.status(500).json({ message: "Check-in failed" });
  }
};

export const sendEventQrReminders = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const attendees = await Attendee.find({
      eventId: req.params.id,
      verified: true,
    });

    for (const attendee of attendees) {
      if (!attendee.qrCode) continue;
      await sendQrReminderEmail({
        to: attendee.email,
        eventTitle: event.title,
        qrCode: attendee.qrCode,
      });
    }

    addTimeline(
      event,
      {
        type: "qr_reminder_sent",
        text: `QR reminders sent to ${attendees.length} attendees`,
      },
      req.user.id
    );
    await event.save();

    return res.json({
      message: "QR reminders sent",
      total: attendees.length,
    });
  } catch {
    return res.status(500).json({ message: "Reminder send failed" });
  }
};

export const sendPrivateInvitations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (event.isPublic) {
      return res
        .status(400)
        .json({ message: "Invitation card sending only for private events" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const guests = (event.privateGuestList || []).filter(Boolean);
    if (guests.length === 0) {
      return res.status(400).json({ message: "Guest list is empty" });
    }

    for (const email of guests) {
      await sendInvitationCardEmail({
        to: email,
        eventTitle: event.title,
        message: event.invitationCard?.bodyText || "",
        imageBase64: event.invitationCard?.imageData || "",
      });
    }

    addTimeline(
      event,
      {
        type: "private_invitations_sent",
        text: `Private invitation sent to ${guests.length} guests`,
      },
      req.user.id
    );
    await event.save();

    return res.json({
      message: "Invitation cards sent",
      total: guests.length,
    });
  } catch {
    return res.status(500).json({ message: "Send invitation cards failed" });
  }
};

export const requestVendorRemoval = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const { vendorId } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res
        .status(400)
        .json({ message: "Removal reason is required" });
    }

    const vendorEntry = event.vendors.find(
      (item) => item.vendorId.toString() === vendorId
    );
    if (!vendorEntry) {
      return res
        .status(404)
        .json({ message: "Vendor not found in event" });
    }

    const data = await VendorRemovalRequest.create({
      eventId: event._id,
      vendorId,
      clientId: req.user.id,
      reason: reason.trim(),
      status: "pending",
    });

    addTimeline(
      event,
      { type: "vendor_removal_requested", text: "Vendor removal requested to admin" },
      req.user.id
    );
    await event.save();

    return res.status(201).json(data);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        message: "Pending removal request already exists",
      });
    }
    return res
      .status(500)
      .json({ message: "Vendor removal request failed" });
  }
};

export const getVendorRemovalRequests = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const data = await VendorRemovalRequest.find()
      .populate("eventId", "title date location")
      .populate("vendorId", "name email")
      .populate("clientId", "name email")
      .sort({ createdAt: -1 });

    return res.json(data);
  } catch {
    return res
      .status(500)
      .json({ message: "Fetch removal requests failed" });
  }
};

export const reviewVendorRemovalRequest = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { action, adminComment = "" } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Action must be approve or reject",
      });
    }

    const request = await VendorRemovalRequest.findById(req.params.requestId);
    if (!request) {
      return res
        .status(404)
        .json({ message: "Removal request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Request already reviewed",
      });
    }

    request.status = action === "approve" ? "approved" : "rejected";
    request.adminComment = adminComment;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    const event = await Event.findById(request.eventId);
    if (event) {
      if (action === "approve") {
        event.vendors = event.vendors.filter(
          (item) => item.vendorId.toString() !== request.vendorId.toString()
        );
        addTimeline(
          event,
          { type: "vendor_removed_admin", text: "Vendor removed by admin decision" },
          req.user.id
        );
        applyBudgetUsedToEvent(event);
      } else {
        addTimeline(
          event,
          { type: "vendor_removal_rejected", text: "Admin rejected vendor removal request" },
          req.user.id
        );
      }
      await event.save();
    }

    await createNotification({
      userId: request.clientId,
      title: "Vendor Removal Request Reviewed",
      message:
        action === "approve"
          ? "Admin approved your vendor removal request"
          : "Admin rejected your vendor removal request",
      link: `/client/events/${request.eventId}`,
    });

    return res.json(request);
  } catch {
    return res
      .status(500)
      .json({ message: "Review vendor removal request failed" });
  }
};

export const requestEventDeletion = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (rejectIfEventLocked(event, res)) return;

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res
        .status(400)
        .json({ message: "Deletion reason is required" });
    }

    const data = await EventDeletionRequest.create({
      eventId: event._id,
      clientId: req.user.id,
      reason: reason.trim(),
      status: "pending",
    });

    addTimeline(
      event,
      { type: "event_deletion_requested", text: "Event deletion requested to admin" },
      req.user.id
    );
    await event.save();

    return res.status(201).json(data);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        message: "Pending event deletion request already exists",
      });
    }
    return res.status(500).json({ message: "Event deletion request failed" });
  }
};

export const getEventDeletionRequests = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const data = await EventDeletionRequest.find()
      .populate("eventId", "title date location")
      .populate("clientId", "name email")
      .sort({ createdAt: -1 });

    return res.json(data);
  } catch {
    return res
      .status(500)
      .json({ message: "Fetch event deletion requests failed" });
  }
};

export const reviewEventDeletionRequest = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { action, adminComment = "" } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Action must be approve or reject",
      });
    }

    const request = await EventDeletionRequest.findById(req.params.requestId);
    if (!request) {
      return res
        .status(404)
        .json({ message: "Event deletion request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already reviewed" });
    }

    request.status = action === "approve" ? "approved" : "rejected";
    request.adminComment = adminComment;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    const event = await Event.findById(request.eventId);
    if (event) {
      if (action === "approve") {
        await Event.findByIdAndDelete(event._id);
      } else {
        addTimeline(
          event,
          { type: "event_deletion_rejected", text: "Admin rejected event deletion request" },
          req.user.id
        );
        await event.save();
      }
    }

    await createNotification({
      userId: request.clientId,
      title: "Event Deletion Request Reviewed",
      message:
        action === "approve"
          ? "Admin approved event deletion request"
          : "Admin rejected event deletion request",
      link: "/client",
    });

    return res.json(request);
  } catch {
    return res
      .status(500)
      .json({ message: "Review event deletion request failed" });
  }
};

export const requestEventClosure = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Clients only" });
    }
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.clientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (event.postClosureLocked) {
      return res.status(400).json({ message: "This event is already closed." });
    }
    if (!isEventPastDeadline(event.date)) {
      return res.status(400).json({
        message: "You can request closure only after the event date has passed.",
      });
    }

    const data = await EventClosureRequest.create({
      eventId: event._id,
      clientId: req.user.id,
      status: "pending",
    });

    addTimeline(
      event,
      { type: "event_closure_requested", text: "Client requested to close the event (awaiting admin)" },
      req.user.id
    );
    await event.save();

    return res.status(201).json(data);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        message: "A closure request is already pending for this event.",
      });
    }
    return res.status(500).json({ message: "Closure request failed" });
  }
};

export const getEventClosureRequests = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }
    const data = await EventClosureRequest.find()
      .populate("eventId", "title date location postClosureLocked")
      .populate("clientId", "name email")
      .sort({ createdAt: -1 });
    return res.json(data);
  } catch {
    return res.status(500).json({ message: "Fetch closure requests failed" });
  }
};

export const reviewEventClosureRequest = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }
    const { action, adminComment = "" } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be approve or reject" });
    }

    const request = await EventClosureRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: "Closure request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already reviewed" });
    }

    request.status = action === "approve" ? "approved" : "rejected";
    request.adminComment = adminComment;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    const event = await Event.findById(request.eventId);
    if (event) {
      if (action === "approve") {
        event.postClosureLocked = true;
        addTimeline(
          event,
          { type: "event_closed_by_admin", text: "Admin closed the event — editing locked except photo sharing & chat" },
          null
        );
      } else {
        addTimeline(
          event,
          { type: "event_closure_rejected", text: "Admin rejected event closure request" },
          null
        );
      }
      await event.save();
    }

    await createNotification({
      userId: request.clientId,
      title: "Event closure request reviewed",
      message:
        action === "approve"
          ? "Your event was closed by admin. Photo sharing and chat remain open."
          : "Admin rejected your request to close the event.",
      link: `/client`,
    });

    return res.json(request);
  } catch {
    return res.status(500).json({ message: "Review closure request failed" });
  }
};
