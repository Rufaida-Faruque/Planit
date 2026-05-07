import { useEffect, useState } from "react";
import axios from "../../api/axios";

const Overview = ({ onSelect }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get("/events");
      setEvents(res.data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Overview</h2>

      {loading ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        events.map((event) => (
          <div
            key={event._id}
            className="card"
            onClick={() => onSelect(event)}
          >
            <h3>{event.title}</h3>
            <p>
              {new Date(event.date).toLocaleDateString()} - {event.location}
            </p>
            <p>
              {(event.vendors || []).filter((v) => v.requestStatus === "accepted")
                .length}{" "}
              vendors accepted
            </p>
          </div>
        ))
      )}
    </div>
  );
};

export default Overview;