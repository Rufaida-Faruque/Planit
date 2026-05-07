import mongoose from "mongoose";

const eventVendorSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "invited",
        "accepted",
        "working",
        "completed",
        "rejected",
      ],
      default: "invited",
    },
    requestStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    offerAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    offerPackage: {
      type: String,
      default: "",
    },
    serviceSelection: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    collabPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollabPackage",
      default: null,
    },
    selectedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    checklist: {
      type: [
        {
          _id: {
            type: mongoose.Schema.Types.ObjectId,
            auto: true,
          },
          text: {
            type: String,
            required: true,
          },
          done: {
            type: Boolean,
            default: false,
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const timelineSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const budgetExtraSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const posterSchema = new mongoose.Schema(
  {
    eventTitle: { type: String, default: "" },
    bannerImage: { type: String, default: "" },
    description: { type: String, default: "" },
    venue: { type: String, default: "" },
    date: { type: Date, default: null },
    time: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    schedule: { type: [String], default: [] },
    signupOpen: { type: Boolean, default: true },
    maxGuests: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const clientChecklistItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    done: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 500,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const invitationCardSchema = new mongoose.Schema(
  {
    cardColor: { type: String, default: "#f8f2e7" },
    fontFamily: { type: String, default: "Georgia" },
    pattern: { type: String, default: "dots" },
    titleText: { type: String, default: "" },
    bodyText: { type: String, default: "" },
    titlePlacement: { type: String, default: "top" },
    bodyPlacement: { type: String, default: "middle" },
    format: { type: String, enum: ["png", "jpeg"], default: "png" },
    imageData: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      default: "",
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    budgetUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    budgetExtras: {
      type: [budgetExtraSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "planning", "ongoing", "completed", "cancelled"],
      default: "draft",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    vendors: {
      type: [eventVendorSchema],
      default: [],
    },
    timeline: {
      type: [timelineSchema],
      default: [],
    },
    notes: {
      type: [noteSchema],
      default: [],
    },
    files: {
      type: [String],
      default: [],
    },
    posterSlug: {
      type: String,
      default: undefined,
      index: true,
      unique: true,
      sparse: true,
    },
    poster: {
      type: posterSchema,
      default: () => ({}),
    },
    privateGuestList: {
      type: [String],
      default: [],
    },
    invitationCard: {
      type: invitationCardSchema,
      default: () => ({}),
    },
    clientChecklist: {
      type: [clientChecklistItemSchema],
      default: [],
    },
    photoShareToken: {
      type: String,
      default: "",
    },
    photoShareActive: {
      type: Boolean,
      default: false,
    },
    photoShareStartedAt: {
      type: Date,
    },
    guestPhotos: {
      type: [
        {
          relativePath: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    photoZipLastEmailedAt: {
      type: Date,
    },
    postClosureLocked: {
      type: Boolean,
      default: false,
    },
    /** Client tapped Pay now — settlement recorded (simulated). */
    settlementPaidAt: {
      type: Date,
      default: null,
    },
    /** Public stall marketplace (requires isPublic). */
    stallsEnabled: {
      type: Boolean,
      default: false,
    },
    stallCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stallLayoutImage: {
      type: String,
      default: "",
    },
    stallBookingOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
