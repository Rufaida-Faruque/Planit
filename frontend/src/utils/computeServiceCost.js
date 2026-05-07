import {
  venueCalendarStrictMode,
  buildVenueOpenDayRows,
} from "./venueAvailability.js";

/** Hours between HH:mm same day (handles overnight wrap loosely) */
export function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const [sh, sm = 0] = String(start)
    .split(":")
    .map((x) => Number(x));
  const [eh, em = 0] = String(end)
    .split(":")
    .map((x) => Number(x));
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let s = sh * 60 + sm;
  let e = eh * 60 + em;
  let diffMin = e - s;
  if (diffMin <= 0) diffMin += 24 * 60;
  return Math.round((diffMin / 60) * 100) / 100;
}

function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

const PHOTOBOOTH_RATE_PER_SQ_FT = 0.25;

const parseAmount = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const raw = String(v ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

/**
 * @param {string} category - photography | catering | decoration | venue
 * @param {object} portfolio - vendor portfolio from API
 * @param {object} sel - client selection payload
 */
export function computeExpectedCost(category, portfolio, sel) {
  if (!portfolio || !sel) return 0;
  const s = sel || {};

  if (category === "venue") {
    const halls = portfolio.venueServices?.halls || [];
    const hall =
      halls.find((h) => String(h._id) === String(s.hallId)) || null;
    if (!hall) return 0;
    if (venueCalendarStrictMode(portfolio)) {
      const open = buildVenueOpenDayRows(portfolio);
      const d = String(s.date || "").trim();
      if (!open.some((r) => r.date === d)) return 0;
    }
    const hrs = hoursBetween(s.startTime, s.endTime);
    const billable = Math.max(
      hrs || 0,
      Number(hall.minimumHours || 1)
    );
    const useHourly =
      s.priceMode === "hourly" ||
      (s.priceMode !== "flat" &&
        Number(hall.hourlyRate || 0) > 0 &&
        Number(hall.flatSessionPrice || 0) === 0);
    if (useHourly && Number(hall.hourlyRate || 0) > 0) {
      return roundMoney(billable * Number(hall.hourlyRate));
    }
    if (Number(hall.flatSessionPrice || 0) > 0) {
      return roundMoney(hall.flatSessionPrice);
    }
    if (Number(hall.hourlyRate || 0) > 0) {
      return roundMoney(billable * Number(hall.hourlyRate));
    }
    return 0;
  }

  if (category === "catering") {
    const cs = portfolio.cateringServices || {};
    const guests = Math.max(1, Number(s.guestCount || 50));
    const mode = s.mode || "package";
    if (mode === "package") {
      const pkg = cs.packages?.[Number(s.packageIndex ?? 0)];
      if (!pkg) return 0;
      const headcount = Math.max(guests, Number(pkg.minGuests || 1));
      return roundMoney(headcount * Number(pkg.pricePerPerson || 0));
    }
    if (mode === "custom") {
      const items = cs.menuItems || [];
      const idxs = Array.isArray(s.menuItemIndices)
        ? s.menuItemIndices.map(Number)
        : [];
      let perPersonSum = 0;
      idxs.forEach((i) => {
        const it = items[i];
        if (it) perPersonSum += Number(it.pricePerPerson || 0);
      });
      return roundMoney(perPersonSum * guests);
    }
    return 0;
  }

  if (category === "photography") {
    const ps = portfolio.photographyServices || {};
    const pkg = ps.packages?.[Number(s.packageIndex)];
    if (!pkg) {
      // Backward compatibility: old docs had top-level hourly/minimum fields.
      const topRate = parseAmount(ps.hourRate ?? ps.hourlyRate);
      const topMin = Math.max(1, parseAmount((ps.minimumHour ?? ps.minimumHours) || 1));
      const topHours = Math.max(topMin, parseAmount(s.hours || topMin));
      return topRate > 0 ? roundMoney(topHours * topRate) : 0;
    }
    const minH = Math.max(1, parseAmount((pkg.minimumHour ?? pkg.minimumHours) || 1));
    const h = Math.max(minH, Number(s.hours || minH));
    const hourRate = parseAmount(pkg.hourRate ?? pkg.hourlyRate);
    return roundMoney(h * hourRate);
  }

  if (category === "decoration") {
    const ds = portfolio.decorationServices || {};
    if (s.mode === "custom_photobooth" && ds.photobooth?.enabled) {
      const lengthFt = Math.max(5, Number(s.photoboothLengthFt || 8));
      const widthFt = Math.max(5, Number(s.photoboothWidthFt || 8));
      const areaSqFt = lengthFt * widthFt;
      return roundMoney(areaSqFt * PHOTOBOOTH_RATE_PER_SQ_FT);
    }
    if (s.mode === "package") {
      const pkg = ds.packages?.[Number(s.packageIndex)];
      if (!pkg) return 0;
      return roundMoney(Number(pkg.priceForRent || pkg.price || 0));
    }
    if (s.mode === "single_item") {
      const items = ds.singleItems || ds.galleryItems || [];
      const it = items[Number(s.singleItemIndex)];
      if (!it) return 0;
      const minH = Math.max(1, Number(it.minimumHour || 1));
      const h = Math.max(minH, Number(s.singleItemHours || minH));
      return roundMoney(h * Number(it.hourlyRate || it.price || 0));
    }
    return 0;
  }

  return 0;
}

export function summarizeSelection(category, portfolio, sel) {
  if (!sel) return "";
  if (category === "venue") {
    return `Venue ${sel.hallLabel || "hall"} · ${sel.date || ""} ${sel.startTime || ""}-${sel.endTime || ""}`;
  }
  if (category === "catering") {
    const mode = sel.mode || "package";
    return mode === "package"
      ? `Catering package · ${sel.guestCount || 0} guests`
      : `Custom menu · ${sel.guestCount || 0} guests`;
  }
  if (category === "photography") {
    const ps = portfolio?.photographyServices || {};
    const pkg = ps.packages?.[Number(sel.packageIndex)];
    const minH = Math.max(1, Number(pkg?.minimumHour || 1));
    const h = Math.max(minH, Number(sel.hours || minH));
    return `Photo ${pkg?.name || "package"} · ${h}h`;
  }
  if (category === "decoration") {
    if (sel.mode === "package") return "Decoration package rental";
    if (sel.mode === "single_item") return "Decoration single-item rental";
    if (sel.mode === "custom_photobooth") {
      const len = Number(sel.photoboothLengthFt || 0);
      const wid = Number(sel.photoboothWidthFt || 0);
      const bits = [
        "Custom photobooth",
        len > 0 && wid > 0 ? `size: ${len}ft x ${wid}ft` : "",
        sel.photoboothWindowShape || sel.photoboothWindowPosition
          ? `window: ${sel.photoboothWindowShape || "shape"} (${sel.photoboothWindowPosition || "position"})`
          : "",
        sel.photoboothColor ? `color: ${sel.photoboothColor}` : "",
        sel.photoboothWriting ? `writing: "${sel.photoboothWriting}"` : "",
        sel.photoboothWritingPosition ? `writing spot: ${sel.photoboothWritingPosition}` : "",
      ].filter(Boolean);
      return bits.join(" · ");
    }
    return "Decoration selection";
  }
  return "Service selection";
}
