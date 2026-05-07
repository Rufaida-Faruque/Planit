import { useEffect, useState } from "react";
import axios from "../../api/axios";

const EventClosureRequests = () => {
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get("/events/admin/closure-requests");
      setItems(res.data || []);
    } catch {
      setItems([]);
    }
  };

  const review = async (requestId, action) => {
    try {
      await axios.patch(`/events/admin/closure-requests/${requestId}/review`, {
        action,
        adminComment: comments[requestId] || "",
      });
      setComments((prev) => ({ ...prev, [requestId]: "" }));
      fetchItems();
    } catch (err) {
      alert(err?.response?.data?.message || "Review failed");
    }
  };

  return (
    <div>
      <h2>Event closure requests</h2>
      <p style={{ color: "#555", maxWidth: "640px" }}>
        When a client’s event date has passed, they can ask to close the event. Approve to
        lock most editing; they keep photo sharing, messages, and vendor reviews.
      </p>
      {items.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        items.map((item) => (
          <div key={item._id} className="card" style={{ marginBottom: "12px" }}>
            <p>
              <strong>Event:</strong> {item.eventId?.title || "N/A"}
            </p>
            <p>
              <strong>Client:</strong> {item.clientId?.name || "—"} ({item.clientId?.email || ""})
            </p>
            <p>
              <strong>Requested:</strong> {new Date(item.createdAt).toLocaleString()}
            </p>
            <p>
              <strong>Status:</strong> {item.status}
            </p>
            {item.status === "pending" && (
              <>
                <input
                  placeholder="Optional note to client"
                  value={comments[item._id] || ""}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [item._id]: e.target.value }))
                  }
                  style={{ width: "100%", maxWidth: "420px", marginTop: "8px" }}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button type="button" onClick={() => review(item._id, "approve")}>
                    Approve (close event)
                  </button>
                  <button type="button" onClick={() => review(item._id, "reject")}>
                    Reject
                  </button>
                </div>
              </>
            )}
            {item.status !== "pending" && (
              <p>Admin note: {item.adminComment || "—"}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default EventClosureRequests;
