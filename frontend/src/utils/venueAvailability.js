export function localTodayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Vendor has at least one calendar row on or after today. */
export function venueCalendarStrictMode(portfolio) {
  const cal = portfolio?.availabilityCalendar || [];
  if (!cal.length) return false;
  const today = localTodayIso();
  return cal.some((e) => String(e.date || "") >= today);
}

export function buildVenueOpenDayRows(portfolio) {
  const cal = portfolio?.availabilityCalendar || [];
  const booked = portfolio?.availabilityBookingsByDate || {};
  const today = localTodayIso();
  return cal
    .map((e) => {
      const date = String(e.date || "");
      const total = Math.max(0, Number(e.slots || 0));
      const b = Math.max(0, Number(booked[date] || 0));
      return { date, total, booked: b, remaining: Math.max(0, total - b) };
    })
    .filter((r) => r.date >= today && r.total > 0 && r.remaining > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** At least one upcoming calendar day with capacity and remaining slots (for venue booking). */
export function portfolioHasBookableVenueSlot(portfolio) {
  return buildVenueOpenDayRows(portfolio).length > 0;
}
