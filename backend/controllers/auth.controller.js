




import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD } from "../config.js";
import { sendOtpEmail } from "../utils/mailer.js";

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // ❌ BLOCK ADMIN REGISTRATION
    if (role === "admin") {
      return res.status(403).json({
        message: "Not allowed to register as admin",
      });
    }

    // XOR validation
    if ((email && phone) || (!email && !phone)) {
      return res.status(400).json({
        message: "Use either email OR phone",
      });
    }

    if (!name || !password || !role) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // Duplicate check
    let existing;

    if (email) {
      existing = await User.findOne({ email });
    } else if (phone) {
      existing = await User.findOne({ phone });
    }

    if (existing) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      password_hash: hashedPassword,
      role,
    };

    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    const user = await User.create(userData);

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, user });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Provide email/phone and password",
      });
    }

    // ✅ ADMIN LOGIN
    if (identifier === ADMIN_EMAIL) {
      const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD);

      if (!isMatch) {
        return res.status(400).json({
          message: "Invalid admin credentials",
        });
      }

      const token = jwt.sign(
        { role: "admin" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        token,
        user: {
          name: "Admin",
          role: "admin",
          email: ADMIN_EMAIL,
        },
      });
    }

    // ✅ NORMAL USER LOGIN
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ token, user });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= SEND OTP =================
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otp_expiry = Date.now() + 5 * 60 * 1000;

    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error sending OTP",
    });
  }
};

// ================= VERIFY OTP =================
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (user.otp_expiry < Date.now()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    res.json({ message: "OTP verified" });

  } catch (err) {
    res.status(500).json({
      message: "Error verifying OTP",
    });
  }
};

// ================= RESET PASSWORD =================
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // 🔥 ENSURE OTP WAS VERIFIED (basic protection)
    if (!user.otp || user.otp_expiry < Date.now()) {
      return res.status(400).json({
        message: "OTP not verified or expired",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password_hash = hashedPassword;

    // clear OTP
    user.otp = null;
    user.otp_expiry = null;

    await user.save();

    res.json({ message: "Password updated" });

  } catch (err) {
    res.status(500).json({
      message: "Error resetting password",
    });
  }
};



