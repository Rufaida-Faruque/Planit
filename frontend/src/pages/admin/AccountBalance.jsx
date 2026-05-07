import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { downloadPdf } from "../../utils/downloadPdf.js";

const AccountBalance = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [releasingId, setReleasingId] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const loadBalance = async () => {
    const res = await axios.get("/wallet/admin/balance");
    setData(res.data);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadBalance();
      } catch (e) {
        setError(e?.response?.data?.message || "Could not load account");
      }
    })();
  }, []);

  const releasePayout = async (id) => {
    if (!window.confirm("Credit this amount to the vendor wallet now?")) return;
    setReleasingId(id);
    try {
      await axios.post(`/wallet/admin/release-vendor-payout/${id}`);
      await loadBalance();
    } catch (e) {
      alert(e?.response?.data?.message || "Release failed");
    } finally {
      setReleasingId(null);
    }
  };

  const releaseAllForEvent = async (eventId, eventTitle = "this event") => {
    if (!window.confirm(`Release all pending vendor payouts for ${eventTitle}?`)) return;
    setReleasingId(`event:${eventId}`);
    try {
      await axios.post(`/wallet/admin/release-all-for-event/${eventId}`);
      await loadBalance();
    } catch (e) {
      alert(e?.response?.data?.message || "Release failed");
    } finally {
      setReleasingId(null);
    }
  };

  const pendingByEvent = useMemo(() => {
    const map = new Map();
    for (const row of data?.pendingVendorPayouts || []) {
      const key = row.eventId?._id || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          eventId: key,
          eventTitle: row.eventId?.title || "Event",
          count: 0,
        });
      }
      const g = map.get(key);
      g.count += 1;
    }
    return Array.from(map.values());
  }, [data?.pendingVendorPayouts]);

  const downloadDailyReport = async () => {
    setInvoiceBusy(true);
    try {
      await downloadPdf(
        `/invoices/admin/daily?date=${encodeURIComponent(invoiceDate)}`,
        `planit-admin-${invoiceDate}.pdf`
      );
    } catch (e) {
      alert(e?.message || "Could not download report");
    } finally {
      setInvoiceBusy(false);
    }
  };

  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: "900px" }}>
      <h2>Planit account balance (commission)</h2>
      <p style={{ color: "#555", marginBottom: "16px" }}>
        Totals are simulated. When a client pays after closure, Planit records commission and queues
        each vendor&apos;s net share below — you must click <strong>Release</strong> per vendor before
        their wallet is credited (5% client fee + 5% per vendor line already reflected in amounts).
      </p>

      <h3>Pending vendor releases</h3>
      {!!pendingByEvent.length && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
          {pendingByEvent.map((g) => (
            <button
              key={g.eventId}
              type="button"
              onClick={() => releaseAllForEvent(g.eventId, g.eventTitle)}
              disabled={releasingId === `event:${g.eventId}`}
              style={{ width: "auto" }}
              title={`Release ${g.count} payouts`}
            >
              {releasingId === `event:${g.eventId}`
                ? "Releasing…"
                : `Release all for event: ${g.eventTitle} (${g.count})`}
            </button>
          ))}
        </div>
      )}
      {!data.pendingVendorPayouts?.length ? (
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>No payouts waiting.</p>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: "28px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "8px" }}>Event</th>
                <th style={{ padding: "8px" }}>Vendor</th>
                <th style={{ padding: "8px" }}>Agreed (gross)</th>
                <th style={{ padding: "8px" }}>Net to credit</th>
                <th style={{ padding: "8px" }} />
              </tr>
            </thead>
            <tbody>
              {data.pendingVendorPayouts.map((row) => (
                <tr key={row._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 8px" }}>{row.eventId?.title || "—"}</td>
                  <td style={{ padding: "10px 8px" }}>
                    {row.vendorId?.name || row.vendorId?.email || "—"}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {row.offerAmount?.toLocaleString?.() ?? row.offerAmount}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {row.vendorReceives?.toLocaleString?.() ?? row.vendorReceives}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <button
                      type="button"
                      onClick={() => releasePayout(row._id)}
                      disabled={releasingId === row._id}
                      style={{ width: "auto" }}
                    >
                      {releasingId === row._id ? "Releasing…" : "Release"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          marginBottom: "20px",
          padding: "14px",
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          background: "#fafafa",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>Daily settlement report (PDF)</h3>
        <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#6b7280" }}>
          Download receipts from clients, amounts credited to vendors, and commission split (client
          fee vs vendor-side fee) for ledger activity on the selected UTC day.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <label style={{ fontSize: "14px" }}>
            Day{" "}
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              style={{ marginLeft: "6px" }}
            />
          </label>
          <button
            type="button"
            onClick={downloadDailyReport}
            disabled={invoiceBusy}
            style={{ width: "auto" }}
          >
            {invoiceBusy ? "Preparing PDF…" : "Download daily report (PDF)"}
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          borderRadius: "12px",
          background: "#eef2ff",
          border: "1px solid #c7d2fe",
          marginBottom: "24px",
          display: "flex",
          gap: "32px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "13px", color: "#4338ca" }}>Total commission collected</p>
          <p style={{ margin: "6px 0 0", fontSize: "26px", fontWeight: 700 }}>
            {data.totalCommission?.toLocaleString?.() ?? data.totalCommission}
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "13px", color: "#4338ca" }}>Settled events (count)</p>
          <p style={{ margin: "6px 0 0", fontSize: "26px", fontWeight: 700 }}>
            {data.settlementCount ?? 0}
          </p>
        </div>
      </div>

      <h3>Recent ledger</h3>
      {!data.recent?.length ? (
        <p style={{ color: "#6b7280" }}>No entries yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "8px" }}>When</th>
                <th style={{ padding: "8px" }}>Type</th>
                <th style={{ padding: "8px" }}>Event</th>
                <th style={{ padding: "8px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
                  </td>
                  <td style={{ padding: "10px 8px" }}>{row.type}</td>
                  <td style={{ padding: "10px 8px" }}>{row.eventId?.title || "—"}</td>
                  <td style={{ padding: "10px 8px" }}>
                    {row.amount?.toLocaleString?.() ?? row.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AccountBalance;
