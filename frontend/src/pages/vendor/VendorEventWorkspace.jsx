import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../api/axios";

const VendorEventWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkText, setCheckText] = useState("");

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`/events/vendor/${id}`);
      setEvent(res.data);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const respond = async (accept) => {
    try {
      await axios.patch(`/events/vendor/${id}/respond`, { accept });
      fetchEvent();
    } catch (error) {
      alert(error?.response?.data?.message || "Response failed");
    }
  };

  const addChecklistItem = async () => {
    if (!checkText.trim()) return;
    try {
      await axios.patch(`/events/vendor/${id}/checklist`, {
        text: checkText.trim(),
        done: false,
      });
      setCheckText("");
      fetchEvent();
    } catch {
      alert("Checklist add failed");
    }
  };

  const toggleChecklist = async (item) => {
    try {
      await axios.patch(`/events/vendor/${id}/checklist`, {
        checklistItemId: item._id,
        done: !item.done,
      });
      fetchEvent();
    } catch {
      alert("Checklist update failed");
    }
  };

  if (loading) return <p>Loading event workspace...</p>;
  if (!event) return <p>Event not found or access denied.</p>;

  return (
    <div style={{ maxWidth: "900px" }}>
      <button onClick={() => navigate("/vendor")}>⬅ Back to Vendor Dashboard</button>
      <h2 style={{ marginTop: "12px" }}>Vendor Event Workspace</h2>

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "14px",
        }}
      >
        <h3>{event.title}</h3>
        <p>Date: {new Date(event.date).toLocaleDateString()}</p>
        <p>Client: {event.client?.name}</p>
        <p>Contact: {event.client?.email || event.client?.phone}</p>
        <p>Location: {event.location}</p>
        <p>Budget: {event.budget}</p>
        <p>Budget Used: {event.budgetUsed}</p>
        <p>Offer: {event.offerAmount}</p>
        <p>Package: {event.offerPackage || "N/A"}</p>
        <p>Request Status: {event.requestStatus}</p>
        <p>Work Status: {event.vendorStatus}</p>

        {event.requestStatus === "pending" && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => respond(true)}>Accept Request</button>
            <button onClick={() => respond(false)}>Reject Request</button>
          </div>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "16px",
        }}
      >
        <h3>My Checklist (visible to client)</h3>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <input
            placeholder="Checklist task"
            value={checkText}
            onChange={(e) => setCheckText(e.target.value)}
          />
          <button onClick={addChecklistItem}>Add</button>
        </div>

        {(event.checklist || []).length === 0 ? (
          <p>No checklist items yet.</p>
        ) : (
          (event.checklist || []).map((item) => (
            <label key={item._id} style={{ display: "block", marginTop: "6px" }}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklist(item)}
              />{" "}
              {item.text}
            </label>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorEventWorkspace;
