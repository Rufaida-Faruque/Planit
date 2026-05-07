import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true, sparse: true },
//   phone: { type: String, unique: true, sparse: true },
//   password_hash: String,
//   role: { type: String, enum: ["client", "vendor", "admin"] },


//   otp: String,
//   otp_expiry: Date,


//   verificationStatus: {
//   type: String,
//   enum: ["none", "pending", "approved", "rejected", "expired"],
//   default: "none",
// },
// });


    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true, sparse: true },
      phone: { type: String, unique: true, sparse: true },
      password_hash: String,
      role: {
        type: String,
        enum: ["client", "vendor", "admin", "guest"],
      },

      otp: String,
      otp_expiry: Date,

      verificationStatus: {
        type: String,
        enum: ["none", "pending", "approved", "rejected", "expired"],
        default: "none",
      },

      // ⭐ ADD THIS
      starredVendors: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      starredVendorsMeta: [
        {
          vendorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          starredAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

      /** Simulated balance — credits when admin pays out vendor share after event settlement */
      accountBalance: {
        type: Number,
        default: 0,
        min: 0,
      },
    });

const User = mongoose.model("User", userSchema);

export default User;