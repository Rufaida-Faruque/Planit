import { useEffect, useState } from "react";
import axios from "../api/axios";

import Overview from "./admin/Overview";
import Vendors from "./admin/Vendors";
import Clients from "./admin/Clients";
import Events from "./admin/Events";
import AccountBalance from "./admin/AccountBalance";
import VerificationPanel from "./admin/Verification";
import RemovalRequests from "./admin/RemovalRequests";
import HelpRequests from "./admin/HelpRequests";
import EventClosureRequests from "./admin/EventClosureRequests";

const ADMIN_TABS = new Set([
  "overview",
  "vendors",
  "clients",
  "events",
  "payments",
  "verification",
  "vendorRemoval",
  "help",
  "closure",
]);

const readStoredAdminTab = () => {
  const raw = localStorage.getItem("adminDashboardActiveTab");
  if (raw && ADMIN_TABS.has(raw)) return raw;
  return "overview";
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState(readStoredAdminTab);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/events/admin/dashboard");
      setVendors(res.data?.vendors || []);
      setClients(res.data?.clients || []);
      setEvents(res.data?.events || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Could not load admin dashboard data");
      setVendors([]);
      setClients([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    localStorage.setItem("adminDashboardActiveTab", activeTab);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview vendors={vendors} clients={clients} events={events} />;
      case "vendors":
        return <Vendors vendors={vendors} />;
      case "clients":
        return <Clients clients={clients} />;
      case "events":
        return <Events events={events} />;
      case "payments":
        return <AccountBalance />;
      case "verification":
  return <VerificationPanel />;  
      case "vendorRemoval":
        return <RemovalRequests />;
      case "help":
        return <HelpRequests />;
      case "closure":
        return <EventClosureRequests />;
      default:
        return (
          <Overview vendors={vendors} clients={clients} events={events} />
        );
    }
  };

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>Admin Panel</h2>

        <button onClick={() => setActiveTab("overview")}>Overview</button>
        <button onClick={() => setActiveTab("vendors")}>Vendors</button>
        <button onClick={() => setActiveTab("clients")}>Clients</button>
        <button onClick={() => setActiveTab("events")}>Events</button>
        <button onClick={() => setActiveTab("payments")}>Account balance</button>
        <button onClick={() => setActiveTab("verification")}>
  Vendor Verification
</button>
        <button onClick={() => setActiveTab("vendorRemoval")}>
          Vendor Removal Requests
        </button>
        <button onClick={() => setActiveTab("help")}>Help questions</button>
        <button onClick={() => setActiveTab("closure")}>Event closures</button>
      </div>

      {/* CONTENT */}
      <div className="content">
        {loading ? (
          <p>Loading admin data…</p>
        ) : error ? (
          <p style={{ color: "#b91c1c" }}>{error}</p>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;