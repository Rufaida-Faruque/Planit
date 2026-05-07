import crypto from "crypto";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import archiver from "archiver";
import Event from "../models/event.model.js";
import { FRONTEND_URL } from "../config.js";
import {
  sendGuestPhotoShareEmail,
  sendPhotoZipEmail,
  sendPhotoZipReadyNoAttachmentEmail,
} from "../utils/mailer.js";

const maxZipEmailBytes = 18 * 1024 * 1024;

const assertClientEvent = async (req) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return { error: { status: 404, message: "Event not found" } };
  }
  if (event.clientId.toString() !== req.user.id) {
    return { error: { status: 403, message: "Not allowed" } };
  }
  if (event.isPublic) {
    return { error: { status: 400, message: "Photo sharing is only for private events" } };
  }
  return { event };
};

const buildZipBuffer = (event) => {
  return new Promise((resolve, reject) => {
    const bufs = [];
    const archive = archiver("zip", { zlib: { level: 5 } });
    const stream = new PassThrough();
    stream.on("data", (c) => bufs.push(c));
    stream.on("end", () => resolve(Buffer.concat(bufs)));
    stream.on("error", reject);
    archive.on("error", reject);
    archive.pipe(stream);

    let count = 0;
    for (const g of event.guestPhotos || []) {
      const fsPath = path.join(process.cwd(), String(g.relativePath || "").replace(/^\//, ""));
      if (fs.existsSync(fsPath)) {
        count += 1;
        archive.file(fsPath, {
          name: `photo-${count}${path.extname(fsPath) || ".jpg"}`,
        });
      }
    }
    if (count === 0) {
      archive.append("No guest photos were uploaded yet.", { name: "readme.txt" });
    }
    archive.finalize();
  });
};

export const startPhotoShare = async (req, res) => {
  try {
    const { event, error } = await assertClientEvent(req);
    if (error) return res.status(error.status).json({ message: error.message });

    const guests = (event.privateGuestList || []).filter(Boolean);
    if (guests.length === 0) {
      return res.status(400).json({
        message: "Add guest emails on the Guest list tab before starting photo sharing.",
      });
    }

    if (!event.photoShareToken) {
      event.photoShareToken = crypto.randomBytes(32).toString("hex");
    }
    event.photoShareActive = true;
    event.photoShareStartedAt = new Date();
    event.timeline.push({
      type: "photo_share_started",
      text: "Guest photo sharing started; link emailed to guests",
      by: req.user.id,
      createdAt: new Date(),
    });
    await event.save();

    const shareUrl = `${FRONTEND_URL}/share-photos/${event._id}/${event.photoShareToken}`;
    for (const email of guests) {
      try {
        await sendGuestPhotoShareEmail({
          to: email,
          eventTitle: event.title,
          shareUrl,
        });
      } catch (e) {
        console.error("Guest photo email failed", email, e?.message);
      }
    }

    const updated = await Event.findById(event._id);
    return res.json({
      event: updated,
      shareUrl,
      emailedGuests: guests.length,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Could not start photo sharing" });
  }
};

export const resendPhotoShareEmails = async (req, res) => {
  try {
    const { event, error } = await assertClientEvent(req);
    if (error) return res.status(error.status).json({ message: error.message });

    if (!event.photoShareActive || !event.photoShareToken) {
      return res.status(400).json({ message: "Start photo sharing first." });
    }

    const guests = (event.privateGuestList || []).filter(Boolean);
    if (guests.length === 0) {
      return res.status(400).json({ message: "No guests on the guest list." });
    }

    const shareUrl = `${FRONTEND_URL}/share-photos/${event._id}/${event.photoShareToken}`;
    for (const email of guests) {
      try {
        await sendGuestPhotoShareEmail({
          to: email,
          eventTitle: event.title,
          shareUrl,
        });
      } catch (e) {
        console.error("Guest photo email failed", email, e?.message);
      }
    }

    return res.json({ ok: true, emailedGuests: guests.length, shareUrl });
  } catch {
    return res.status(500).json({ message: "Could not resend emails" });
  }
};

export const getGuestPhotoShareInfo = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).select(
      "title isPublic photoShareToken photoShareActive"
    );
    if (!event || event.isPublic) {
      return res.status(404).json({ message: "Not found" });
    }
    if (
      !event.photoShareActive ||
      !event.photoShareToken ||
      event.photoShareToken !== req.params.token
    ) {
      return res.status(403).json({ message: "This photo link is not active." });
    }
    return res.json({
      ok: true,
      title: event.title,
    });
  } catch {
    return res.status(500).json({ message: "Could not load event" });
  }
};

export const uploadGuestPhoto = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event || event.isPublic) {
      return res.status(404).json({ message: "Not found" });
    }
    if (
      !event.photoShareActive ||
      !event.photoShareToken ||
      event.photoShareToken !== req.params.token
    ) {
      return res.status(403).json({ message: "Invalid or inactive link" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const relativePath = `/uploads/events/${req.params.eventId}/guest-photos/${req.file.filename}`;
    event.guestPhotos.push({
      relativePath,
      uploadedAt: new Date(),
    });
    await event.save();

    return res.json({
      ok: true,
      url: relativePath,
      totalPhotos: event.guestPhotos.length,
    });
  } catch (e) {
    if (e.message === "Only image files are allowed") {
      return res.status(400).json({ message: e.message });
    }
    return res.status(500).json({ message: "Upload failed" });
  }
};

export const downloadGuestPhotoZip = async (req, res) => {
  try {
    const { event, error } = await assertClientEvent(req);
    if (error) return res.status(error.status).json({ message: error.message });

    if (!event.guestPhotos?.length) {
      return res.status(400).json({ message: "No guest photos yet." });
    }

    const buf = await buildZipBuffer(event);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(event.title || "event")}-guest-photos.zip"`
    );
    return res.send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Could not build zip" });
  }
};

export const emailGuestPhotoZip = async (req, res) => {
  try {
    const { event, error } = await assertClientEvent(req);
    if (error) return res.status(error.status).json({ message: error.message });

    if (!event.guestPhotos?.length) {
      return res.status(400).json({ message: "No guest photos to send yet." });
    }

    const guests = (event.privateGuestList || [])
      .map((x) => String(x || "").trim().toLowerCase())
      .filter(Boolean);
    if (guests.length === 0) {
      return res.status(400).json({
        message: "No guest emails found in Guest list.",
      });
    }

    const buf = await buildZipBuffer(event);
    const safeTitle = String(event.title || "event").replace(/[^\w\s-]/g, "").slice(0, 80);
    const filename = `${safeTitle || "event"}-guest-photos.zip`;
    const attached = buf.length <= maxZipEmailBytes;

    let emailedGuests = 0;
    let failedGuests = 0;
    for (const to of guests) {
      try {
        if (attached) {
          await sendPhotoZipEmail({
            to,
            eventTitle: event.title,
            zipBuffer: buf,
            filename,
          });
        } else {
          await sendPhotoZipReadyNoAttachmentEmail({
            to,
            eventTitle: event.title,
            downloadHint:
              "The zip is too large to attach. Please ask the event host to download and share the ZIP manually.",
          });
        }
        emailedGuests += 1;
      } catch (e) {
        failedGuests += 1;
        console.error("Guest zip email failed", to, e?.message);
      }
    }

    event.photoZipLastEmailedAt = new Date();
    await event.save();

    return res.json({
      ok: true,
      emailedGuests,
      failedGuests,
      totalGuests: guests.length,
      zipBytes: buf.length,
      attached,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Could not email photos" });
  }
};
