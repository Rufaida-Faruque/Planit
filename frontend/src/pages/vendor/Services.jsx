import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import VendorServiceCatalogEditor from "../../components/vendor/VendorServiceCatalogEditor.jsx";
import { localTodayIso } from "../../utils/venueAvailability.js";

const Services = () => {
  const [fullPortfolio, setFullPortfolio] = useState(null);
  const [portfolioExists, setPortfolioExists] =
    useState(true);
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const res = await axios.get("/portfolio/me");
      if (!res.data) {
        setPortfolioExists(false);
        setEntries([]);
        return;
      }
      setPortfolioExists(true);
      setFullPortfolio(res.data);
      setEntries(res.data.availabilityCalendar || []);
    } catch {
      setPortfolioExists(false);
      setFullPortfolio(null);
      setEntries([]);
    }
  };

  const addOrUpdateDate = () => {
    if (!date) {
      alert("Please pick a date");
      return;
    }

    const normalizedSlots = Number(slots);
    if (!Number.isFinite(normalizedSlots) || normalizedSlots < 0) {
      alert("Slots must be 0 or more");
      return;
    }

    setEntries((prev) => {
      const exists = prev.some((item) => item.date === date);
      if (exists) {
        return prev.map((item) =>
          item.date === date
            ? { ...item, slots: normalizedSlots }
            : item
        );
      }
      return [...prev, { date, slots: normalizedSlots }];
    });
  };

  const removeDate = (day) => {
    setEntries((prev) =>
      prev.filter((item) => item.date !== day)
    );
  };

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    [entries]
  );

  const today = localTodayIso();
  const upcomingEntries = useMemo(
    () => sortedEntries.filter((e) => e.date >= today),
    [sortedEntries, today]
  );
  const archivedEntries = useMemo(
    () => sortedEntries.filter((e) => e.date < today),
    [sortedEntries, today]
  );

  const bookingsByDate = fullPortfolio?.availabilityBookingsByDate || {};

  const saveAvailability = async () => {
    try {
      setSaving(true);
      const res = await axios.patch("/portfolio/availability", {
        availabilityCalendar: sortedEntries,
      });
      setFullPortfolio((prev) =>
        prev ? { ...prev, ...res.data } : res.data
      );
      setEntries(res.data.availabilityCalendar || []);
      alert("Availability saved");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Save availability failed"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      <h2>Services & Booking Availability</h2>

      {!portfolioExists && (
        <p>
          Please create your portfolio first before setting
          booking availability.
        </p>
      )}

      {portfolioExists && (
        <>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "16px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="number"
              min="0"
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
              placeholder="Slots"
            />
            <button
              type="button"
              onClick={addOrUpdateDate}
            >
              Add / Update Day
            </button>
          </div>

          {sortedEntries.length === 0 ? (
            <p>No availability dates added yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {upcomingEntries.length > 0 && (
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>
                    Upcoming days
                  </h3>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#555" }}>
                    Each day&apos;s <strong>slots</strong> is how many concurrent
                    bookings you allow. <strong>Booked</strong> counts active client
                    requests (not rejected) with that event date.
                  </p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {upcomingEntries.map((item) => {
                      const booked = Number(bookingsByDate[item.date] || 0);
                      const cap = Math.max(0, Number(item.slots || 0));
                      const open = Math.max(0, cap - booked);
                      return (
                        <div
                          key={item.date}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: "10px",
                            padding: "10px",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "center",
                          }}
                        >
                          <span>
                            <strong>{item.date}</strong> — capacity {cap} · booked{" "}
                            {booked} · open {open}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDate(item.date)}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {archivedEntries.length > 0 && (
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "#6b7280" }}>
                    Archived (past dates)
                  </h3>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#6b7280" }}>
                    These days are in the past. They stay listed until you remove
                    them; clients only see upcoming bookable days.
                  </p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {archivedEntries.map((item) => {
                      const booked = Number(bookingsByDate[item.date] || 0);
                      const cap = Math.max(0, Number(item.slots || 0));
                      return (
                        <div
                          key={item.date}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "10px",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "center",
                            background: "#f9fafb",
                            color: "#4b5563",
                          }}
                        >
                          <span>
                            {item.date} — was {cap} slots · {booked} booked
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDate(item.date)}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={saveAvailability}
            disabled={saving}
            style={{ marginTop: "16px" }}
          >
            {saving ? "Saving..." : "Save Availability"}
          </button>
        </>
      )}

      {portfolioExists && fullPortfolio && (
        <>
          <hr style={{ margin: "28px 0", borderColor: "#e5e7eb" }} />
          <VendorServiceCatalogEditor
            portfolio={fullPortfolio}
            onSaved={loadAvailability}
          />
        </>
      )}
    </div>
  );
};

export default Services;