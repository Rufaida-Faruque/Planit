// // import Portfolio from "../models/portfolio.model.js";

// // // CREATE OR UPDATE
// // export const savePortfolio = async (req, res) => {
// //   try {
// //     const vendorId = req.user.id; // from auth middleware

// //     const { displayName, categories, location, logo, content } = req.body;

// //     let portfolio = await Portfolio.findOne({ vendorId });

// //     if (portfolio) {
// //       // UPDATE
// //       portfolio.displayName = displayName;
// //       portfolio.categories = categories;
// //       portfolio.location = location;
// //       portfolio.logo = logo;
// //       portfolio.content = content;
// //       portfolio.isPublished = true;

// //       await portfolio.save();
// //     } else {
// //       // CREATE
// //       portfolio = await Portfolio.create({
// //         vendorId,
// //         displayName,
// //         categories,
// //         location,
// //         logo,
// //         content,
// //       });
// //     }

// //     res.json(portfolio);

// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ message: "Error saving portfolio" });
// //   }
// // };

// // // GET OWN PORTFOLIO
// // export const getMyPortfolio = async (req, res) => {
// //   try {
// //     const vendorId = req.user.id;

// //     const portfolio = await Portfolio.findOne({ vendorId });

// //     res.json(portfolio);

// //   } catch (err) {
// //     res.status(500).json({ message: "Error fetching portfolio" });
// //   }
// // };

// // // GET PUBLIC PORTFOLIO
// // export const getPortfolioByVendor = async (req, res) => {
// //   try {
// //     const { vendorId } = req.params;

// //     const portfolio = await Portfolio.findOne({
// //       vendorId,
// //       isPublished: true,
// //     });

// //     res.json(portfolio);

// //   } catch (err) {
// //     res.status(500).json({ message: "Error fetching portfolio" });
// //   }
// // };

// // // DELETE (SOFT)
// // export const deletePortfolio = async (req, res) => {
// //   try {
// //     const vendorId = req.user.id;

// //     const portfolio = await Portfolio.findOne({ vendorId });

// //     if (!portfolio) {
// //       return res.status(404).json({ message: "Not found" });
// //     }

// //     portfolio.isPublished = false;
// //     await portfolio.save();

// //     res.json({ message: "Portfolio hidden" });

// //   } catch (err) {
// //     res.status(500).json({ message: "Error deleting portfolio" });
// //   }
// // };

// // // RESTORE
// // export const restorePortfolio = async (req, res) => {
// //   try {
// //     const vendorId = req.user.id;

// //     const portfolio = await Portfolio.findOne({ vendorId });

// //     if (!portfolio) {
// //       return res.status(404).json({ message: "Not found" });
// //     }

// //     portfolio.isPublished = true;
// //     await portfolio.save();

// //     res.json({ message: "Portfolio restored" });

// //   } catch (err) {
// //     res.status(500).json({ message: "Error restoring portfolio" });
// //   }
// // };







// import Portfolio from "../models/portfolio.model.js";
// import Verification from "../models/verification.model.js";

// // ================= CREATE OR UPDATE =================
// export const savePortfolio = async (req, res) => {
//   try {
//     const vendorId = req.user.id;

//     const { displayName, categories, location, logo, content } = req.body;

//     let portfolio = await Portfolio.findOne({ vendorId });

//     if (portfolio) {
//       // UPDATE
//       portfolio.displayName = displayName;
//       portfolio.categories = categories;
//       portfolio.location = location;
//       portfolio.logo = logo;
//       portfolio.content = content;
//       portfolio.isPublished = true;

//       await portfolio.save();
//     } else {
//       // CREATE
//       portfolio = await Portfolio.create({
//         vendorId,
//         displayName,
//         categories,
//         location,
//         logo,
//         content,
//         isPublished: true,
//       });
//     }

//     res.json(portfolio);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error saving portfolio" });
//   }
// };

// // ================= GET OWN PORTFOLIO =================
// export const getMyPortfolio = async (req, res) => {
//   try {
//     const vendorId = req.user.id;

//     const portfolio = await Portfolio.findOne({ vendorId });

//     res.json(portfolio);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching portfolio" });
//   }
// };

// // ================= GET SINGLE PUBLIC PORTFOLIO =================
// export const getPortfolioByVendor = async (req, res) => {
//   try {
//     const { vendorId } = req.params;

