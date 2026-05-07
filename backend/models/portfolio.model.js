// import mongoose from "mongoose";

// const contentBlockSchema = new mongoose.Schema({
//   type: {
//     type: String,
//     enum: ["title", "text", "image"],
//     required: true,
//   },
//   value: String,
// });

// const portfolioSchema = new mongoose.Schema(
//   {
//     vendorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       unique: true, // one portfolio per vendor
//     },

//     displayName: {
//       type: String,
//       required: true,
//     },

//     categories: {
//       type: [String],
//       required: true,
//     },

//     location: {
//       type: String,
//       required: true,
//     },

//     logo: {
//       type: String,
//       default: "",
//     },

//     content: [contentBlockSchema],

//     isPublished: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   { timestamps: true }
// );

// const Portfolio = mongoose.model("Portfolio", portfolioSchema);

// export default Portfolio;

import mongoose from "mongoose";

const contentBlockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["title", "text", "image"],
    required: true,
  },
  value: String,
});

const availabilitySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    slots: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const venueHallSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "" },
    facilities: { type: [String], default: [] },
    flatSessionPrice: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    minimumHours: { type: Number, default: 1, min: 0 },
    operatingOpen: { type: String, default: "09:00" },
    operatingClose: { type: String, default: "22:00" },
    imageUrl: { type: String, default: "" },
  },
  { _id: true }
);

const portfolioSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    displayName: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["photography", "catering", "decoration", "venue"],
      required: true,
    },

    location: String,
    logo: String,
    content: [contentBlockSchema],
    availabilityOptions: {
      type: [String],
      default: [],
    },
    availabilityCalendar: {
      type: [availabilitySchema],
      default: [],
    },

    venueServices: {
      halls: { type: [venueHallSchema], default: [] },
    },
    cateringServices: {
      packages: {
        type: [
          {
            name: String,
            description: String,
            pricePerPerson: { type: Number, default: 0, min: 0 },
            minGuests: { type: Number, default: 1, min: 1 },
            menuHighlights: { type: [String], default: [] },
          },
        ],
        default: [],
      },
      menuItems: {
        type: [
          {
            name: String,
            section: String,
            pricePerPerson: { type: Number, default: 0, min: 0 },
          },
        ],
        default: [],
      },
      allowCustomMenu: { type: Boolean, default: true },
    },
    photographyServices: {
      packages: {
        type: [
          {
            name: String,
            facilities: { type: [String], default: [] },
            hourRate: { type: Number, default: 0, min: 0 },
            minimumHour: { type: Number, default: 1, min: 1 },
          },
        ],
        default: [],
      },
    },
    decorationServices: {
      packages: {
        type: [
          {
            name: String,
            inclusionPictures: { type: [String], default: [] },
            priceForRent: { type: Number, default: 0, min: 0 },
          },
        ],
        default: [],
      },
      singleItems: {
        type: [
          {
            name: String,
            imageUrl: String,
            hourlyRate: { type: Number, default: 0, min: 0 },
            minimumHour: { type: Number, default: 1, min: 1 },
          },
        ],
        default: [],
      },
      photobooth: {
        enabled: { type: Boolean, default: false },
        note: { type: String, default: "" },
      },
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Portfolio", portfolioSchema);