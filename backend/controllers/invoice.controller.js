import PDFDocument from "pdfkit";
import Event from "../models/event.model.js";
import User from "../models/user.model.js";
import LedgerEntry from "../models/ledgerEntry.model.js";
import {
  buildSettlementLines,
  VENDOR_CUT,
} from "../utils/settlementCalc.js";

const MONEY = (n) =>
  (Math.round(Number(n || 0) * 100) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function parseDayBounds(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const start = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
  return { start, end, label: dateStr.trim() };
}

function safeFilenamePart(s) {
  return String(s || "invoice").replace(/[^\w\-]+/g, "_").slice(0, 60);
}

function createPdfRes(res, filename) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.pipe(res);
  return doc;
}

/** Client — full event cost breakdown + fees */
export const getClientEventInvoicePdf = async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Clients only" });
    }

    const event = await Event.findById(req.params.eventId)
      .populate("vendors.vendorId", "name email")
      .populate("clientId", "name email");

    const clientRef = event.clientId?._id || event.clientId;
    if (!event || String(clientRef) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (!event.postClosureLocked) {
      return res.status(400).json({
        message: "Invoice is available after the event is closed.",
      });
    }

    const calc = buildSettlementLines(event);
    const clientName =
      event.clientId?.name || event.clientId?.email || "Client";
    const issued = new Date();

    const doc = createPdfRes(
      res,
      `${safeFilenamePart(event.title)}_invoice.pdf`
    );

    doc.fontSize(20).text("Planit — Event invoice", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#444").text("Simulated billing — not a tax invoice.", {
      align: "center",
    });
    doc.fillColor("#000");
    doc.moveDown(1.2);

    doc.fontSize(11);
    doc.text(`Invoice date: ${issued.toLocaleString()}`);
    doc.text(`Bill to: ${clientName}`);
    if (event.clientId?.email) doc.text(`Email: ${event.clientId.email}`);
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Event: ${event.title}`, { continued: false });
    if (event.date) {
      doc.fontSize(10).text(`Event date: ${new Date(event.date).toLocaleDateString()}`);
    }
    doc.moveDown(1);

    doc.fontSize(11).text("Line items (vendor hires)", { underline: true });
    doc.moveDown(0.3);
    if (calc.baseTotal <= 0 || !calc.lines.length) {
      doc.fontSize(10).text("No settled vendor amounts.");
    } else {
      doc.fontSize(9);
      calc.lines.forEach((line, i) => {
        doc.text(
          `${i + 1}. ${line.vendorName} — agreed amount ${MONEY(line.offerAmount)}`,
          { width: 500 }
        );
      });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Subtotal (vendor hires): ${MONEY(calc.baseTotal)}`);
      const clientFee = calc.clientTotal - calc.baseTotal;
      doc.text(
        `Your service fee (${(calc.clientMarkupRate * 100).toFixed(0)}% on subtotal): ${MONEY(clientFee)}`
      );
      doc.fontSize(12).text(`Total due (simulated): ${MONEY(calc.clientTotal)}`, {
        continued: false,
      });
      doc.moveDown(0.5);
      doc.fontSize(10).text(
        `Planit commission (admin hold): ${MONEY(calc.adminCommission)}`
      );
      doc.text(
        `(Includes ${(calc.clientMarkupRate * 100).toFixed(0)}% client-side fee and ${(calc.vendorCommissionRate * 100).toFixed(0)}% from each vendor’s agreed amount.)`
      );
    }

    if (event.settlementPaidAt) {
      doc.moveDown(1);
      doc.text(
        `Settlement recorded: ${new Date(event.settlementPaidAt).toLocaleString()}`
      );
    } else {
      doc.moveDown(0.8);
      doc.fillColor("#666").text("Payment not yet recorded in Planit.");
      doc.fillColor("#000");
    }

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Could not generate invoice" });
    }
  }
};

