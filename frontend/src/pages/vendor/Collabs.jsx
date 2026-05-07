import { useEffect, useState } from "react";
import axios from "../../api/axios";

const Collabs = () => {
  const [loading, setLoading] = useState(true);
  const [myCategory, setMyCategory] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({
    partnerVendorId: "",
    title: "",
    myAmount: "",
    myFacilities: "",
    myTime: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, pRes, pkgRes] = await Promise.all([
        axios.get("/collabs/candidates"),
        axios.get("/collabs/proposals"),
        axios.get("/collabs/my-packages"),
      ]);
      setMyCategory(cRes.data?.myCategory || "");
      setCandidates(cRes.data?.candidates || []);
      setIncoming(pRes.data?.incoming || []);
      setOutgoing(pRes.data?.outgoing || []);
      setPackages(pkgRes.data || []);
    } catch {
      setCandidates([]);
      setIncoming([]);
      setOutgoing([]);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createProposal = async () => {
    if (!form.partnerVendorId || Number(form.myAmount || 0) <= 0) {
      alert("Choose partner and enter your offer amount.");
      return;
    }
    try {
      await axios.post("/collabs/proposals", {
        partnerVendorId: form.partnerVendorId,
        title: form.title,
        myAmount: Number(form.myAmount || 0),
        myFacilities: form.myFacilities,
        myTime: form.myTime,
      });
      setForm({
        partnerVendorId: "",
        title: "",
        myAmount: "",
        myFacilities: "",
        myTime: "",
      });
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Could not create proposal");
    }
  };

  const respond = async (id, action, payload = {}) => {
    try {
      await axios.post(`/collabs/proposals/${id}/respond`, { action, ...payload });
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Could not respond");
    }
  };

  const confirmProposal = async (id, action) => {
    try {
      await axios.post(`/collabs/proposals/${id}/confirm`, { action });
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Could not confirm");
    }
  };

  const retirePackage = async (id) => {
    if (!window.confirm("Retire this package? Existing event usage stays, but no new client can pick it.")) {
      return;
    }
    try {
      await axios.post(`/collabs/packages/${id}/retire`);
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Could not retire package");
    }
  };

  if (loading) return <p>Loading collabs…</p>;

  return (
    <div style={{ maxWidth: "980px" }}>
      <h2>Collabs</h2>
      <p style={{ color: "#555", maxWidth: "780px" }}>
        Create bundle packages with any verified vendor. Clients will see only final bundle price;
        internal vendor split remains admin/vendor-side.
      </p>
      <p style={{ fontSize: "14px", color: "#6b7280" }}>
        Your category: <strong>{myCategory || "Unknown"}</strong>
      </p>

      <div className="card" style={{ marginBottom: "16px" }}>
        <h3 style={{ marginTop: 0 }}>Create proposal</h3>
        <div style={{ display: "grid", gap: "10px", maxWidth: "560px" }}>
          <select
            value={form.partnerVendorId}
            onChange={(e) => setForm((p) => ({ ...p, partnerVendorId: e.target.value }))}
          >
            <option value="">Choose partner vendor</option>
            {candidates.map((c) => (
              <option key={c.vendorId} value={c.vendorId}>
                {c.displayName || c.user?.name} ({c.category})
              </option>
            ))}
          </select>
          <input
            placeholder="Collab title (optional)"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <input
            type="number"
            min="0"
            placeholder="Your offer amount"
            value={form.myAmount}
            onChange={(e) => setForm((p) => ({ ...p, myAmount: e.target.value }))}
          />
          <input
            placeholder="Your time/duration details"
            value={form.myTime}
            onChange={(e) => setForm((p) => ({ ...p, myTime: e.target.value }))}
          />
          <textarea
            rows={3}
            placeholder="Your facilities/details"
            value={form.myFacilities}
            onChange={(e) => setForm((p) => ({ ...p, myFacilities: e.target.value }))}
          />
          <button type="button" onClick={createProposal} style={{ width: "fit-content" }}>
            Send proposal
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <h3 style={{ marginTop: 0 }}>Incoming proposals</h3>
        {incoming.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No incoming proposals.</p>
        ) : (
          incoming.map((p) => (
            <div key={p._id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <p>
                <strong>{p.title || `${p.proposerCategory} + ${p.partnerCategory}`}</strong> from{" "}
                {p.proposerVendorId?.name || "Vendor"} - status: {p.status}
              </p>
              <p style={{ fontSize: "14px", color: "#555" }}>
                Their offer: {p.proposerOffer?.amount} | {p.proposerOffer?.time} |{" "}
                {p.proposerOffer?.facilities}
              </p>
              {p.status === "pending_partner" && (
                <IncomingRespondBlock proposal={p} onRespond={respond} />
              )}
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <h3 style={{ marginTop: 0 }}>Outgoing proposals</h3>
        {outgoing.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No outgoing proposals.</p>
        ) : (
          outgoing.map((p) => (
            <div key={p._id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <p>
                <strong>{p.title || `${p.proposerCategory} + ${p.partnerCategory}`}</strong> to{" "}
                {p.partnerVendorId?.name || "Vendor"} - status: {p.status}
              </p>
              <p style={{ fontSize: "14px", color: "#555" }}>
                Your offer: {p.proposerOffer?.amount} | {p.proposerOffer?.time} |{" "}
                {p.proposerOffer?.facilities}
              </p>
              {p.status === "pending_proposer_confirm" && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => confirmProposal(p._id, "confirm")}>
                    Confirm and create package
                  </button>
                  <button type="button" onClick={() => confirmProposal(p._id, "reject")}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>My collab packages</h3>
        {packages.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No packages yet.</p>
        ) : (
          packages.map((p) => (
            <div key={p._id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <p>
                <strong>{p.title}</strong> - final {p.finalPrice} - status {p.status}{" "}
                ({p.acceptingNewBookings ? "open" : "closed"}) - used {p.usageCount || 0}
              </p>
              <ul style={{ marginTop: "4px" }}>
                {(p.members || []).map((m) => (
                  <li key={String(m.vendorId?._id || m.vendorId)}>
                    {m.vendorId?.name || "Vendor"} ({m.category}) - gross {m.grossAmount}
                  </li>
                ))}
              </ul>
              {p.acceptingNewBookings && (
                <button type="button" onClick={() => retirePackage(p._id)} style={{ width: "auto" }}>
                  Retire package
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

function IncomingRespondBlock({ proposal, onRespond }) {
  const [amount, setAmount] = useState("");
  const [time, setTime] = useState("");
  const [facilities, setFacilities] = useState("");
  return (
    <div style={{ display: "grid", gap: "8px", maxWidth: "520px" }}>
      <input
        type="number"
        min="0"
        placeholder="Your offer amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        placeholder="Your time/duration details"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      <textarea
        rows={2}
        placeholder="Your facilities/details"
        value={facilities}
        onChange={(e) => setFacilities(e.target.value)}
      />
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() =>
            onRespond(proposal._id, "accept", {
              myAmount: Number(amount || 0),
              myTime: time,
              myFacilities: facilities,
            })
          }
        >
          Accept with my offer
        </button>
        <button type="button" onClick={() => onRespond(proposal._id, "reject")}>
          Reject
        </button>
      </div>
    </div>
  );
}

export default Collabs;

