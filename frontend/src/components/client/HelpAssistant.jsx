import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import { HELP_TOPICS } from "../../constants/helpTopics.js";

function formatBody(text) {
  const paras = text.trim().split(/\n\n+/);
  return paras.map((para, i) => (
    <p key={i} style={{ margin: "0 0 10px", lineHeight: 1.55, color: "#374151" }}>
      {para.split(/(\*\*.+?\*\*)/g).map((chunk, j) => {
        if (chunk.startsWith("**") && chunk.endsWith("**")) {
          return <strong key={j}>{chunk.slice(2, -2)}</strong>;
        }
        return <span key={j}>{chunk}</span>;
      })}
    </p>
  ));
}

export default function HelpAssistant() {
  const [open, setOpen] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [customText, setCustomText] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [sending, setSending] = useState(false);

  const activeTopic = HELP_TOPICS.find((t) => t.id === activeTopicId);

  const loadMine = useCallback(async () => {
    setLoadingMy(true);
    try {
      const res = await axios.get("/help/my");
      setMyRequests(res.data || []);
    } catch {
      setMyRequests([]);
    } finally {
      setLoadingMy(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadMine();
  }, [open, loadMine]);

  const sendToAdmin = async () => {
    const msg = customText.trim();
    if (msg.length < 5) {
      alert("Please write at least 5 characters so we can help.");
      return;
    }
    setSending(true);
    try {
      await axios.post("/help/questions", { message: msg });
      setCustomText("");
      await loadMine();
      alert("Thanks — your question was sent to our team. You’ll get a notification when we reply.");
    } catch (err) {
      alert(err?.response?.data?.message || "Could not send question");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          border: "none",
          background: "#111827",
          color: "#fff",
          fontSize: "22px",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        }}
        title={open ? "Close help" : "Help"}
        aria-expanded={open}
      >
        {open ? "×" : "?"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "84px",
            right: "20px",
            zIndex: 9998,
            width: "min(460px, calc(100vw - 24px))",
            height: "min(720px, calc(100vh - 120px))",
            maxHeight: "min(720px, calc(100vh - 120px))",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            borderRadius: "14px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "17px" }}>Help</h3>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#6b7280" }}>
              Quick answers below — or ask our team anything else.
            </p>
          </div>

          <div
            style={{
              overflowY: "auto",
              padding: "12px 14px",
              flex: "1 1 0",
              minHeight: 0,
            }}
          >
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
              Common questions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {HELP_TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setActiveTopicId((id) => (id === t.id ? null : t.id))
                  }
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: activeTopicId === t.id ? "2px solid #111827" : "1px solid #e5e7eb",
                    background: activeTopicId === t.id ? "#f3f4f6" : "#fff",
                    color: "#111827",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {t.title}
                </button>
              ))}
            </div>

            {activeTopic && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  background: "#f0fdf4",
                  borderRadius: "10px",
                  border: "1px solid #bbf7d0",
                  fontSize: "14px",
                }}
              >
                {formatBody(activeTopic.body)}
              </div>
            )}

            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

            <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", margin: "0 0 8px" }}>
              Ask the team (other questions)
            </p>
            <textarea
              placeholder="Describe your question — we’ll reply here and notify you."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            />
            <button
              type="button"
              onClick={sendToAdmin}
              disabled={sending}
              style={{ width: "100%" }}
            >
              {sending ? "Sending…" : "Send to support"}
            </button>

            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "12px", marginBottom: "6px" }}>
              Your questions & replies
            </p>
            {loadingMy ? (
              <p style={{ fontSize: "13px", color: "#9ca3af" }}>Loading…</p>
            ) : myRequests.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>
                No messages to support yet.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px" }}>
                {myRequests.map((r) => (
                  <li
                    key={r._id}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ color: "#111827", marginBottom: "6px" }}>
                      <strong>You:</strong> {r.message}
                    </div>
                    {r.status === "answered" && r.adminReply ? (
                      <div style={{ color: "#059669", paddingTop: "6px", borderTop: "1px dashed #d1d5db" }}>
                        <strong>Planit:</strong> {r.adminReply}
                      </div>
                    ) : (
                      <div style={{ color: "#b45309", fontSize: "12px" }}>Waiting for a reply…</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