/** Vendor — all payouts credited on a calendar day (UTC) */
export const getVendorDailyInvoicePdf = async (req, res) => {
  try {
    if (req.user.role !== "vendor") {
      return res.status(403).json({ message: "Vendors only" });
    }

    const dateStr =
      req.query.date || new Date().toISOString().slice(0, 10);
    const bounds = parseDayBounds(dateStr);
    if (!bounds) {
      return res.status(400).json({ message: "Use date=YYYY-MM-DD" });
    }

    const vendor = await User.findById(req.user.id).select("name email");
    const entries = await LedgerEntry.find({
      type: "vendor_payout",
      userId: req.user.id,
      createdAt: { $gte: bounds.start, $lte: bounds.end },
    })
      .populate({
        path: "eventId",
        select: "title date clientId vendors",
        populate: [
          { path: "clientId", select: "name email" },
          { path: "vendors.vendorId", select: "name" },
        ],
      })
      .sort({ createdAt: 1 })
      .lean();

    const doc = createPdfRes(
      res,
      `vendor_earnings_${safeFilenamePart(bounds.label)}.pdf`
    );

    doc.fontSize(20).text("Planit — Daily earnings", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#444").text("Simulated payouts — not a tax invoice.", {
      align: "center",
    });
    doc.fillColor("#000");
    doc.moveDown(1);

    doc.fontSize(11);
    doc.text(`Vendor: ${vendor?.name || "Vendor"}`);
    if (vendor?.email) doc.text(`Email: ${vendor.email}`);
    doc.text(`Day (UTC): ${bounds.label}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    if (!entries.length) {
      doc.text("No payouts recorded for this day.");
      doc.end();
      return;
    }

    let dayTotal = 0;
    doc.fontSize(11).text("Activity", { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(9);

    entries.forEach((row, i) => {
      const ev = row.eventId;
      const clientLabel =
        ev?.clientId?.name || ev?.clientId?.email || "Client";
      const vid = req.user.id;
      const slot = (ev?.vendors || []).find(
        (v) =>
          String(v.vendorId?._id || v.vendorId) === String(vid)
      );
      const gross = slot?.offerAmount;
      const vendorCut =
        gross != null ? Math.round(gross * VENDOR_CUT * 100) / 100 : null;

      doc.text(
        `${i + 1}. ${new Date(row.createdAt).toLocaleString()} — ${ev?.title || "Event"}`
      );
      doc.text(`   Client: ${clientLabel}`);
      if (gross != null && vendorCut != null) {
        doc.text(
          `   Agreed amount: ${MONEY(gross)} | Planit fee (${(VENDOR_CUT * 100).toFixed(0)}%): ${MONEY(vendorCut)} | Credited: ${MONEY(row.amount)}`
        );
      } else {
        doc.text(`   Credited to balance: ${MONEY(row.amount)}`);
      }
      doc.moveDown(0.4);
      dayTotal += Number(row.amount || 0);
    });

    doc.moveDown(0.5);
    doc.fontSize(11).text(`Total credited this day: ${MONEY(dayTotal)}`);

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Could not generate invoice" });
    }
  }
};

/** Admin — receipts from clients, payouts to vendors, commission split */
export const getAdminDailyInvoicePdf = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const dateStr =
      req.query.date || new Date().toISOString().slice(0, 10);
    const bounds = parseDayBounds(dateStr);
    if (!bounds) {
      return res.status(400).json({ message: "Use date=YYYY-MM-DD" });
    }

    const entries = await LedgerEntry.find({
      createdAt: { $gte: bounds.start, $lte: bounds.end },
    })
      .populate("eventId", "title date")
      .populate("userId", "name email")
      .sort({ createdAt: 1 })
      .lean();

    const clientRows = entries.filter((e) => e.type === "client_settlement");
    const vendorRows = entries.filter((e) => e.type === "vendor_payout");
    const adminRows = entries.filter((e) => e.type === "admin_commission");

    const totalFromClients = clientRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalToVendors = vendorRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalAdminLines = adminRows.reduce((s, r) => s + Number(r.amount || 0), 0);

    const eventIdSet = new Set();
    entries.forEach((e) => {
      if (e.eventId?._id) eventIdSet.add(String(e.eventId._id));
    });

    const eventBreakdowns = [];
    for (const eid of eventIdSet) {
      const ev = await Event.findById(eid)
        .populate("vendors.vendorId", "name")
        .populate("clientId", "name email")
        .lean();
      if (!ev) continue;
      const calc = buildSettlementLines(ev);
      const clientSideFee = calc.clientTotal - calc.baseTotal;
      const vendorSideFee = calc.lines.reduce(
        (s, l) => s + l.vendorCommission,
        0
      );
      eventBreakdowns.push({
        title: ev.title,
        clientName: ev.clientId?.name || ev.clientId?.email || "Client",
        clientSideFee,
        vendorSideFee,
        adminCommission: calc.adminCommission,
      });
    }

    const doc = createPdfRes(
      res,
      `planit_admin_${safeFilenamePart(bounds.label)}.pdf`
    );

    doc.fontSize(20).text("Planit — Admin daily report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#444").text("Simulated ledger — UTC day boundaries.", {
      align: "center",
    });
    doc.fillColor("#000");
    doc.moveDown(1);

    doc.fontSize(11);
    doc.text(`Report day (UTC): ${bounds.label}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Summary", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.text(`Total received from clients (settlements): ${MONEY(totalFromClients)}`);
    doc.text(`Total credited to vendors (payouts): ${MONEY(totalToVendors)}`);
    doc.text(`Total Planit commission (ledger lines): ${MONEY(totalAdminLines)}`);
    doc.moveDown(0.8);

    if (eventBreakdowns.length) {
      let sumClientFee = 0;
      let sumVendorFee = 0;
      eventBreakdowns.forEach((b) => {
        sumClientFee += b.clientSideFee;
        sumVendorFee += b.vendorSideFee;
      });
      doc.text(
        `Commission from client fee (5% on hires): ${MONEY(sumClientFee)}`
      );
      doc.text(
        `Commission from vendor shares (5% of each agreement): ${MONEY(sumVendorFee)}`
      );
      doc.text(
        `Sum of fee components (should match commission above): ${MONEY(sumClientFee + sumVendorFee)}`
      );
    }

    doc.moveDown(1);
    doc.fontSize(12).text("From clients", { underline: true });
    doc.moveDown(0.3);
    if (!clientRows.length) {
      doc.fontSize(10).text("No client settlements this day.");
    } else {
      doc.fontSize(9);
      clientRows.forEach((r, i) => {
        const ev = r.eventId;
        const who = r.userId?.name || r.userId?.email || "Client";
        doc.text(
          `${i + 1}. ${who} — ${ev?.title || "Event"} — ${MONEY(r.amount)} — ${new Date(r.createdAt).toLocaleString()}`
        );
      });
    }

    doc.moveDown(0.8);
    doc.fontSize(12).text("Paid to vendors (credited)", { underline: true });
    doc.moveDown(0.3);
    if (!vendorRows.length) {
      doc.fontSize(10).text("No vendor payouts this day.");
    } else {
      doc.fontSize(9);
      vendorRows.forEach((r, i) => {
        const ev = r.eventId;
        const who = r.userId?.name || r.userId?.email || "Vendor";
        doc.text(
          `${i + 1}. ${who} — ${ev?.title || "Event"} — ${MONEY(r.amount)} — ${new Date(r.createdAt).toLocaleString()}`
        );
      });
    }

    doc.moveDown(0.8);
    doc.fontSize(12).text("Per-event commission split", { underline: true });
    doc.moveDown(0.3);
    if (!eventBreakdowns.length) {
      doc.fontSize(10).text("No events with ledger activity this day.");
    } else {
      doc.fontSize(9);
      eventBreakdowns.forEach((b, i) => {
        doc.text(`${i + 1}. ${b.title} (${b.clientName})`);
        doc.text(
          `   Client-side fee: ${MONEY(b.clientSideFee)} | Vendor-side commission: ${MONEY(b.vendorSideFee)} | Total Planit: ${MONEY(b.adminCommission)}`
        );
        doc.moveDown(0.3);
      });
    }

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Could not generate invoice" });
    }
  }
};
