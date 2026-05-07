
import express from "express";
import cors from "cors";
import { PORT, FRONTEND_URL } from "./config.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";


//portfolio routes
import portfolioRoutes from "./routes/portfolio.route.js";
import path from "path";
import uploadRoutes from "./routes/upload.route.js";


//verification
import verificationRoutes from "./routes/verification.route.js";
import userRoutes from "./routes/user.route.js";
import eventRoutes from "./routes/event.route.js";
import notificationRoutes from "./routes/notification.route.js";
import publicRoutes from "./routes/public.route.js";
import messageRoutes from "./routes/message.route.js";
import helpRoutes from "./routes/help.route.js";
import walletRoutes from "./routes/wallet.route.js";
import invoiceRoutes from "./routes/invoice.route.js";
import collabRoutes from "./routes/collab.route.js";

const app = express();

// Add CORS (allow configured frontend URL + localhost dev)
const allowedOrigins = new Set(["http://localhost:5173", FRONTEND_URL]);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);

app.use("/api/portfolio", portfolioRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/upload", uploadRoutes);


app.use("/api/verification", verificationRoutes);
app.use("/api/user", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/collabs", collabRoutes);


connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});