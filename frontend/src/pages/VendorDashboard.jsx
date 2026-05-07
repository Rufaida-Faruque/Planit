import { useEffect, useState } from "react";
import axios from "../api/axios";

import Overview from "./vendor/Overview";
import Portfolio from "./vendor/Portfolio";
import Services from "./vendor/Services";
import Bookings from "./vendor/Bookings";
import Messages from "./vendor/Messages";
import Verification from "./vendor/Verification";
import Wallet from "./vendor/Wallet";
import Collabs from "./vendor/Collabs";

const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("vendorDashboardActiveTab") || "overview"
  );
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    fetchNotifications();
    const token = localStorage.getItem("token");
    if (!token) return;
    const stream = new EventSource(
      `http://localhost:5000/api/notifications/stream?token=${token}`
    );
    stream.addEventListener("notification", () => {
      fetchNotifications();
    });
    return () => stream.close();
  }, []);

  useEffect(() => {
    localStorage.setItem("vendorDashboardActiveTab", activeTab);
  }, [activeTab]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("/notifications");
      setNotifications(res.data || []);
    } catch {
      setNotifications([]);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch("/notifications/read-all");
      fetchNotifications();
    } catch {
      alert("Failed to mark notifications");
    }
  };

  const openNotification = async (item) => {
    setSelectedNotification(item);
    if (!item.isRead) {
      try {
        await axios.patch(`/notifications/${item._id}/read`);
        fetchNotifications();
      } catch {}
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview />;

      case "portfolio":
        return <Portfolio />;

      case "services":
        return <Services />;

      case "bookings":
        return <Bookings />;

      case "messages":
        return <Messages />;

      case "verification":
        return <Verification />;

      case "wallet":
        return <Wallet />;

      case "collabs":
        return <Collabs />;

      default:
        return <Overview />;
    }
  };

  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>Vendor Panel</h2>
        <button onClick={() => setShowNotifications((prev) => !prev)}>
          🔔 {notifications.filter((n) => !n.isRead).length}
        </button>
        {showNotifications && (
          <div
            style={{
              marginBottom: "12px",
              background: "#ffffff",
              color: "#111827",
              borderRadius: "10px",
              padding: "10px",
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "8px",
                alignItems: "center",
                color: "#0f172a",
              }}
            >
              <strong style={{ fontSize: "15px" }}>Notifications</strong>
              <button
                onClick={markAllRead}
                style={{ width: "auto", padding: "6px 8px" }}
              >
                Mark all read
              </button>
            </div>
            {notifications.length === 0 ? (
              <p style={{ color: "#111827", margin: 0 }}>No notifications</p>
            ) : (
              notifications.slice(0, 8).map((item) => (
                <button
                  key={item._id}
                  onClick={() => openNotification(item)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    marginBottom: "6px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: item.isRead
                      ? "1px solid #d1d5db"
                      : "1px solid #2563eb",
                    background: item.isRead ? "#f9fafb" : "#eff6ff",
                    color: "#0f172a",
                    fontWeight: item.isRead ? 500 : 600,
                    cursor: "pointer",
                    lineHeight: 1.35,
                  }}
                >
                  {item.title}
                </button>
              ))
            )}
          </div>
        )}

        <button onClick={() => setActiveTab("overview")}>
          Overview
        </button>

        <button onClick={() => setActiveTab("portfolio")}>
          Portfolio
        </button>

        <button onClick={() => setActiveTab("services")}>
          Services
        </button>

        <button onClick={() => setActiveTab("bookings")}>
          Bookings
        </button>

        <button onClick={() => setActiveTab("messages")}>
          Messages
        </button>

        <button onClick={() => setActiveTab("wallet")}>
          Account balance
        </button>

        <button onClick={() => setActiveTab("collabs")}>
          Collabs
        </button>

        <button onClick={() => setActiveTab("verification")}>
          Verification
        </button>
      </div>

      {/* CONTENT */}
      <div className="content">
        {selectedNotification && (
          <div
            style={{
              marginBottom: "12px",
              background: "#ffffff",
              borderRadius: "12px",
              padding: "14px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              border: "1px solid #e2e8f0",
              color: "#0f172a",
            }}
          >
            <h3 style={{ margin: "0 0 8px", color: "#020617" }}>
              {selectedNotification.title}
            </h3>
            <p style={{ margin: "0 0 10px", color: "#1e293b", lineHeight: 1.5 }}>
              {selectedNotification.message}
            </p>
            <p style={{ margin: "0 0 6px", color: "#334155", fontSize: "14px" }}>
              Time:{" "}
              {new Date(selectedNotification.createdAt).toLocaleString()}
            </p>
            <p style={{ margin: 0, color: "#334155", fontSize: "14px" }}>
              Related: {selectedNotification.link || "No link available"}
            </p>
          </div>
        )}
        {renderContent()}
      </div>

    </div>
  );
};

export default VendorDashboard;