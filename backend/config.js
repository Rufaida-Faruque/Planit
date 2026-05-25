import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET;

/** Demo admin — override in production via .env */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@planit.com";
export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD_HASH ||
  "$2a$10$.c03CMuLnIBteHiGKYcWvubr5Yn4FDV2.oZBPVUnIzXXAHb.ea1NC";

export const EMAIL_USER = process.env.EMAIL_USER || "";
export const EMAIL_PASS = process.env.EMAIL_PASS || "";
