import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASS } from "../config.js";

const transporter =
  EMAIL_USER && EMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      })
    : null;

const ensureMailer = () => {
  if (!transporter) {
    throw new Error(
      "Email is not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env"
    );
  }
  return transporter;
};

export const sendGuestPhotoShareEmail = async ({
  to,
  eventTitle,
  shareUrl,
}) => {
  await ensureMailer().sendMail({
    from: EMAIL_USER,
    to,
    subject: `Share photos — ${eventTitle}`,
    text: `You're invited to add photos during "${eventTitle}".\n\nOpen this link on your phone:\n${shareUrl}\n\nAllow camera access when asked. Each photo you take will be added to the host's event album.`,
  });
};

export const sendPhotoZipEmail = async ({
  to,
  eventTitle,
  zipBuffer,
  filename,
}) => {
  await ensureMailer().sendMail({
    from: EMAIL_USER,
    to,
    subject: `Your guest photos — ${eventTitle}`,
    text: `Attached is a zip of all photos guests shared for "${eventTitle}".`,
    attachments: [
      {
        filename: filename || "guest-photos.zip",
        content: zipBuffer,
      },
    ],
  });
};

export const sendPhotoZipReadyNoAttachmentEmail = async ({
  to,
  eventTitle,
  downloadHint,
}) => {
  await ensureMailer().sendMail({
    from: EMAIL_USER,
    to,
    subject: `Your guest photos — ${eventTitle}`,
    text: `We prepared the photo archive for "${eventTitle}", but the file is too large to attach to email.\n\n${downloadHint || "Open Planit and use Download all (ZIP) in the event's Photo sharing tab."}`,
  });
};

export const sendOtpEmail = async (to, otp) => {
  await ensureMailer().sendMail({
    from: EMAIL_USER,
    to,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
  });
};

export const sendSignupConfirmationEmail = async ({
  to,
  eventTitle,
  qrCode,
}) => {
  await ensureMailer().sendMail({
    from: EMAIL_USER,
    to,
    subject: `Registration Confirmed: ${eventTitle}`,
    text: `You are successfully registered for ${eventTitle}.\nYour QR Ticket: ${qrCode}`,
  });
};

export const sendQrReminderEmail = async ({
  to,
  eventTitle,
  qrCode,
}) => {
  await ensureMailer().sendMail({
    from: EMAIL_USER,
    to,
    subject: `Reminder: QR Pass for ${eventTitle}`,
    text: `Your event is coming soon.\nUse this QR pass at entry: ${qrCode}`,
  });
};

export const sendInvitationCardEmail = async ({
  to,
  eventTitle,
  message,
  imageBase64,
}) => {
  const attachments = [];
  if (imageBase64 && imageBase64.startsWith("data:image/")) {
    const base64Content = imageBase64.split(",")[1] || "";
    attachments.push({
      filename: "invitation.png",
      content: base64Content,
      encoding: "base64",
    });
  }

  await ensureMailer().sendMail({
    from: EMAIL_USER,
    to,
    subject: `Invitation: ${eventTitle}`,
    text:
      message ||
      `You are invited to ${eventTitle}. Please see attached invitation card.`,
    attachments,
  });
};