import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../../api/axios";

const apiOrigin = () => {
  const base = axios.defaults.baseURL || "";
  return base.replace(/\/api\/?$/, "") || "http://localhost:5000";
};

export default function PublicStallBooking() {
  const { eventId } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    sellingDescription: "",
  });
  const [selectedStall, setSelectedStall] = useState(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const load = async () => {
    setErr("");
    try {
      const res = await axios.get(`/public/${eventId}/stalls/info`);
      setInfo(res.data);
    } catch (e) {
      setInfo(null);
      setErr(e?.response?.data?.message || "Could not load stall booking.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [eventId]);

  const layoutSrc = useMemo(() => {
    if (!info?.stallLayoutImage) return "";
    const p = info.stallLayoutImage;
    if (p.startsWith("http")) return p;
    return `${apiOrigin()}${p}`;
  }, [info?.stallLayoutImage]);

  const sendOtp = async () => {
    if (!selectedStall) {
      alert("Select a free stall number first.");
      return;
    }
    if (!form.name?.trim() || !form.email?.trim()) {
      alert("Name and email are required.");
      return;
    }
    if (!form.sellingDescription?.trim()) {
      alert("Describe what you will sell or offer at your stall.");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`/public/${eventId}/stalls/send-otp`, {
        ...form,
        stallNumber: selectedStall,
      });
      setStep(2);
      setOtp("");
    } catch (e) {
      alert(e?.response?.data?.message || "Could not send OTP");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`/public/${eventId}/stalls/verify`, {
        email: form.email,
        otp,
      });
      setDone(res.data);
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p style={{ margin: 24 }}>Loading…</p>;
  if (err || !info) {
    return (
      <div style={{ maxWidth: 560, margin: "24px auto", padding: 16 }}>
        <p style={{ color: "#b91c1c" }}>{err || "Unavailable"}</p>
      </div>
    );
  }

  if (!info.stallBookingOpen) {
    return (
      <div style={{ maxWidth: 560, margin: "24px auto", padding: 16 }}>
        <h2>{info.title}</h2>
        <p>Stall booking is closed for this event.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ maxWidth: 560, margin: "24px auto", padding: 16 }}>
        <h2>Booking confirmed</h2>
        <p>
          <strong>{done.name}</strong> — stall <strong>#{done.stallNumber}</strong>
        </p>
        <p style={{ color: "#15803d" }}>{done.message}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>{info.title}</h1>
      <p style={{ color: "#555" }}>
        Book a stall number for this event. Free stalls are grey; booked stalls are green. Verify your
        email with the OTP we send you.
      </p>

      {layoutSrc ? (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: "16px" }}>Stall layout</h3>
          <img
            src={layoutSrc}
            alt="Stall layout"
            style={{
              maxWidth: "100%",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          />
        </div>
      ) : (
        <p style={{ color: "#6b7280", marginBottom: 16 }}>
          No layout image — use the numbered list below to pick your stall.
        </p>
      )}

      <h3 style={{ fontSize: "16px" }}>Stalls</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {info.stalls.map((s) => {
          const isBooked = s.booked;
          const isSel = selectedStall === s.number;
          return (
            <button
              key={s.number}
              type="button"
              disabled={isBooked || step !== 1}
              onClick={() => setSelectedStall(s.number)}
              style={{
                padding: "12px 8px",
                borderRadius: 10,
                border: isSel ? "2px solid #2563eb" : "1px solid #e5e7eb",
                background: isBooked ? "#22c55e" : isSel ? "#eff6ff" : "#f9fafb",
                color: isBooked ? "#fff" : "#111",
                cursor: isBooked || step !== 1 ? "default" : "pointer",
                fontWeight: 600,
              }}
              title={
                isBooked
                  ? `${s.bookerName || "Booked"} — ${s.sellingDescription || ""}`
                  : `Stall ${s.number}`
              }
            >
              <div>#{s.number}</div>
              {isBooked && (
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 400,
                    marginTop: 4,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.bookerName || "Booked"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <div className="card" style={{ padding: 16, maxWidth: 480 }}>
          <h3 style={{ marginTop: 0 }}>Your details</h3>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            Selected stall:{" "}
            <strong>{selectedStall ? `#${selectedStall}` : "— click a grey cell above"}</strong>
          </p>
          <input
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ display: "block", width: "100%", marginBottom: 10 }}
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={{ display: "block", width: "100%", marginBottom: 10 }}
          />
          <input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={{ display: "block", width: "100%", marginBottom: 10 }}
          />
          <label style={{ display: "block", fontSize: "14px", marginBottom: 6 }}>
            What will you sell or offer at this stall?
          </label>
          <textarea
            rows={4}
            value={form.sellingDescription}
            onChange={(e) => setForm({ ...form, sellingDescription: e.target.value })}
            style={{ width: "100%", marginBottom: 12 }}
          />
          <button type="button" onClick={sendOtp} disabled={busy}>
            {busy ? "Sending…" : "Send OTP to email"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: 16, maxWidth: 480 }}>
          <h3 style={{ marginTop: 0 }}>Verify email</h3>
          <p style={{ fontSize: "14px" }}>Enter the OTP sent to {form.email}</p>
          <input
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={verify} disabled={busy}>
              {busy ? "Checking…" : "Confirm booking"}
            </button>
            <button type="button" onClick={() => setStep(1)} disabled={busy}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
