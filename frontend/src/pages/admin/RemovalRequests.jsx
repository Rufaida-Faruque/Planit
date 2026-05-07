import { useEffect, useState } from "react";
import axios from "../../api/axios";

const RemovalRequests = () => {
  const [items, setItems] = useState([]);
  const [eventDeleteItems, setEventDeleteItems] = useState([]);
  const [comments, setComments] = useState({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get("/events/admin/removal-requests");
      setItems(res.data || []);
      const eventDeleteRes = await axios.get(
        "/events/admin/event-deletion-requests"
      );
      setEventDeleteItems(eventDeleteRes.data || []);
    } catch {
      setItems([]);
      setEventDeleteItems([]);
    }
  };

  const review = async (requestId, action) => {
    try {
      await axios.patch(`/events/admin/removal-requests/${requestId}/review`, {
        action,
        adminComment: comments[requestId] || "",
      });
      fetchRequests();
    } catch (error) {
      alert(error?.response?.data?.message || "Review failed");
    }
  };

  const reviewEventDelete = async (requestId, action) => {
    try {
      await axios.patch(
        `/events/admin/event-deletion-requests/${requestId}/review`,
        {
          action,
          adminComment: comments[requestId] || "",
        }
      );
      fetchRequests();
    } catch (error) {
      alert(error?.response?.data?.message || "Review failed");
    }
  };

  return (
    <div>
      <h2>Vendor Removal Requests</h2>
      {items.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        items.map((item) => (
          <div key={item._id} className="card" style={{ marginBottom: "12px" }}>
            <p>Event: {item.eventId?.title || "N/A"}</p>
            <p>Vendor: {item.vendorId?.name || "N/A"}</p>
            <p>Client: {item.clientId?.name || "N/A"}</p>
            <p>Reason: {item.reason}</p>
            <p>Status: {item.status}</p>
            {item.status === "pending" && (
              <>
                <input
                  placeholder="Admin comment"
                  value={comments[item._id] || ""}
                  onChange={(e) =>
                    setComments((prev) => ({
                      ...prev,
                      [item._id]: e.target.value,
                    }))
                  }
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button onClick={() => review(item._id, "approve")}>Approve</button>
                  <button onClick={() => review(item._id, "reject")}>Reject</button>
                </div>
              </>
            )}
            {item.status !== "pending" && (
              <p>Admin comment: {item.adminComment || "N/A"}</p>
            )}
          </div>
        ))
      )}

      <h2 style={{ marginTop: "24px" }}>Event Deletion Requests</h2>
      {eventDeleteItems.length === 0 ? (
        <p>No event deletion requests yet.</p>
      ) : (
        eventDeleteItems.map((item) => (
          <div key={item._id} className="card" style={{ marginBottom: "12px" }}>
            <p>Event: {item.eventId?.title || "N/A"}</p>
            <p>Client: {item.clientId?.name || "N/A"}</p>
            <p>Reason: {item.reason}</p>
            <p>Status: {item.status}</p>
            {item.status === "pending" && (
              <>
                <input
                  placeholder="Admin comment"
                  value={comments[item._id] || ""}
                  onChange={(e) =>
                    setComments((prev) => ({
                      ...prev,
                      [item._id]: e.target.value,
                    }))
                  }
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button onClick={() => reviewEventDelete(item._id, "approve")}>
                    Approve
                  </button>
                  <button onClick={() => reviewEventDelete(item._id, "reject")}>
                    Reject
                  </button>
                </div>
              </>
            )}
            {item.status !== "pending" && (
              <p>Admin comment: {item.adminComment || "N/A"}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default RemovalRequests;
