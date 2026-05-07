import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { downloadPdf } from "../../utils/downloadPdf.js";

const Wallet = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/wallet/vendor/balance");
        setData(res.data);
      } catch (e) {
        setError(e?.response?.data?.message || "Could not load wallet");
      }
    })();
  }, []);

  const downloadDailyInvoice = async () => {
    setInvoiceBusy(true);
    try {
      await downloadPdf(
        `/invoices/vendor/daily?date=${encodeURIComponent(invoiceDate)}`,
        `vendor-earnings-${invoiceDate}.pdf`
      );
    } catch (e) {
      alert(e?.message || "Could not download invoice");
    } finally {
      setInvoiceBusy(false);
    }
  };

  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: "720px" }}>
      <h2>Account balance</h2>
      <p style={{ color: "#555", marginBottom: "16px" }}>
        Simulated balance — credits when clients complete settlement after an event closes (your share
        after Planit&apos;s 5% vendor fee).
      </p>
      <div
        style={{
          padding: "16px",
          borderRadius: "12px",
          background: "#ecfdf5",
          border: "1px solid #bbf7d0",
          marginBottom: "24px",
        }}
      >
        <p style={{ margin: 0, fontSize: "14px", color: "#166534" }}>Available balance</p>
        <p style={{ margin: "8px 0 0", fontSize: "28px", fontWeight: 700 }}>
          {data.balance?.toLocaleString?.() ?? data.balance}
        </p>
      </div>

      <div
        style={{
          marginBottom: "24px",
          padding: "14px",
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          background: "#fafafa",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>Daily earnings invoice</h3>
        <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#6b7280" }}>
          PDF lists every payout credited on the selected calendar day (UTC). You may work with
          multiple clients in one day — each line shows event and client.
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
            onClick={downloadDailyInvoice}
            disabled={invoiceBusy}
            style={{ width: "auto" }}
          >
            {invoiceBusy ? "Preparing PDF…" : "Download daily invoice (PDF)"}
          </button>
        </div>
      </div>

      <h3>Recent payouts</h3>
      {!data.payouts?.length ? (
        <p style={{ color: "#6b7280" }}>No payouts yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {data.payouts.map((row) => (
            <li
              key={row._id}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong>+{row.amount?.toLocaleString?.() ?? row.amount}</strong>
              <span style={{ color: "#6b7280", marginLeft: "8px" }}>
                {row.eventId?.title || "Event"}
              </span>
              <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
                {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Wallet;
