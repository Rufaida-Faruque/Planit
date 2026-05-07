import { useMemo, useEffect } from "react";
import { computeExpectedCost } from "../../utils/computeServiceCost";
import {
  localTodayIso,
  venueCalendarStrictMode,
  buildVenueOpenDayRows,
} from "../../utils/venueAvailability.js";

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const PHOTOBOOTH_WINDOW_SHAPE_OPTIONS = ["Square", "Rectangle", "Circle"];
const PHOTOBOOTH_WINDOW_POSITION_OPTIONS = ["Center", "Left", "Right"];
const PHOTOBOOTH_WRITING_POSITION_OPTIONS = [
  "Top",
  "Center",
  "Bottom",
  "Left side",
  "Right side",
  "Custom placement (describe below)",
];

const clampBoothFeet = (n) => {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return 8;
  return Math.min(20, Math.max(5, x));
};

const timeInput = (label, v, onUpdate) => (
  <label style={{ display: "block", marginBottom: "8px" }}>
    {label}
    <input
      type="time"
      value={v}
      onChange={(e) => onUpdate(e.target.value)}
      style={{ marginLeft: "8px" }}
    />
  </label>
);

export default function ServiceSelectionPanel({
  category,
  portfolio,
  value = {},
  onChange,
  defaultEventDate = "",
}) {
  const set = (patch) => onChange({ ...value, ...patch });

  const expected = useMemo(
    () => computeExpectedCost(category, portfolio, value),
    [category, portfolio, value]
  );

  const venueOpenDayRows = useMemo(
    () =>
      category === "venue" && portfolio
        ? buildVenueOpenDayRows(portfolio)
        : [],
    [category, portfolio]
  );
  const venueStrictCalendar = useMemo(
    () => (portfolio ? venueCalendarStrictMode(portfolio) : false),
    [portfolio]
  );

  useEffect(() => {
    if (!portfolio || category !== "venue") return;
    const halls = portfolio.venueServices?.halls || [];
    const hall = halls.find((h) => String(h._id) === String(value.hallId));
    if (!hall) return;
    if (!venueCalendarStrictMode(portfolio)) return;
    const openRows = buildVenueOpenDayRows(portfolio);
    if (!openRows.length) return;
    if (openRows.some((r) => r.date === value.date)) return;
    onChange({
      ...value,
      date: openRows[0].date,
      startTime: hall.operatingOpen || "09:00",
      endTime: hall.operatingClose || "22:00",
    });
  }, [
    portfolio,
    category,
    value.hallId,
    value.date,
    value,
    onChange,
  ]);

  useEffect(() => {
    if (!portfolio || category !== "photography") return;
    const packs = portfolio.photographyServices?.packages || [];
    if (!packs.length) return;

    const nextIdx = Number.isFinite(Number(value.packageIndex))
      ? Number(value.packageIndex)
      : 0;
    const safeIdx = nextIdx >= 0 && nextIdx < packs.length ? nextIdx : 0;
    const selected = packs[safeIdx];
    const minHours = Math.max(1, Number(selected?.minimumHour || 1));
    const hasHours = Number(value.hours || 0) > 0;

    if (safeIdx !== Number(value.packageIndex) || !hasHours) {
      onChange({
        ...value,
        packageIndex: safeIdx,
        hours: hasHours ? Number(value.hours) : minHours,
      });
    }
  }, [portfolio, category, value.packageIndex, value.hours, onChange]);

  if (!portfolio) {
    return <p style={{ color: "#666" }}>Select a vendor to configure services.</p>;
  }

  if (category === "venue") {
    const halls = portfolio.venueServices?.halls || [];
    const hall =
      halls.find((h) => String(h._id) === String(value.hallId)) || null;
    const canFlat = hall && Number(hall.flatSessionPrice) > 0;
    const canHour = hall && Number(hall.hourlyRate) > 0;
    const useCalendarDates = venueStrictCalendar;
    const noOpenDays =
      useCalendarDates && venueOpenDayRows.length === 0;
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "12px",
          maxWidth: "520px",
        }}
      >
        <h4 style={{ margin: "0 0 8px" }}>Venue booking</h4>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Hall / space
          <select
            value={value.hallId || ""}
            onChange={(e) => {
              const h = halls.find(
                (x) => String(x._id) === String(e.target.value)
              );
              const openRows = buildVenueOpenDayRows(portfolio);
              const strict = venueCalendarStrictMode(portfolio);
              let nextDate = value.date || defaultEventDate || localTodayIso();
              if (strict && openRows.length > 0) {
                nextDate = openRows.some((r) => r.date === nextDate)
                  ? nextDate
                  : openRows[0].date;
              } else if (strict && openRows.length === 0) {
                nextDate = value.date || defaultEventDate || localTodayIso();
              }
              set({
                hallId: e.target.value,
                hallLabel: h?.name || "",
                priceMode:
                  h && Number(h.flatSessionPrice) > 0 && !Number(h.hourlyRate)
                    ? "flat"
                    : "hourly",
                date: nextDate,
                startTime: h?.operatingOpen || "09:00",
                endTime: h?.operatingClose || "22:00",
              });
            }}
            style={{ display: "block", width: "100%", marginTop: "4px" }}
          >
            <option value="">Select hall</option>
            {halls.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
                {h.location ? ` — ${h.location}` : ""}
              </option>
            ))}
          </select>
        </label>
        {hall && (
          <p style={{ fontSize: "13px", color: "#555" }}>
            {hall.facilities?.length
              ? `Facilities: ${hall.facilities.join(", ")}`
              : "Add facilities in vendor services."}
            <br />
            {hall.operatingOpen && hall.operatingClose
              ? `Typical hours: ${hall.operatingOpen} – ${hall.operatingClose}`
              : null}
          </p>
        )}
        {useCalendarDates ? (
          <>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Available day (from vendor calendar)
              {noOpenDays ? (
                <p style={{ margin: "6px 0 0", color: "#b45309", fontSize: "13px" }}>
                  No open slots on upcoming calendar days — everything listed is
                  booked or set to 0 slots. Ask the vendor to add days or free
                  capacity, or pick another vendor.
                </p>
              ) : (
                <select
                  value={
                    venueOpenDayRows.some((r) => r.date === value.date)
                      ? value.date
                      : venueOpenDayRows[0]?.date || ""
                  }
                  onChange={(e) => {
                    const picked = e.target.value;
                    set({
                      date: picked,
                      startTime: hall?.operatingOpen || "09:00",
                      endTime: hall?.operatingClose || "22:00",
                    });
                  }}
                  disabled={!hall || noOpenDays}
                  style={{ display: "block", width: "100%", marginTop: "4px" }}
                >
                  {venueOpenDayRows.map((r) => (
                    <option key={r.date} value={r.date}>
                      {r.date} — {r.remaining} open · {r.booked} booked ·{" "}
                      {r.total} total slots
                    </option>
                  ))}
                </select>
              )}
            </label>
          </>
        ) : (
          <label style={{ display: "block", marginBottom: "8px" }}>
            Event date
            <input
              type="date"
              value={value.date || defaultEventDate || localTodayIso()}
              min={localTodayIso()}
              onChange={(e) =>
                set({
                  date: e.target.value,
                  startTime: hall?.operatingOpen || value.startTime || "09:00",
                  endTime: hall?.operatingClose || value.endTime || "17:00",
                })
              }
              style={{ display: "block", marginTop: "4px" }}
            />
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              This vendor has not published upcoming day slots on their calendar
              — pick any future date; times snap to hall hours when possible.
            </span>
          </label>
        )}
        {timeInput("Start", value.startTime || hall?.operatingOpen || "09:00", (v) =>
          set({ startTime: v })
        )}
        {timeInput("End", value.endTime || hall?.operatingClose || "17:00", (v) =>
          set({ endTime: v })
        )}
        {canFlat && canHour && (
          <label style={{ display: "block", marginBottom: "8px" }}>
            Pricing
            <select
              value={value.priceMode || "flat"}
              onChange={(e) => set({ priceMode: e.target.value })}
              style={{ display: "block", marginTop: "4px" }}
            >
              <option value="flat">Flat session</option>
              <option value="hourly">Hourly</option>
            </select>
          </label>
        )}
        <p style={{ marginTop: "10px", fontWeight: 600 }}>
          Expected cost: {expected.toLocaleString()}
        </p>
      </div>
    );
  }

  if (category === "catering") {
    const cs = portfolio.cateringServices || {};
    const pkgs = cs.packages || [];
    const items = cs.menuItems || [];
    const mode = value.mode || "package";
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "12px",
          maxWidth: "520px",
        }}
      >
        <h4 style={{ margin: "0 0 8px" }}>Catering</h4>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Menu type
          <select
            value={mode}
            onChange={(e) => set({ mode: e.target.value })}
            style={{ display: "block", marginTop: "4px" }}
          >
            <option value="package">Set package</option>
            {cs.allowCustomMenu !== false && (
              <option value="custom">Build your menu (à la carte)</option>
            )}
          </select>
        </label>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Guest count
          <input
            type="number"
            min="1"
            value={value.guestCount || 50}
            onChange={(e) =>
              set({ guestCount: Math.max(1, Number(e.target.value || 1)) })
            }
            style={{ display: "block", marginTop: "4px" }}
          />
        </label>
        {mode === "package" && (
          <label style={{ display: "block", marginBottom: "8px" }}>
            Package
            <select
              value={value.packageIndex ?? 0}
              onChange={(e) =>
                set({ packageIndex: Number(e.target.value) })
              }
              style={{ display: "block", marginTop: "4px" }}
            >
              {pkgs.map((p, i) => (
                <option key={i} value={i}>
                  {p.name} — {Number(p.pricePerPerson || 0)}/person (min{" "}
                  {p.minGuests || 1})
                </option>
              ))}
            </select>
          </label>
        )}
        {mode === "custom" && (
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ fontSize: "13px" }}>Pick dishes (per-person pricing × guests)</strong>
            {items.map((it, i) => (
              <label
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  checked={(value.menuItemIndices || []).includes(i)}
                  onChange={(e) => {
                    const cur = new Set(value.menuItemIndices || []);
                    if (e.target.checked) cur.add(i);
                    else cur.delete(i);
                    set({ menuItemIndices: [...cur] });
                  }}
                />
                <span>
                  {it.name}{" "}
                  <span style={{ color: "#666" }}>
                    ({it.section}) — {Number(it.pricePerPerson || 0)}/person
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        <p style={{ marginTop: "10px", fontWeight: 600 }}>
          Expected cost: {expected.toLocaleString()}
        </p>
      </div>
    );
  }

  if (category === "photography") {
    const ps = portfolio.photographyServices || {};
    const packs = ps.packages || [];
    const selectedIdx = Number(value.packageIndex ?? 0);
    const selectedPack = packs[selectedIdx] || null;
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "12px",
          maxWidth: "520px",
        }}
      >
        <h4 style={{ margin: "0 0 8px" }}>Photography</h4>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Package
          <select
            value={value.packageIndex ?? 0}
            onChange={(e) =>
              set({
                packageIndex: Number(e.target.value),
                hours: undefined,
              })
            }
            style={{ display: "block", marginTop: "4px" }}
          >
            {packs.map((p, i) => (
              <option key={i} value={i}>
                {p.name} — {Number(p.hourRate || 0)}/h (min {Number(p.minimumHour || 1)}h)
              </option>
            ))}
          </select>
        </label>
        {selectedPack && (
          <>
            <p style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
              {selectedPack.facilities?.length
                ? `Facilities: ${selectedPack.facilities.join(", ")}`
                : "No facilities listed yet."}
            </p>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Coverage hours
              <input
                type="number"
                min={Math.max(1, Number(selectedPack.minimumHour || 1))}
                step="0.5"
                value={value.hours || Number(selectedPack.minimumHour || 1)}
                onChange={(e) =>
                  set({
                    hours: Math.max(
                      Number(selectedPack.minimumHour || 1),
                      Number(e.target.value || selectedPack.minimumHour || 1)
                    ),
                  })
                }
                style={{ display: "block", marginTop: "4px" }}
              />
              <span style={{ fontSize: "12px", color: "#666" }}>
                Rate {Number(selectedPack.hourRate || 0)}/h · minimum {Number(selectedPack.minimumHour || 1)}h
              </span>
              <br />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                Hour rate means price per hour. Minimum hour is the minimum billable duration for this package.
              </span>
            </label>
          </>
        )}
        <p style={{ marginTop: "10px", fontWeight: 600 }}>
          Expected cost: {expected.toLocaleString()}
        </p>
      </div>
    );
  }

  if (category === "decoration") {
    const ds = portfolio.decorationServices || {};
    const packs = ds.packages || [];
    const singleItems = ds.singleItems || ds.galleryItems || [];
    const booth = ds.photobooth || {};
    const mode =
      value.mode ||
      (packs.length
        ? "package"
        : singleItems.length
        ? "single_item"
        : "custom_photobooth");
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "12px",
          maxWidth: "560px",
        }}
      >
        <h4 style={{ margin: "0 0 8px" }}>Decoration</h4>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Selection type
          <select
            value={mode}
            onChange={(e) => set({ mode: e.target.value })}
            style={{ display: "block", marginTop: "4px" }}
          >
            {packs.length > 0 && <option value="package">Package rental</option>}
            {singleItems.length > 0 && (
              <option value="single_item">Rent single item</option>
            )}
            {booth.enabled && (
              <option value="custom_photobooth">Custom photobooth request</option>
            )}
          </select>
        </label>
        {mode === "package" && packs.length > 0 && (
          <label style={{ display: "block", marginBottom: "8px" }}>
            Package
            <select
              value={value.packageIndex ?? 0}
              onChange={(e) =>
                set({ packageIndex: Number(e.target.value) })
              }
              style={{ display: "block", marginTop: "4px" }}
            >
              {packs.map((p, i) => (
                <option key={i} value={i}>
                  {p.name} — {Number(p.priceForRent || p.price || 0)}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              Fixed rent price for the full package.
            </span>
          </label>
        )}
        {mode === "single_item" && singleItems.length > 0 && (
          <>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Item
              <select
                value={value.singleItemIndex ?? 0}
                onChange={(e) =>
                  set({ singleItemIndex: Number(e.target.value) })
                }
                style={{ display: "block", marginTop: "4px" }}
              >
                {singleItems.map((it, i) => (
                  <option key={i} value={i}>
                    {it.name || it.title || `Item ${i + 1}`} · {Number(it.hourlyRate || it.price || 0)}/h (min {Number(it.minimumHour || 1)}h)
                  </option>
                ))}
              </select>
            </label>
            {singleItems[value.singleItemIndex ?? 0]?.imageUrl ? (
              <img
                src={
                  String(singleItems[value.singleItemIndex ?? 0].imageUrl || "").startsWith("http")
                    ? singleItems[value.singleItemIndex ?? 0].imageUrl
                    : `${apiOrigin}${singleItems[value.singleItemIndex ?? 0].imageUrl}`
                }
                alt={singleItems[value.singleItemIndex ?? 0].name || "Decoration item"}
                style={{
                  width: "140px",
                  height: "90px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  marginBottom: "8px",
                }}
              />
            ) : null}
            <label style={{ display: "block", marginBottom: "8px" }}>
              Rental hours
              <input
                type="number"
                min={Math.max(1, Number(singleItems[value.singleItemIndex ?? 0]?.minimumHour || 1))}
                step="0.5"
                value={value.singleItemHours || Number(singleItems[value.singleItemIndex ?? 0]?.minimumHour || 1)}
                onChange={(e) =>
                  set({
                    singleItemHours: Math.max(
                      Number(singleItems[value.singleItemIndex ?? 0]?.minimumHour || 1),
                      Number(e.target.value || 1)
                    ),
                  })
                }
                style={{ display: "block", marginTop: "4px" }}
              />
            </label>
          </>
        )}
        {mode === "custom_photobooth" && booth.enabled && (
          <>
            {booth.note ? (
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "0" }}>
                Vendor note: {booth.note}
              </p>
            ) : null}
            <label style={{ display: "block", marginBottom: "8px" }}>
              Cutout length (feet)
              <input
                type="number"
                min="5"
                max="20"
                step="0.5"
                value={value.photoboothLengthFt || 8}
                onChange={(e) => set({ photoboothLengthFt: clampBoothFeet(e.target.value) })}
                style={{ display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Cutout width (feet)
              <input
                type="number"
                min="5"
                max="20"
                step="0.5"
                value={value.photoboothWidthFt || 8}
                onChange={(e) => set({ photoboothWidthFt: clampBoothFeet(e.target.value) })}
                style={{ display: "block", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Window shape
              <select
                value={value.photoboothWindowShape || PHOTOBOOTH_WINDOW_SHAPE_OPTIONS[0]}
                onChange={(e) => set({ photoboothWindowShape: e.target.value })}
                style={{ display: "block", marginTop: "4px" }}
              >
                {PHOTOBOOTH_WINDOW_SHAPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Window position
              <select
                value={value.photoboothWindowPosition || PHOTOBOOTH_WINDOW_POSITION_OPTIONS[0]}
                onChange={(e) => set({ photoboothWindowPosition: e.target.value })}
                style={{ display: "block", marginTop: "4px" }}
              >
                {PHOTOBOOTH_WINDOW_POSITION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Primary color
              <input
                placeholder="e.g. White, Gold, #ffffff"
                value={value.photoboothColor || ""}
                onChange={(e) => set({ photoboothColor: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Writing / text on cutout
              <input
                placeholder="e.g. Rafi & Nila Wedding 2026"
                value={value.photoboothWriting || ""}
                onChange={(e) => set({ photoboothWriting: e.target.value })}
                style={{ display: "block", width: "100%", marginTop: "4px" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Writing position
              <select
                value={value.photoboothWritingPosition || PHOTOBOOTH_WRITING_POSITION_OPTIONS[0]}
                onChange={(e) => set({ photoboothWritingPosition: e.target.value })}
                style={{ display: "block", marginTop: "4px" }}
              >
                {PHOTOBOOTH_WRITING_POSITION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Customization details
              <textarea
                rows={3}
                placeholder="Describe exact writing placement, color shades, and any custom placement notes."
                value={value.photoboothCustomization || ""}
                onChange={(e) =>
                  set({ photoboothCustomization: e.target.value })
                }
                style={{ display: "block", width: "100%", marginTop: "4px" }}
              />
            </label>
            <div
              style={{
                margin: "12px 0",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: "#fafafa",
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Live booth preview</p>
              {(() => {
                const lengthFt = clampBoothFeet(value.photoboothLengthFt || 8);
                const widthFt = clampBoothFeet(value.photoboothWidthFt || 8);
                const dims = {
                  w: Math.round(120 + widthFt * 10),
                  h: Math.round(120 + lengthFt * 8),
                };
                const windowShape = value.photoboothWindowShape || PHOTOBOOTH_WINDOW_SHAPE_OPTIONS[0];
                const windowPosition =
                  value.photoboothWindowPosition || PHOTOBOOTH_WINDOW_POSITION_OPTIONS[0];
                const baseColor = (value.photoboothColor || "").trim() || "#dbeafe";
                const writingPosition =
                  value.photoboothWritingPosition || PHOTOBOOTH_WRITING_POSITION_OPTIONS[0];
                const shellStyle = {
                  width: `${dims.w}px`,
                  height: `${dims.h}px`,
                  borderRadius: "10px",
                  border: "2px solid #334155",
                  background: baseColor,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#111827",
                  overflow: "hidden",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                };
                const windowTop = "26%";
                const windowLeft =
                  windowPosition === "Left" ? "18%" : windowPosition === "Right" ? "58%" : "38%";
                const windowStyle = {
                  position: "absolute",
                  top: windowTop,
                  left: windowLeft,
                  width: windowShape === "Rectangle" ? "32%" : "27%",
                  height: "36%",
                  borderRadius: windowShape === "Circle" ? "999px" : "4px",
                  border: "2px dashed rgba(30,41,59,0.6)",
                  background: "rgba(255,255,255,0.45)",
                };
                const writingStyle = {
                  position: "absolute",
                  fontSize: "12px",
                  fontWeight: 700,
                  textShadow: "0 1px 2px rgba(255,255,255,0.8)",
                  maxWidth: "85%",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                };
                if (writingPosition === "Top") {
                  writingStyle.top = "8px";
                  writingStyle.left = "50%";
                  writingStyle.transform = "translateX(-50%)";
                } else if (writingPosition === "Center") {
                  writingStyle.top = "50%";
                  writingStyle.left = "50%";
                  writingStyle.transform = "translate(-50%, -50%)";
                } else if (writingPosition === "Left side") {
                  writingStyle.left = "8px";
                  writingStyle.top = "50%";
                  writingStyle.transform = "translateY(-50%)";
                } else if (writingPosition === "Right side") {
                  writingStyle.right = "8px";
                  writingStyle.top = "50%";
                  writingStyle.transform = "translateY(-50%)";
                } else {
                  writingStyle.bottom = "10px";
                  writingStyle.left = "50%";
                  writingStyle.transform = "translateX(-50%)";
                }
                return (
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={shellStyle}>
                      <div style={windowStyle} />
                      <span style={writingStyle}>
                        {(value.photoboothWriting || "Your booth writing").trim()}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#4b5563" }}>
                      <div>
                        Size: {lengthFt} ft x {widthFt} ft
                      </div>
                      <div>
                        Window: {windowShape} ({windowPosition})
                      </div>
                      <div>Color: {(value.photoboothColor || "Default blue").trim() || "Default blue"}</div>
                      <div>Writing position: {writingPosition}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <div
                style={{
                  marginTop: "6px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  color: "#3730a3",
                  fontSize: "12px",
                }}
              >
                Custom photobooth price is auto-calculated by area at $0.25 per sq ft.
              </div>
            </label>
          </>
        )}
        <p style={{ marginTop: "10px", fontWeight: 600 }}>
          Expected cost: {expected.toLocaleString()}
        </p>
      </div>
    );
  }

  return null;
}
