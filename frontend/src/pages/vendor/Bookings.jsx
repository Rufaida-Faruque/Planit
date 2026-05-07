import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";

const Bookings = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchVendorEvents();
  }, []);

  const fetchVendorEvents = async () => {
    try {
      const res = await axios.get("/events/vendor/my-events");
      setEvents(res.data || []);
    } catch {
      setEvents([]);
    }
  };

  const respond = async (eventId, accept) => {
    try {
      await axios.patch(`/events/vendor/${eventId}/respond`, { accept });
      fetchVendorEvents();
    } catch (error) {
      alert(error?.response?.data?.message || "Response failed");
    }
  };

  return (
    <div>
      <h2>Event Requests & Bookings</h2>
      {events.length === 0 ? (
        <p>No event requests yet.</p>
      ) : (
        events.map((ev) => (
          <div
            key={ev._id}
            className="card"
            style={{ marginBottom: "10px", cursor: "pointer" }}
            onClick={() => navigate(`/vendor/events/${ev._id}`)}
          >
            <h3>{ev.title}</h3>
            <p>Date: {new Date(ev.date).toLocaleDateString()}</p>
            <p>Client: {ev.client?.name || "Client"}</p>
            <p>Offer Amount: {ev.offerAmount}</p>
            <p>Package: {ev.offerPackage || "N/A"}</p>
            <p>Request: {ev.requestStatus}</p>
            {ev.requestStatus === "pending" && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    respond(ev._id, true);
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    respond(ev._id, false);
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}

    </div>
  );
};

export default Bookings;