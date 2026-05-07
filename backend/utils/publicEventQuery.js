import mongoose from "mongoose";

/** Resolve public event by Mongo id or posterSlug (same as public signup). */
export const publicEventQuery = (idOrSlug) => {
  const or = [{ posterSlug: idOrSlug }];
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    or.push({ _id: idOrSlug });
  }
  return { isPublic: true, $or: or };
};
