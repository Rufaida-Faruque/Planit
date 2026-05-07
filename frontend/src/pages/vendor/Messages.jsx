import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";

const roomKey = (eventId, otherUserId) => `${eventId}::${otherUserId}`;

const Messages = () => {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = (currentUser?._id || "").toString();
  const [rooms, setRooms] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    fetchRooms();
    fetchContacts();

    const token = localStorage.getItem("token");
    if (!token) return;
    const stream = new EventSource(
      `http://localhost:5000/api/messages/stream?token=${token}`
    );
    stream.addEventListener("message", () => {
      fetchRooms();
      if (activeRoom) {
        fetchMessages(activeRoom.eventId, activeRoom.otherUserId);
      }
    });
    return () => stream.close();
  }, [activeRoom?.eventId, activeRoom?.otherUserId]);

  const fetchRooms = async () => {
    try {
      const res = await axios.get("/messages/rooms");
      setRooms(res.data || []);
    } catch {
      setRooms([]);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await axios.get("/messages/contacts");
      setContacts(res.data || []);
    } catch {
      setContacts([]);
    }
  };

  const mergedRooms = useMemo(() => {
    const map = new Map();
    for (const item of contacts) {
      map.set(roomKey(item.eventId, item.otherUserId), {
        ...item,
        lastMessage: "",
        lastAt: null,
      });
    }
    for (const item of rooms) {
      map.set(roomKey(item.eventId, item.otherUserId), item);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0)
    );
  }, [rooms, contacts]);

  const fetchMessages = async (eventId, otherUserId) => {
    try {
      const res = await axios.get("/messages", {
        params: { eventId, otherUserId },
      });
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    }
  };

  const openRoom = (room) => {
    setActiveRoom(room);
    fetchMessages(room.eventId, room.otherUserId);
  };

  const sendMessage = async () => {
    if (!activeRoom || !text.trim()) return;
    try {
      await axios.post("/messages", {
        eventId: activeRoom.eventId,
        receiverId: activeRoom.otherUserId,
        text: text.trim(),
      });
      setText("");
      fetchMessages(activeRoom.eventId, activeRoom.otherUserId);
      fetchRooms();
    } catch (error) {
      alert(error?.response?.data?.message || "Send failed");
    }
  };

  return (
    <div style={{ display: "flex", gap: "14px" }}>
      <div style={{ minWidth: "280px", maxWidth: "320px" }}>
        <h2>Messages</h2>
        {mergedRooms.length === 0 ? (
          <p>No chat contacts available yet.</p>
        ) : (
          mergedRooms.map((room) => (
            <button
              key={roomKey(room.eventId, room.otherUserId)}
              onClick={() => openRoom(room)}
              style={{
                textAlign: "left",
                marginBottom: "8px",
                background:
                  activeRoom &&
                  roomKey(activeRoom.eventId, activeRoom.otherUserId) ===
                    roomKey(room.eventId, room.otherUserId)
                    ? "#dbeafe"
                    : "#fff",
                color: "#111827",
                border: "1px solid #ddd",
              }}
            >
              <strong>{room.otherUser?.name || "User"}</strong>
              <div>{room.eventTitle}</div>
              <small>{room.lastMessage || "Start conversation"}</small>
            </button>
          ))
        )}
      </div>

      <div style={{ flex: 1 }}>
        {!activeRoom ? (
          <p>Select a contact to start chatting.</p>
        ) : (
          <div>
            <h3>
              {activeRoom.otherUser?.name} - {activeRoom.eventTitle}
            </h3>
            <div
              style={{
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "10px",
                height: "380px",
                overflowY: "auto",
                padding: "10px",
                marginBottom: "10px",
              }}
            >
              {messages.length === 0 ? (
                <p>No messages yet.</p>
              ) : (
                messages.map((msg) => {
                  const sentByMe =
                    (msg.senderId || "").toString() === currentUserId;
                  return (
                    <div
                      key={msg._id}
                      style={{
                        marginBottom: "10px",
                        display: "flex",
                        justifyContent: sentByMe
                          ? "flex-end"
                          : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "75%",
                          background: sentByMe ? "#dbeafe" : "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: "10px",
                          padding: "8px 10px",
                        }}
                      >
                        <small style={{ fontWeight: 600 }}>
                          {sentByMe
                            ? "You"
                            : activeRoom?.otherUser?.name || "Other"}
                        </small>
                        <p style={{ margin: "4px 0" }}>{msg.text}</p>
                        <small style={{ color: "#6b7280" }}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </small>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;