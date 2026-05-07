import dotenv from "dotenv";
dotenv.config();


export const PORT = process.env.PORT || 5000;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET;

export const ADMIN_EMAIL = "admin@planit.com";
export const ADMIN_PASSWORD = "$2a$10$.c03CMuLnIBteHiGKYcWvubr5Yn4FDV2.oZBPVUnIzXXAHb.ea1NC"; // hashed of admin123



export const EMAIL_USER = "todayissunday19th@gmail.com";
export const EMAIL_PASS = "jevt jgnj biag dxsq"; 