import { useEffect, useState } from "react";
import axios from "../../api/axios";

const HelpRequests = () => {
  const [items, setItems] = useState([]);
  const [replies, setReplies] = useState({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get("/help/admin");
      setItems(res.data || []);
    } catch {
      setItems([]);
    }
  };

  const sendReply = async (id) => {
    const reply = (replies[id] || "").trim();
    if (!reply) {
      alert("Enter a reply first");
      return;
    }
    try {
      await axios.patch(`/help/admin/${id}`, { reply });
      setReplies((prev) => ({ ...prev, [id]: "" }));
      fetchRequests();
    } catch (err) {
      alert(err?.response?.data?.message || "Could not send reply");
    }
  };

  const openItems = items.filter((i) => i.status === "open");

  return (
    <div>
      <h2>Help questions</h2>
      <p style={{ color: "#555", maxWidth: "640px" }}>
        Clients see preset answers in the app. Anything else lands here — reply and they’ll get a
        notification with your message.
      </p>

      {openItems.length === 0 ? (
        <p>No open questions.</p>
      ) : (
        <p style={{ fontWeight: 600 }}>
          Open: {openItems.length}
        </p>
      )}

      {items.length === 0 ? (
        <p>No help requests yet.</p>
      ) : (
        items.map((item) => (
          <div key={item._id} className="card" style={{ marginBottom: "14px" }}>
            <p style={{ margin: "0 0 6px" }}>
              <strong>From:</strong> {item.user?.name || "Client"} ({item.user?.email || "—"})
            </p>
            <p style={{ margin: "0 0 6px" }}>
              <strong>When:</strong> {new Date(item.createdAt).toLocaleString()}
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Question:</strong> {item.message}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Status:</strong> {item.status}
            </p>

            {item.status === "answered" && item.adminReply ? (
              <div
                style={{
                  padding: "10px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>Your reply:</strong> {item.adminReply}
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                  {item.answeredAt
                    ? new Date(item.answeredAt).toLocaleString()
                    : ""}
                </div>
              </div>
            ) : (
              <>
                <textarea
                  placeholder="Type your reply to the client…"
                  value={replies[item._id] ?? ""}
                  onChange={(e) =>
                    setReplies((prev) => ({ ...prev, [item._id]: e.target.value }))
                  }
                  rows={4}
                  style={{ width: "100%", maxWidth: "560px", marginBottom: "8px" }}
                />
                <button type="button" onClick={() => sendReply(item._id)} style={{ width: "auto" }}>
                  Send reply
                </button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default HelpRequests;