//     const portfolio = await Portfolio.findOne({
//       vendorId,
//       isPublished: true,
//     });

//     res.json(portfolio);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching portfolio" });
//   }
// };

// // // ================= BROWSE ALL VENDORS =================
// // // Only published + verified vendors
// // export const browsePortfolios = async (req, res) => {
// //   try {
// //     const approved = await Verification.find({
// //       status: "approved",
// //     });

// //     const ids = approved.map(
// //       (item) =>
// //         item.vendorId ||
// //         item.vendor ||
// //         item.userId
// //     );

// //     const portfolios = await Portfolio.find({
// //       isPublished: true,
// //       vendorId: { $in: ids },
// //     });

// //     res.json(portfolios);
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({
// //       message: "Error fetching vendors",
// //     });
// //   }
// // };

// export const browsePortfolios = async (req, res) => {
//   try {
//     const verifiedVendors = await Verification.find({
//       status: "approved",
//     }).select("vendorId");

//     const vendorIds = verifiedVendors.map((v) => v.vendorId);

//     const portfolios = await Portfolio.find({
//       vendorId: { $in: vendorIds },
//       isPublished: true,
//     });

//     res.json(portfolios);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error browsing vendors" });
//   }
// };

// // ================= DELETE (SOFT HIDE) =================
// export const deletePortfolio = async (req, res) => {
//   try {
//     const vendorId = req.user.id;

//     const portfolio = await Portfolio.findOne({ vendorId });

//     if (!portfolio) {
//       return res.status(404).json({ message: "Not found" });
//     }

//     portfolio.isPublished = false;
//     await portfolio.save();

//     res.json({ message: "Portfolio hidden" });
//   } catch (err) {
//     res.status(500).json({ message: "Error deleting portfolio" });
//   }
// };

// // ================= RESTORE =================
// export const restorePortfolio = async (req, res) => {
//   try {
//     const vendorId = req.user.id;

//     const portfolio = await Portfolio.findOne({ vendorId });

//     if (!portfolio) {
//       return res.status(404).json({ message: "Not found" });
//     }

//     portfolio.isPublished = true;
//     await portfolio.save();

//     res.json({ message: "Portfolio restored" });
//   } catch (err) {
//     res.status(500).json({ message: "Error restoring portfolio" });
//   }
// };


import mongoose from "mongoose";
import Portfolio from "../models/portfolio.model.js";
import Verification from "../models/verification.model.js";
import VendorReview from "../models/vendorReview.model.js";
import {
  getVendorDateBookingCounts,
  getVenueBookingCountsGroupedByVendor,
} from "../utils/vendorAvailabilityBookingCounts.js";

export const savePortfolio = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const existing = await Portfolio.findOne({ vendorId });

    const {
      displayName,
      category,
      location,
      logo,
      content,
      availabilityOptions,
      availabilityCalendar,
      venueServices,
      cateringServices,
      photographyServices,
      decorationServices,
    } = req.body;

    const updatePayload = {
      vendorId,
      displayName: displayName ?? existing?.displayName ?? "Vendor",
      category: category ?? existing?.category ?? "venue",
      location: location ?? existing?.location ?? "",
      logo: logo ?? existing?.logo ?? "",
      content: Array.isArray(content)
        ? content
        : existing?.content || [],
      availabilityOptions:
        Array.isArray(availabilityOptions)
          ? availabilityOptions
          : existing?.availabilityOptions || [],
      availabilityCalendar: Array.isArray(
        availabilityCalendar
      )
        ? availabilityCalendar
        : existing?.availabilityCalendar || [],
      venueServices:
        venueServices !== undefined && typeof venueServices === "object"
          ? venueServices
          : existing?.venueServices || { halls: [] },
      cateringServices:
        cateringServices !== undefined &&
        typeof cateringServices === "object"
          ? cateringServices
          : existing?.cateringServices || {},
      photographyServices:
        photographyServices !== undefined &&
        typeof photographyServices === "object"
          ? photographyServices
          : existing?.photographyServices || {},
      decorationServices:
        decorationServices !== undefined &&
        typeof decorationServices === "object"
          ? decorationServices
          : existing?.decorationServices || {},
      isPublished: true,
    };

    const portfolio =
      await Portfolio.findOneAndUpdate(
        { vendorId },
        updatePayload,
        {
          upsert: true,
          new: true,
        }
      );

    res.json(portfolio);
  } catch {
    res.status(500).json({
      message: "Save failed",
    });
  }
};

