export const CLIENT_MARKUP = 0.05;
export const VENDOR_CUT = 0.05;

export const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export const vendorCountsTowardBudget = (v) => {
  if (v.requestStatus === "accepted") return true;
  if (v.requestStatus === "pending" || v.requestStatus === "rejected") {
    return false;
  }
  return v.status === "accepted";
};

export const buildSettlementLines = (event) => {
  const hired = (event.vendors || []).filter(vendorCountsTowardBudget);
  const lines = hired.map((v) => {
    const gross = round2(v.offerAmount || 0);
    const vendorCommission = round2(gross * VENDOR_CUT);
    const vendorReceives = round2(gross * (1 - VENDOR_CUT));
    return {
      vendorId: v.vendorId?._id || v.vendorId,
      vendorName: v.vendorId?.name || "Vendor",
      offerAmount: gross,
      vendorCommission,
      vendorReceives,
    };
  });
  const baseTotal = round2(lines.reduce((s, l) => s + l.offerAmount, 0));
  const clientTotal = round2(baseTotal * (1 + CLIENT_MARKUP));
  const totalVendorPayouts = round2(
    lines.reduce((s, l) => s + l.vendorReceives, 0)
  );
  const adminCommission = round2(clientTotal - totalVendorPayouts);
  return {
    lines,
    baseTotal,
    clientTotal,
    totalVendorPayouts,
    adminCommission,
    clientMarkupRate: CLIENT_MARKUP,
    vendorCommissionRate: VENDOR_CUT,
  };
};
