import { useEffect, useState } from "react";
import axios from "../../api/axios";

const Events = ({ onSelect }) => {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    budget: "",
    status: "draft",
    isPublic: false,
  });
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

  const addEvent = async () => {
    if (!form.title || !form.date) {
      alert("Title and date are required");
      return;
    }

    try {
      const res = await axios.post("/events", {
        ...form,
        budget: Number(form.budget || 0),
      });
      setEvents((prev) => [res.data, ...prev]);
      setForm({
        title: "",
        description: "",
        date: "",
        location: "",
        budget: "",
        status: "draft",
        isPublic: false,
      });
    } catch (error) {
      alert(error?.response?.data?.message || "Create event failed");
    }
  };

  return (
    <div>
      <h2>Events</h2>

      {/* CREATE */}
      <div className="card">
        <h3>Create Event</h3>

        <input
          placeholder="Event Name"
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) =>
            setForm({ ...form, date: e.target.value })
          }
        />

        <input
          placeholder="Location"
          value={form.location}
          onChange={(e) =>
            setForm({ ...form, location: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Budget"
          value={form.budget}
          onChange={(e) =>
            setForm({ ...form, budget: e.target.value })
          }
        />
        <select
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value })
          }
        >
          <option value="draft">Draft</option>
          <option value="planning">Planning</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label style={{ textAlign: "left", display: "block", fontSize: "14px", color: "#374151" }}>
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) =>
              setForm({ ...form, isPublic: e.target.checked })
            }
          />{" "}
          <strong>Public event</strong> — poster link &amp; OTP guest signup (stalls
          allowed). Leave unchecked for a <strong>private</strong> event (guest list
          &amp; email invitations only). <em>This choice is permanent.</em>
        </label>

        <button onClick={addEvent}>Add Event</button>
      </div>

      {/* LIST */}
      {loading ? (
        <p>Loading events...</p>
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
            <p>Status: {event.status}</p>
            <p>Budget: {event.budget}</p>
            <p>
              Accepted vendors:{" "}
              {(event.vendors || []).filter((v) => v.requestStatus === "accepted")
                .length}
            </p>
          </div>
        ))
      )}
    </div>
  );
};

export default Events;