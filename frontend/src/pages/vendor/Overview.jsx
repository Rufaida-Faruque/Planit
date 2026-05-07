import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";

const money = (n) => (Math.round(Number(n || 0) * 100) / 100).toLocaleString();

const Overview = () => {
  const [events, setEvents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [ratingStats, setRatingStats] = useState({
    averageRating: null,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const vendorId = user?._id;
        const reqs = [
          axios.get("/events/vendor/my-events"),
          axios.get("/messages/rooms"),
          axios.get("/notifications"),
        ];
        if (vendorId) reqs.push(axios.get(`/portfolio/${vendorId}`));

        const [eventsRes, roomsRes, notificationsRes, portfolioRes] = await Promise.all(reqs);
        setEvents(eventsRes?.data || []);
        setRooms(roomsRes?.data || []);
        setNotifications(notificationsRes?.data || []);
        if (portfolioRes?.data?.reviewStats) {
          setRatingStats({
            averageRating: portfolioRes.data.reviewStats.averageRating,
            reviewCount: portfolioRes.data.reviewStats.reviewCount || 0,
          });
        } else {
          setRatingStats({ averageRating: null, reviewCount: 0 });
        }
      } catch {
        setEvents([]);
        setRooms([]);
        setNotifications([]);
        setRatingStats({ averageRating: null, reviewCount: 0 });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const accepted = events.filter((e) => e.requestStatus === "accepted");
    const pending = events.filter((e) => e.requestStatus === "pending");
    const estimatedAcceptedGross = accepted.reduce(
      (sum, e) => sum + Number(e.offerAmount || 0),
      0
    );
    return {
      totalEvents: events.length,
      acceptedCount: accepted.length,
      pendingCount: pending.length,
      estimatedAcceptedGross,
    };
  }, [events]);

  if (loading) return <p>Loading overview...</p>;

  return (
    <div>
      <h2>Dashboard Overview</h2>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div className="card">
          <strong>Event assignments:</strong> {stats.totalEvents}
        </div>
        <div className="card">
          <strong>Accepted:</strong> {stats.acceptedCount}
        </div>
        <div className="card">
          <strong>Pending requests:</strong> {stats.pendingCount}
        </div>
        <div className="card">
          <strong>Accepted gross:</strong> {money(stats.estimatedAcceptedGross)}
        </div>
        <div className="card">
          <strong>Rating:</strong>{" "}
          {ratingStats.averageRating != null
            ? `${ratingStats.averageRating} ★ (${ratingStats.reviewCount})`
            : "No reviews yet"}
        </div>
        <div className="card">
          <strong>Active chat rooms:</strong> {rooms.length}
        </div>
      </div>

      <h3>Recent event activity</h3>
      {notifications.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No recent activity.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginBottom: "18px" }}>
          {notifications.slice(0, 8).map((n) => (
            <li
              key={n._id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong style={{ color: "#0f172a" }}>{n.title}</strong>
              <div style={{ color: "#1e293b", marginTop: "4px", lineHeight: 1.45 }}>
                {n.message}
              </div>
              <small style={{ color: "#475569", display: "block", marginTop: "6px" }}>
                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
              </small>
            </li>
          ))}
        </ul>
      )}

      <h3>Recent chat activity</h3>
      {rooms.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No chat rooms yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {rooms.slice(0, 6).map((room) => (
            <li
              key={`${room.eventId}-${room.otherUserId}`}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong>{room.eventTitle}</strong> - {room.otherUser?.name || "Client"}
              <div style={{ color: "#4b5563" }}>{room.lastMessage || "No messages yet"}</div>
              <small style={{ color: "#9ca3af" }}>
                {room.lastAt ? new Date(room.lastAt).toLocaleString() : ""}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Overview;