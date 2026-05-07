// import User from "../models/user.model.js";

// // ⭐ TOGGLE STAR
// export const toggleStarVendor = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { vendorId } = req.params;

//     const user = await User.findById(userId);

//     const exists = user.starredVendors.includes(vendorId);

//     if (exists) {
//       user.starredVendors = user.starredVendors.filter(
//         (id) => id.toString() !== vendorId
//       );
//     } else {
//       user.starredVendors.push(vendorId);
//     }

//     await user.save();

//     res.json(user.starredVendors);

//   } catch (err) {
//     res.status(500).json({ message: "Star error" });
//   }
// };

// // ⭐ GET STARRED
// export const getStarredVendors = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id)
//       .populate("starredVendors");

//     res.json(user.starredVendors);

//   } catch (err) {
//     res.status(500).json({ message: "Error fetching stars" });
//   }
// };






import User from "../models/user.model.js";
import Portfolio from "../models/portfolio.model.js";

const getStarredPayload = async (user) => {
  const rawIds = user.starredVendors || [];
  const ids = rawIds.map((id) => id.toString());
  const uniqueIds = [...new Set(ids)];

  const vendors = await User.find({
    _id: { $in: uniqueIds },
  }).select("name email role");

  const portfolios = await Portfolio.find({
    vendorId: { $in: uniqueIds },
    isPublished: true,
  });

  const vendorMap = new Map(
    vendors.map((item) => [item._id.toString(), item])
  );
  const portfolioMap = new Map(
    portfolios.map((item) => [
      item.vendorId.toString(),
      item,
    ])
  );

  return uniqueIds.map((vendorId) => {
    const meta =
      user.starredVendorsMeta?.find(
        (item) =>
          item.vendorId?.toString() === vendorId
      ) || null;

    return {
      vendorId,
      addedAt: meta?.starredAt || null,
      vendor: vendorMap.get(vendorId) || null,
      portfolio: portfolioMap.get(vendorId) || null,
    };
  });
};

// ⭐ TOGGLE STAR
export const toggleStarVendor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { vendorId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const exists = user.starredVendors.some(
      (id) => id.toString() === vendorId
    );

    if (exists) {
      user.starredVendors =
        user.starredVendors.filter(
          (id) => id.toString() !== vendorId
        );
      user.starredVendorsMeta =
        (user.starredVendorsMeta || []).filter(
          (item) =>
            item.vendorId?.toString() !== vendorId
        );
    } else {
      user.starredVendors.push(vendorId);
      const hasMeta =
        user.starredVendorsMeta?.some(
          (item) =>
            item.vendorId?.toString() === vendorId
        );

      if (!hasMeta) {
        user.starredVendorsMeta =
          user.starredVendorsMeta || [];
        user.starredVendorsMeta.push({
          vendorId,
          starredAt: new Date(),
        });
      }
    }

    await user.save();

    const payload = await getStarredPayload(user);
    res.json(payload);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Star error",
    });
  }
};

// ⭐ GET STARRED
export const getStarredVendors = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const payload = await getStarredPayload(user);
    res.json(payload);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Error fetching stars",
    });
  }
};