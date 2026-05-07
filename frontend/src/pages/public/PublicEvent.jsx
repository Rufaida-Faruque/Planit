import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../api/axios";

function resolvePosterBannerSrc(url) {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("http")) return u;
  const base =
    String(axios.defaults.baseURL || "").replace(/\/api\/?$/, "") ||
    "http://localhost:5000";
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}

const PublicEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadPublicEvent();
  }, [eventId]);

  const loadPublicEvent = async () => {
    try {
      const res = await axios.get(`/public/${eventId}`);
      setEvent(res.data);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!form.name || !form.email) {
      alert("Name and email required");
      return;
    }
    try {
      await axios.post(`/public/${eventId}/signup/send-otp`, form);
      navigate(`/public/${eventId}/verify`, {
        state: { email: form.email },
      });
    } catch (error) {
      alert(error?.response?.data?.message || "Send OTP failed");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!event) return <p>Public event not found.</p>;

  const bannerSrc = resolvePosterBannerSrc(event.poster?.bannerImage);

  return (
    <div style={{ maxWidth: "740px", margin: "30px auto", padding: "16px" }}>
      <h1>{event.poster?.eventTitle || event.title}</h1>
      <p>{event.poster?.description || event.description}</p>
      {bannerSrc ? (
        <img
          src={bannerSrc}
          alt="poster banner"
          style={{ width: "100%", borderRadius: "12px", marginBottom: "12px" }}
        />
      ) : null}
      <p>
        Date:{" "}
        {new Date(event.poster?.date || event.date).toLocaleDateString()}
      </p>
      <p>Venue: {event.poster?.venue || event.location}</p>
      {event.poster?.time && <p>Time: {event.poster.time}</p>}
      {event.poster?.highlights?.length > 0 && (
        <div>
          <h4>Highlights</h4>
          {event.poster.highlights.map((item, idx) => (
            <p key={`h-${idx}`}>- {item}</p>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Join This Event</h3>
        {event.poster?.signupOpen === false && (
          <p>Signup is currently closed.</p>
        )}
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <button onClick={sendOtp} disabled={event.poster?.signupOpen === false}>
          Send OTP
        </button>
      </div>
    </div>
  );
};

export default PublicEvent;