export const getMyPortfolio = async (req, res) => {
  const data = await Portfolio.findOne({
    vendorId: req.user.id,
  });
  if (!data) {
    return res.json(null);
  }
  const vid = new mongoose.Types.ObjectId(req.user.id);
  const agg = await VendorReview.aggregate([
    { $match: { vendorId: vid } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);
  const reviews = await VendorReview.find({
    vendorId: req.user.id,
  })
    .populate("clientId", "name")
    .populate("eventId", "title date")
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();
  const stats = agg[0] || { averageRating: null, reviewCount: 0 };

  const availabilityBookingsByDate = await getVendorDateBookingCounts(
    req.user.id
  );
  return res.json({
    ...data.toObject(),
    availabilityBookingsByDate,
    reviewStats: {
      averageRating:
        stats.averageRating != null
          ? Math.round(stats.averageRating * 10) / 10
          : null,
      reviewCount: stats.reviewCount || 0,
    },
    reviews,
  });
};

export const getPortfolioByVendor = async (req, res) => {
  try {
    const data = await Portfolio.findOne({
      vendorId: req.params.vendorId,
      isPublished: true,
    });

    if (!data) {
      return res.json(null);
    }

    const vid = new mongoose.Types.ObjectId(req.params.vendorId);
    const agg = await VendorReview.aggregate([
      { $match: { vendorId: vid } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const reviews = await VendorReview.find({
      vendorId: req.params.vendorId,
    })
      .populate("clientId", "name")
      .populate("eventId", "title date")
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();

    const stats = agg[0] || { averageRating: null, reviewCount: 0 };

    const availabilityBookingsByDate = await getVendorDateBookingCounts(
      req.params.vendorId
    );

    return res.json({
      ...data.toObject(),
      availabilityBookingsByDate,
      reviewStats: {
        averageRating:
          stats.averageRating != null
            ? Math.round(stats.averageRating * 10) / 10
            : null,
        reviewCount: stats.reviewCount || 0,
      },
      reviews,
    });
  } catch {
    return res.status(500).json({ message: "Error fetching portfolio" });
  }
};

export const browsePortfolios = async (
  req,
  res
) => {
  const approved =
    await Verification.find({
      status: "approved",
    });

  const ids = approved.map((v) => v.vendor?.toString());

  const data = await Portfolio.find({
    vendorId: { $in: ids },
    isPublished: true,
  });

  const bookedByVendor = await getVenueBookingCountsGroupedByVendor();

  const enriched = data.map((p) => {
    const o = p.toObject();
    const vid = o.vendorId?.toString?.();
    o.availabilityBookingsByDate =
      vid && bookedByVendor[vid] ? bookedByVendor[vid] : {};
    return o;
  });

  res.json(enriched);
};

export const deletePortfolio = async (
  req,
  res
) => {
  await Portfolio.findOneAndUpdate(
    { vendorId: req.user.id },
    { isPublished: false }
  );

  res.json({
    message: "Hidden",
  });
};

export const restorePortfolio = async (
  req,
  res
) => {
  await Portfolio.findOneAndUpdate(
    { vendorId: req.user.id },
    { isPublished: true }
  );

  res.json({
    message: "Restored",
  });
};

export const updatePortfolioAvailability =
  async (req, res) => {
    try {
      const vendorId = req.user.id;
      const { availabilityCalendar } = req.body;

      if (!Array.isArray(availabilityCalendar)) {
        return res.status(400).json({
          message:
            "availabilityCalendar must be an array",
        });
      }

      const data =
        await Portfolio.findOneAndUpdate(
          { vendorId },
          {
            availabilityCalendar:
              availabilityCalendar.map((item) => ({
                date: item.date,
                slots: Number(item.slots || 0),
              })),
          },
          { new: true }
        );

      if (!data) {
        return res.status(404).json({
          message:
            "Please create portfolio first",
        });
      }

      const availabilityBookingsByDate = await getVendorDateBookingCounts(
        vendorId
      );
      return res.json({
        ...data.toObject(),
        availabilityBookingsByDate,
      });
    } catch {
      return res.status(500).json({
        message: "Save availability failed",
      });
    }
  };