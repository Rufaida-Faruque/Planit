import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import ServiceSelectionPanel from "../../components/client/ServiceSelectionPanel.jsx";
import {
  computeExpectedCost,
  summarizeSelection,
} from "../../utils/computeServiceCost.js";
import { portfolioHasBookableVenueSlot } from "../../utils/venueAvailability.js";
import { downloadPdf } from "../../utils/downloadPdf.js";
import EventPlanningChecklist, {
  mapApiChecklistToState,
  mapStateToApiPayload,
} from "../../components/client/EventPlanningChecklist.jsx";

const TAB_LABELS = {
  overview: "Overview",
  timeline: "Timeline",
  vendors: "Vendors",
  budget: "Budget",
  checklist: "Checklist",
  poster: "Poster & signup",
  stalls: "Stalls",
  attendees: "Signups",
  guestlist: "Guest list",
  invitations: "Invitations",
  photoshare: "Photo sharing",
  reviews: "Vendor reviews",
  settlement: "Payment",
  settings: "Settings",
};

const PUBLIC_TABS = [
  "overview",
  "timeline",
  "vendors",
  "budget",
  "checklist",
  "poster",
  "stalls",
  "attendees",
  "reviews",
  "settlement",
  "settings",
];

const PRIVATE_TABS = [
  "overview",
  "timeline",
  "vendors",
  "budget",
  "checklist",
  "guestlist",
  "invitations",
  "photoshare",
  "reviews",
  "settlement",
  "settings",
];

const CLOSED_PUBLIC_TABS = ["overview", "stalls", "attendees", "reviews", "settlement"];
const CLOSED_PRIVATE_TABS = ["overview", "photoshare", "reviews", "settlement"];

function isEventPastDeadline(dateVal) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  d.setHours(23, 59, 59, 999);
  return Date.now() > d.getTime();
}

/** Align with backend budget logic: hired = accepted request, or legacy status-only accepted */
function vendorIsHired(v) {
  if (!v) return false;
  if (v.requestStatus === "accepted") return true;
  if (v.requestStatus === "pending" || v.requestStatus === "rejected") return false;
  return v.status === "accepted";
}

/** Same rule as backend — hired vendors may receive a review after event closure */
function vendorReviewable(v) {
  if (!v) return false;
  if (v.requestStatus === "accepted") return true;
  return ["accepted", "working", "completed"].includes(v.status);
}

function VendorReviewBlock({ vendorId, vendorName, initialRating, initialComment, onSave }) {
  const [rating, setRating] = useState(initialRating || 5);
  const [comment, setComment] = useState(initialComment || "");
  useEffect(() => {
    setRating(initialRating || 5);
    setComment(initialComment || "");
  }, [initialRating, initialComment, vendorId]);
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        padding: "14px",
        borderRadius: "10px",
        marginBottom: "12px",
        maxWidth: "520px",
      }}
    >
      <h4 style={{ margin: "0 0 10px" }}>{vendorName}</h4>
      <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
        Rating
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          style={{ marginLeft: "8px" }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>
      <textarea
        placeholder="Optional feedback"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: "10px" }}
      />
      <button
        type="button"
        onClick={() => onSave(vendorId, rating, comment)}
        style={{ width: "auto" }}
      >
        Save review
      </button>
    </div>
  );
}

const EventDetails = ({ event, goBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState("");
  const [vendorCategory, setVendorCategory] = useState("");
  const [collabOptions, setCollabOptions] = useState([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [selectedCollabId, setSelectedCollabId] = useState("");
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [serviceSelection, setServiceSelection] = useState({});
  const [vendors, setVendors] = useState([]);
  const [note, setNote] = useState("");
  const [budget, setBudget] = useState(0);
  const [budgetExtrasRows, setBudgetExtrasRows] = useState([]);
  const [checklistRows, setChecklistRows] = useState([]);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [checkInQr, setCheckInQr] = useState("");
  const [posterBannerUploading, setPosterBannerUploading] = useState(false);
  const [posterForm, setPosterForm] = useState({
    eventTitle: "",
    bannerImage: "",
    description: "",
    venue: "",
    date: "",
    time: "",
    highlights: "",
    schedule: "",
    signupOpen: true,
    maxGuests: 0,
  });
  const [removalReason, setRemovalReason] = useState({});
  const [privateGuests, setPrivateGuests] = useState([]);
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [photoShareBusy, setPhotoShareBusy] = useState(false);
  const [settlementPreview, setSettlementPreview] = useState(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [paySettlementBusy, setPaySettlementBusy] = useState(false);
  const [invoiceDownloadBusy, setInvoiceDownloadBusy] = useState(false);
  const [stallClientData, setStallClientData] = useState(null);
  const [stallBookingsLoading, setStallBookingsLoading] = useState(false);
  const [stallSettingsBusy, setStallSettingsBusy] = useState(false);
  const [stallLayoutBusy, setStallLayoutBusy] = useState(false);
  const [stallDraft, setStallDraft] = useState({
    enabled: false,
    count: 0,
    open: true,
  });
  const [invitationForm, setInvitationForm] = useState({
    cardColor: "#f8f2e7",
    fontFamily: "Georgia",
    pattern: "dots",
    titleText: "",
    bodyText: "",
    titlePlacement: "top",
    bodyPlacement: "middle",
    format: "png",
    imageData: "",
  });
  const [eventDeleteReason, setEventDeleteReason] = useState("");
  const INVITE_FONT_OPTIONS = ["Georgia", "Arial", "Courier New"];
  const INVITE_PATTERN_OPTIONS = ["dots", "stripes", "floral", "stars", "waves"];
  const VENDOR_CATEGORY_OPTIONS = [
    "photography",
    "catering",
    "decoration",
    "venue",
    "collabs",
  ];
  const alreadyLinkedVendorIds = useMemo(
    () =>
      new Set(
        (data?.vendors || []).map((item) =>
          (item.vendorId?._id || item.vendorId || "").toString()
        )
      ),
    [data]
  );
  const availableVendorsForCategory = useMemo(() => {
    if (!vendorCategory) return [];
    return vendors.filter((item) => {
      const itemVendorId = (item.vendorId || "").toString();
      if (item.category !== vendorCategory) return false;
      if (alreadyLinkedVendorIds.has(itemVendorId)) return false;
      if (
        vendorCategory === "venue" &&
        !portfolioHasBookableVenueSlot(item)
      ) {
        return false;
      }
      return true;
    });
  }, [vendors, vendorCategory, alreadyLinkedVendorIds]);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await axios.get(`/events/${event._id}`);
      setData(res.data);
      setBudget(res.data?.budget || 0);
      setBudgetExtrasRows(
        (res.data?.budgetExtras || []).map((row, i) => ({
          key: row._id ? String(row._id) : `extra-${i}-${row.label}`,
          label: row.label || "",
          amount:
            row.amount !== undefined && row.amount !== null
              ? String(row.amount)
              : "",
        }))
      );
      setChecklistRows(mapApiChecklistToState(res.data?.clientChecklist));
      setPosterForm({
        eventTitle: res.data?.poster?.eventTitle || res.data?.title || "",
        bannerImage: res.data?.poster?.bannerImage || "",
        description: res.data?.poster?.description || "",
        venue: res.data?.poster?.venue || res.data?.location || "",
        date: res.data?.poster?.date
          ? new Date(res.data.poster.date).toISOString().split("T")[0]
          : "",
        time: res.data?.poster?.time || "",
        highlights: (res.data?.poster?.highlights || []).join("\n"),
        schedule: (res.data?.poster?.schedule || []).join("\n"),
        signupOpen: res.data?.poster?.signupOpen ?? true,
        maxGuests: res.data?.poster?.maxGuests || 0,
      });
      setPrivateGuests(res.data?.privateGuestList || []);
      setInvitationForm({
        cardColor: res.data?.invitationCard?.cardColor || "#f8f2e7",
        fontFamily: res.data?.invitationCard?.fontFamily || "Georgia",
        pattern: res.data?.invitationCard?.pattern || "dots",
        titleText: res.data?.invitationCard?.titleText || res.data?.title || "",
        bodyText:
          res.data?.invitationCard?.bodyText || "You are invited to our private event.",
        titlePlacement: res.data?.invitationCard?.titlePlacement || "top",
        bodyPlacement: res.data?.invitationCard?.bodyPlacement || "middle",
        format: res.data?.invitationCard?.format || "png",
        imageData: res.data?.invitationCard?.imageData || "",
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [event._id]);

  useEffect(() => {
    fetchEvent();
    fetchVendors();
  }, [event?._id, fetchEvent]);

  useEffect(() => {
    if (!event?._id) return;
    const onVis = () => {
      if (document.visibilityState === "visible") fetchEvent();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [event?._id, fetchEvent]);

  const visibleTabs = useMemo(() => {
    if (!data) return PUBLIC_TABS;
    if (data.postClosureLocked) {
      return data.isPublic ? CLOSED_PUBLIC_TABS : CLOSED_PRIVATE_TABS;
    }
    const base = data.isPublic ? PUBLIC_TABS : PRIVATE_TABS;
    return base.filter((t) => {
      if (t === "reviews" && !data.postClosureLocked) return false;
      if (t === "settlement" && !data.postClosureLocked) return false;
      if (t === "stalls" && !data.isPublic) return false;
      return true;
    });
  }, [data]);

  useEffect(() => {
    if (!data) return;
    setStallDraft({
      enabled: !!data.stallsEnabled,
      count: Number(data.stallCount || 0),
      open: data.stallBookingOpen !== false,
    });
  }, [
    data?.stallsEnabled,
    data?.stallCount,
    data?.stallBookingOpen,
    data?._id,
  ]);

  useEffect(() => {
    if (activeTab !== "stalls" || !data?.isPublic || !event?._id) return;
    let cancelled = false;
    setStallBookingsLoading(true);
    (async () => {
      try {
        const res = await axios.get(`/events/${event._id}/stall-bookings`);
        if (!cancelled) setStallClientData(res.data);
      } catch {
        if (!cancelled) setStallClientData(null);
      } finally {
        if (!cancelled) setStallBookingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    data?.isPublic,
    event?._id,
    data?.stallsEnabled,
    data?.stallCount,
  ]);

  const editFrozen = useMemo(
    () =>
      Boolean(data?.postClosureLocked) &&
      activeTab !== "photoshare" &&
      activeTab !== "reviews" &&
      activeTab !== "settlement" &&
      activeTab !== "stalls",
    [data?.postClosureLocked, activeTab]
  );

  const pastDeadline = useMemo(() => isEventPastDeadline(data?.date), [data?.date]);

  const apiOrigin = useMemo(() => {
    const base = axios.defaults.baseURL || "";
    return base.replace(/\/api\/?$/, "") || "http://localhost:5000";
  }, []);

  const appOrigin = useMemo(() => {
    const envOrigin = (import.meta.env.VITE_PUBLIC_APP_ORIGIN || "").trim();
    if (envOrigin) return envOrigin.replace(/\/$/, "");
    if (typeof window !== "undefined") {
      return String(window.location.origin || "").replace(/\/$/, "");
    }
    return "";
  }, []);

  const sharePhotoGuestLink = useMemo(() => {
    if (!data?._id || !data?.photoShareToken || !appOrigin) return "";
    return `${appOrigin}/share-photos/${data._id}/${data.photoShareToken}`;
  }, [data?._id, data?.photoShareToken, appOrigin]);

  const stallLayoutDisplaySrc = useMemo(() => {
    const p = data?.stallLayoutImage;
    if (!p) return "";
    if (p.startsWith("http")) return p;
    return `${apiOrigin}${p}`;
  }, [data?.stallLayoutImage, apiOrigin]);

  const posterBannerDisplaySrc = useMemo(() => {
    const p = (posterForm.bannerImage || "").trim();
    if (!p) return "";
    if (p.startsWith("http")) return p;
    return `${apiOrigin}${p.startsWith("/") ? p : `/${p}`}`;
  }, [posterForm.bannerImage, apiOrigin]);

  const stallPublicUrl = useMemo(() => {
    if (!data?.isPublic || !event?._id || !appOrigin) return "";
    const slug = data.posterSlug || event._id;
    return `${appOrigin}/public/${slug}/stalls`;
  }, [data?.isPublic, data?.posterSlug, event?._id, appOrigin]);

  useEffect(() => {
    if (!data) return;
    if (!visibleTabs.includes(activeTab)) setActiveTab("overview");
  }, [data, activeTab, visibleTabs]);

  useEffect(() => {
    if (activeTab !== "settlement" || !data?.postClosureLocked || !event?._id) return;
    let cancelled = false;
    setSettlementLoading(true);
    (async () => {
      try {
        const res = await axios.get(`/events/${event._id}/settlement`);
        if (!cancelled) {
          setSettlementPreview(res.data);
        }
      } catch {
        if (!cancelled) setSettlementPreview(null);
      } finally {
        if (!cancelled) setSettlementLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, data?.postClosureLocked, event?._id, data?.settlementPaidAt]);

  const fetchVendors = async () => {
    try {
      const res = await axios.get("/portfolio/browse");
      setVendors(res.data || []);
    } catch {
      setVendors([]);
    }
  };

  useEffect(() => {
    setServiceSelection({});
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) {
      setSelectedPortfolio(null);
      return;
    }
    if (vendorCategory === "collabs") {
      setSelectedPortfolio(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`/portfolio/${vendorId}`);
        if (!cancelled) setSelectedPortfolio(res.data);
      } catch {
        if (!cancelled) setSelectedPortfolio(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, vendorCategory]);

  useEffect(() => {
    if (vendorCategory !== "collabs") return;
    let cancelled = false;
    setCollabLoading(true);
    (async () => {
      try {
        const res = await axios.get("/collabs/browse");
        if (!cancelled) setCollabOptions(res.data || []);
      } catch {
        if (!cancelled) setCollabOptions([]);
      } finally {
        if (!cancelled) setCollabLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorCategory]);

  const addVendor = async () => {
    if (!vendorCategory) {
      alert("Select vendor category");
      return;
    }
    if (vendorCategory === "collabs") {
      if (!selectedCollabId) {
        alert("Select a collab package");
        return;
      }
      try {
        const res = await axios.post(
          `/events/${event._id}/collabs/${selectedCollabId}/select`
        );
        setData(res.data);
        setVendorCategory("");
        setSelectedCollabId("");
        return;
      } catch (error) {
        alert(error?.response?.data?.message || "Collab selection failed");
        return;
      }
    }
    if (!vendorId) {
      alert("Select vendor");
      return;
    }
    if (!selectedPortfolio || selectedPortfolio.category !== vendorCategory) {
      alert("Could not load this vendor’s service catalog. Try again.");
      return;
    }
    const expected = computeExpectedCost(
      vendorCategory,
      selectedPortfolio,
      serviceSelection
    );
    if (expected <= 0) {
      alert(
        "Expected cost is 0 — configure the vendor’s services and your selections (dates, guest count, etc.)."
      );
      return;
    }
    const summary = summarizeSelection(
      vendorCategory,
      selectedPortfolio,
      serviceSelection
    );
    try {
      const res = await axios.post(`/events/${event._id}/vendors/request`, {
        vendorId,
        category: vendorCategory,
        offerAmount: expected,
        offerPackage: summary,
        serviceSelection: { ...serviceSelection, category: vendorCategory },
      });
      setData(res.data);
      setVendorId("");
      setVendorCategory("");
      setServiceSelection({});
      setSelectedPortfolio(null);
    } catch (error) {
      alert(error?.response?.data?.message || "Add vendor failed");
    }
  };

  const requestVendorRemoval = async (id) => {
    const reason = removalReason[id] || "";
    if (!reason.trim()) {
      alert("Please write a reason for admin");
      return;
    }
    try {
      await axios.post(`/events/${event._id}/vendors/${id}/remove-request`, {
        reason,
      });
      alert("Removal request sent to admin");
      setRemovalReason((prev) => ({ ...prev, [id]: "" }));
      fetchEvent();
    } catch (error) {
      alert(error?.response?.data?.message || "Removal request failed");
    }
  };

  const saveBudget = async () => {
    try {
      const res = await axios.patch(`/events/${event._id}`, {
        budget: Number(budget || 0),
      });
      setData(res.data);
    } catch {
      alert("Budget update failed");
    }
  };

  const saveBudgetExtras = async () => {
    try {
      const payload = budgetExtrasRows
        .map((row) => ({
          label: String(row.label || "").trim(),
          amount: Math.max(0, Number(row.amount || 0)),
        }))
        .filter((row) => row.label.length > 0);
      const res = await axios.patch(`/events/${event._id}`, {
        budgetExtras: payload,
      });
      setData(res.data);
      setBudgetExtrasRows(
        (res.data?.budgetExtras || []).map((row, i) => ({
          key: row._id ? String(row._id) : `extra-${i}-${row.label}`,
          label: row.label || "",
          amount:
            row.amount !== undefined && row.amount !== null
              ? String(row.amount)
              : "",
        }))
      );
    } catch {
      alert("Could not save other expenses");
    }
  };

  const saveChecklist = async () => {
    setChecklistSaving(true);
    try {
      const res = await axios.patch(`/events/${event._id}`, {
        clientChecklist: mapStateToApiPayload(checklistRows),
      });
      setData(res.data);
      setChecklistRows(mapApiChecklistToState(res.data?.clientChecklist));
    } catch {
      alert("Could not save checklist");
    } finally {
      setChecklistSaving(false);
    }
  };

  const startGuestPhotoSharing = async () => {
    setPhotoShareBusy(true);
    try {
      const res = await axios.post(`/events/${event._id}/photo-share/start`);
      setData(res.data.event);
      alert(
        `Photo sharing is live. Link emailed to ${res.data.emailedGuests} guest(s).`
      );
    } catch (e) {
      alert(e?.response?.data?.message || "Could not start photo sharing");
    } finally {
      setPhotoShareBusy(false);
    }
  };

  const resendGuestPhotoLinks = async () => {
    setPhotoShareBusy(true);
    try {
      const res = await axios.post(`/events/${event._id}/photo-share/resend-emails`);
      alert(`Link sent to ${res.data.emailedGuests} guest(s).`);
    } catch (e) {
      alert(e?.response?.data?.message || "Could not resend emails");
    } finally {
      setPhotoShareBusy(false);
    }
  };

  const downloadGuestPhotoZip = async () => {
    setPhotoShareBusy(true);
    try {
      const res = await axios.get(`/events/${event._id}/photo-share/zip`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data.title || "event").replace(/[^\w\s-]/g, "").slice(0, 60) || "event"}-guest-photos.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.response?.data?.message || "Download failed");
    } finally {
      setPhotoShareBusy(false);
    }
  };

  const emailGuestPhotoZip = async () => {
    setPhotoShareBusy(true);
    try {
      const res = await axios.post(`/events/${event._id}/photo-share/email-zip`);
      const emailedGuests = Number(res.data?.emailedGuests || 0);
      const failedGuests = Number(res.data?.failedGuests || 0);
      const totalGuests = Number(res.data?.totalGuests || emailedGuests + failedGuests);
      if (res.data.attached) {
        alert(
          `Zip sent to ${emailedGuests}/${totalGuests} guests${failedGuests ? ` (${failedGuests} failed)` : ""}.`
        );
      } else {
        alert(
          `Notified ${emailedGuests}/${totalGuests} guests${failedGuests ? ` (${failedGuests} failed)` : ""} — attachment was too large for email.`
        );
      }
      const refreshed = await axios.get(`/events/${event._id}`);
      setData(refreshed.data);
    } catch (e) {
      alert(e?.response?.data?.message || "Could not email zip");
    } finally {
      setPhotoShareBusy(false);
    }
  };

  const saveSettings = async (payload) => {
    try {
      const res = await axios.patch(`/events/${event._id}`, payload);
      setData(res.data);
    } catch {
      alert("Update failed");
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      const res = await axios.post(`/events/${event._id}/notes`, {
        text: note,
      });
      setData(res.data);
      setNote("");
    } catch {
      alert("Add note failed");
    }
  };

  const fetchAttendees = async () => {
    try {
      const res = await axios.get(`/events/${event._id}/attendees`);
      setAttendees(res.data || []);
    } catch {
      setAttendees([]);
    }
  };

  const checkInAttendee = async () => {
    if (!checkInQr.trim()) return;
    try {
      await axios.post(`/events/${event._id}/attendees/check-in`, {
        qrCode: checkInQr.trim(),
      });
      setCheckInQr("");
      fetchAttendees();
      fetchEvent();
      alert("Check-in successful");
    } catch (error) {
      alert(error?.response?.data?.message || "Check-in failed");
    }
  };

  const sendReminders = async () => {
    try {
      const res = await axios.post(`/events/${event._id}/attendees/send-reminders`);
      fetchEvent();
      alert(`Reminders sent: ${res.data.total}`);
    } catch {
      alert("Reminder send failed");
    }
  };

  const uploadPosterBannerFile = async (file) => {
    if (!file || !event?._id) return;
    setPosterBannerUploading(true);
    try {
      const fd = new FormData();
      fd.append("banner", file);
      const res = await axios.post(
        `/events/${event._id}/poster/banner`,
        fd
      );
      const path = res.data?.bannerImage;
      if (path) {
        setPosterForm((prev) => ({ ...prev, bannerImage: path }));
      }
      await fetchEvent();
    } catch (e) {
      alert(e?.response?.data?.message || "Banner upload failed");
    } finally {
      setPosterBannerUploading(false);
    }
  };

  const savePoster = async () => {
    try {
      const payload = {
        poster: {
          eventTitle: posterForm.eventTitle,
          bannerImage: posterForm.bannerImage,
          description: posterForm.description,
          venue: posterForm.venue,
          date: posterForm.date || null,
          time: posterForm.time,
          highlights: posterForm.highlights
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
          schedule: posterForm.schedule
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
          signupOpen: Boolean(posterForm.signupOpen),
          maxGuests: Number(posterForm.maxGuests || 0),
        },
      };
      const res = await axios.patch(`/events/${event._id}`, payload);
      setData(res.data);
      alert("Poster saved");
    } catch {
      alert("Poster save failed");
    }
  };

  const drawPattern = (ctx, pattern, width, height) => {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#6b7280";
    ctx.fillStyle = "#6b7280";
    if (pattern === "dots") {
      for (let x = 20; x < width; x += 30) {
        for (let y = 20; y < height; y += 30) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === "stripes") {
      for (let x = -height; x < width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height, height);
        ctx.stroke();
      }
    } else if (pattern === "floral") {
      for (let x = 40; x < width; x += 120) {
        for (let y = 40; y < height; y += 120) {
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x + 12, y, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x - 12, y, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else if (pattern === "stars") {
      for (let x = 30; x < width; x += 70) {
        for (let y = 30; y < height; y += 70) {
          ctx.fillRect(x, y, 2, 10);
          ctx.fillRect(x - 4, y + 4, 10, 2);
        }
      }
    } else if (pattern === "waves") {
      for (let y = 30; y < height; y += 25) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 20) {
          const dy = Math.sin((x / 50) * Math.PI) * 6;
          if (x === 0) ctx.moveTo(x, y + dy);
          else ctx.lineTo(x, y + dy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const yFromPlacement = (placement) => {
    if (placement === "top") return 90;
    if (placement === "middle") return 210;
    return 330;
  };

  const buildInvitationImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 560;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = invitationForm.cardColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawPattern(ctx, invitationForm.pattern, canvas.width, canvas.height);

    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.font = `bold 58px "${invitationForm.fontFamily}"`;
    ctx.fillText(
      invitationForm.titleText || data.title,
      canvas.width / 2,
      yFromPlacement(invitationForm.titlePlacement)
    );

    ctx.font = `32px "${invitationForm.fontFamily}"`;
    const body = invitationForm.bodyText || "You are invited.";
    ctx.fillText(
      body,
      canvas.width / 2,
      yFromPlacement(invitationForm.bodyPlacement)
    );

    const mime =
      invitationForm.format === "jpeg" ? "image/jpeg" : "image/png";
    return canvas.toDataURL(mime, 0.92);
  };

  const invitationLivePreview = useMemo(() => {
    if (!data || data.isPublic || activeTab !== "invitations") return "";
    try {
      return buildInvitationImage();
    } catch {
      return "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildInvitationImage reads invitationForm + data.title
  }, [
    activeTab,
    data?.title,
    data?.isPublic,
    invitationForm.cardColor,
    invitationForm.fontFamily,
    invitationForm.pattern,
    invitationForm.titleText,
    invitationForm.bodyText,
    invitationForm.titlePlacement,
    invitationForm.bodyPlacement,
    invitationForm.format,
  ]);

  const normalizeGuestEmail = (raw) => {
    const v = String(raw || "").trim().toLowerCase();
    return v;
  };

  const addGuestToList = () => {
    const email = normalizeGuestEmail(newGuestEmail);
    if (!email || !email.includes("@")) {
      alert("Enter a valid email");
      return;
    }
    if (privateGuests.includes(email)) {
      alert("That email is already on the list");
      return;
    }
    setPrivateGuests((prev) => [...prev, email]);
    setNewGuestEmail("");
  };

  const removeGuest = (email) => {
    setPrivateGuests((prev) => prev.filter((e) => e !== email));
  };

  const saveGuestList = async () => {
    if (data.isPublic) return;
    try {
      const res = await axios.patch(`/events/${event._id}`, {
        privateGuestList: privateGuests,
      });
      setData(res.data);
      setPrivateGuests(res.data?.privateGuestList || []);
      alert("Guest list saved");
    } catch {
      alert("Failed to save guest list");
    }
  };

  const saveInvitationCard = async () => {
    if (data.isPublic) {
      alert("Invitation card is only for private events");
      return;
    }
    try {
      const imageData = buildInvitationImage();
      const payload = {
        invitationCard: {
          ...invitationForm,
          imageData,
        },
      };
      const res = await axios.patch(`/events/${event._id}`, payload);
      setData(res.data);
      setInvitationForm((prev) => ({ ...prev, imageData }));
      alert("Invitation card saved (previous design replaced)");
    } catch {
      alert("Save invitation card failed");
    }
  };

  const sendPrivateInvites = async () => {
    if (data.isPublic) {
      alert("This works only for private events");
      return;
    }
    if (!privateGuests.length) {
      alert("Add at least one guest email on the Guest list tab");
      return;
    }
    if (!data.invitationCard?.imageData) {
      alert("Save your invitation card in the Invitations tab before sending");
      return;
    }
    try {
      await axios.patch(`/events/${event._id}`, {
        privateGuestList: privateGuests,
      });
      const res = await axios.post(`/events/${event._id}/invitations/send`);
      fetchEvent();
      alert(`Invitation email sent to ${res.data.total} address(es)`);
    } catch (error) {
      alert(error?.response?.data?.message || "Send invitation failed");
    }
  };

  const requestEventDelete = async () => {
    if (!eventDeleteReason.trim()) {
      alert("Please add reason for event deletion");
      return;
    }
    try {
      await axios.post(`/events/${event._id}/delete-request`, {
        reason: eventDeleteReason.trim(),
      });
      alert("Event deletion request sent to admin");
      setEventDeleteReason("");
      goBack();
    } catch (error) {
      alert(error?.response?.data?.message || "Event deletion request failed");
    }
  };

  const requestEventClosure = async () => {
    if (
      !window.confirm(
        "Send a request to admin to close this event? After approval, you won’t be able to change most of this event — only Photo sharing, vendor reviews, and Messages (sidebar) will stay available."
      )
    ) {
      return;
    }
    try {
      await axios.post(`/events/${event._id}/closure-request`);
      await fetchEvent();
      alert("Closure request sent. An admin will review it.");
    } catch (error) {
      alert(error?.response?.data?.message || "Closure request failed");
    }
  };

  const paySettlementNow = async () => {
    if (
      !window.confirm(
        "Simulate payment to Planit? Vendor wallets will be credited and commission recorded — no real money is charged."
      )
    ) {
      return;
    }
    setPaySettlementBusy(true);
    try {
      await axios.post(`/events/${event._id}/settlement/pay`);
      await fetchEvent();
      const s = await axios.get(`/events/${event._id}/settlement`);
      setSettlementPreview(s.data);
      alert("Payment recorded successfully.");
    } catch (error) {
      alert(error?.response?.data?.message || "Payment failed");
    } finally {
      setPaySettlementBusy(false);
    }
  };

  const downloadClientEventInvoice = async () => {
    if (!event?._id) return;
    setInvoiceDownloadBusy(true);
    try {
      await downloadPdf(
        `/invoices/client/event/${event._id}`,
        `planit-invoice-${event._id}.pdf`
      );
    } catch (err) {
      alert(err?.message || "Could not download invoice");
    } finally {
      setInvoiceDownloadBusy(false);
    }
  };

  const saveStallSettings = async () => {
    if (stallDraft.enabled && Number(stallDraft.count || 0) < 1) {
      alert("Set the number of stalls (at least 1) or disable stall booking.");
      return;
    }
    setStallSettingsBusy(true);
    try {
      await axios.patch(`/events/${event._id}`, {
        stallsEnabled: stallDraft.enabled,
        stallCount: Math.max(0, Math.floor(Number(stallDraft.count || 0))),
        stallBookingOpen: stallDraft.open,
      });
      await fetchEvent();
      try {
        const sb = await axios.get(`/events/${event._id}/stall-bookings`);
        setStallClientData(sb.data);
      } catch {
        /* ignore */
      }
      alert("Stall settings saved.");
    } catch (e) {
      alert(e?.response?.data?.message || "Save failed");
    } finally {
      setStallSettingsBusy(false);
    }
  };

  const uploadStallLayout = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStallLayoutBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await axios.patch(`/events/${event._id}`, {
        stallLayoutImage: res.data.url,
      });
      await fetchEvent();
      try {
        const sb = await axios.get(`/events/${event._id}/stall-bookings`);
        setStallClientData(sb.data);
      } catch {
        /* ignore */
      }
    } catch {
      alert("Image upload failed");
    } finally {
      setStallLayoutBusy(false);
      e.target.value = "";
    }
  };

  const submitVendorReview = async (vendorId, rating, comment) => {
    const r = Number(rating);
    if (!r || r < 1 || r > 5) {
      alert("Please choose a rating from 1 to 5");
      return;
    }
    try {
      const res = await axios.post(`/events/${event._id}/vendor-reviews`, {
        vendorId,
        rating: r,
        comment: String(comment || "").trim(),
      });
      setData((prev) => ({
        ...prev,
        myVendorReviews: [
          ...(prev.myVendorReviews || []).filter(
            (x) => x.vendorId?.toString() !== vendorId.toString()
          ),
          res.data,
        ],
      }));
      alert("Review saved.");
    } catch (error) {
      alert(error?.response?.data?.message || "Could not save review");
    }
  };

  const totalSlots = useMemo(() => {
    if (!data?.vendors?.length) return 0;
    return data.vendors.filter(vendorIsHired).length;
  }, [data]);

  const budgetStats = useMemo(() => {
    if (!data) {
      return {
        target: 0,
        used: 0,
        remaining: 0,
        pct: 0,
        vendorSpend: 0,
        extrasSpend: 0,
        over: false,
      };
    }
    const target = Number(data.budget || 0);
    const vendorSpend = (data.vendors || []).reduce((sum, v) => {
      if (!vendorIsHired(v)) return sum;
      return sum + Number(v.offerAmount || 0);
    }, 0);
    const extrasSpend = (data.budgetExtras || []).reduce(
      (sum, x) => sum + Number(x.amount || 0),
      0
    );
    const used =
      Math.round((vendorSpend + extrasSpend) * 100) / 100;
    const remaining = target - used;
    const pct =
      target > 0 ? Math.min(100, Math.round((used / target) * 1000) / 10) : 0;
    return {
      target,
      used,
      remaining,
      pct,
      vendorSpend,
      extrasSpend,
      over: target > 0 && used > target,
    };
  }, [data]);

  if (loading) return <p>Loading event...</p>;
  if (!data) return <p>Event not found.</p>;

  return (
    <>
      <div style={{ marginBottom: "16px", maxWidth: "960px" }}>
        {data.postClosureLocked && (
          <div
            style={{
              padding: "12px 16px",
              background: "#ecfdf5",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              marginBottom: "12px",
            }}
          >
            <strong>Event closed by admin.</strong> You can still use{" "}
            <strong>Photo sharing</strong>, <strong>Vendor reviews</strong>,{" "}
            <strong>Payment</strong>, view <strong>Stalls</strong>, and{" "}
            <strong>Messages</strong> in the sidebar. Other changes are disabled.
          </div>
        )}
        {editFrozen && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "10px",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            Editing is disabled on this tab while the event is closed.
          </div>
        )}
        {pastDeadline && !data.postClosureLocked && (
          <div
            style={{
              padding: "12px 16px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              marginBottom: "12px",
            }}
          >
            {data.closureRequest?.status === "pending" ? (
              <p style={{ margin: 0 }}>
                <strong>Closure request pending</strong> — waiting for admin approval.
              </p>
            ) : (
              <>
                <p style={{ margin: "0 0 10px", color: "#374151" }}>
                  The scheduled event date has passed. Request closure to lock planning — only photo
                  sharing, chat, and (after closure) vendor reviews stay available.
                </p>
                <button type="button" onClick={requestEventClosure} style={{ width: "auto" }}>
                  Request to close event (send to admin)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    <div style={{ display: "flex", gap: "20px" }}>
      <div style={{ minWidth: "180px" }}>
        <button onClick={goBack}>⬅ Back</button>
        <h3 style={{ marginTop: "10px" }}>Workspace</h3>
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              display: "block",
              marginBottom: "8px",
              background: activeTab === tab ? "#333" : "#eee",
              color: activeTab === tab ? "#fff" : "#000",
            }}
          >
            {TAB_LABELS[tab] || tab}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
        <h2>{data.title}</h2>
        <p>
          {new Date(data.date).toLocaleDateString()} - {data.location}
        </p>
        <p>Status: {data.status}</p>

        {activeTab === "overview" && (
          <div className="card">
            <p>{data.description || "No description yet."}</p>
            <p>Budget: {data.budget}</p>
            <p>Accepted vendors: {totalSlots}</p>
            <p>Timeline items: {data.timeline?.length || 0}</p>
            <p>Notes: {data.notes?.length || 0}</p>
            {data.isPublic ? (
              <p>
                This event is <strong>public</strong>: use Poster & signup and Attendees
                for OTP registration.
              </p>
            ) : (
              <p>
                This event is <strong>private</strong>: use Guest list and Invitations
                for email invites (no public signup page).
              </p>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div>
            <h3>Timeline</h3>
            {data.timeline?.length ? (
              data.timeline
                .slice()
                .reverse()
                .map((item, idx) => (
                  <div
                    key={`${item.createdAt}-${idx}`}
                    style={{
                      borderLeft: "3px solid #333",
                      paddingLeft: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <strong>{item.text}</strong>
                    <p style={{ margin: 0, color: "#666" }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
            ) : (
              <p>No timeline entries yet.</p>
            )}
          </div>
        )}

        {activeTab === "vendors" && (
          <div>
            <h3>Manage Vendors</h3>
            <p style={{ color: "#555", maxWidth: "720px", marginBottom: "12px" }}>
              Pick a category, then a vendor. Their published services appear below —
              choose halls, menus, packages, or décor items. The{" "}
              <strong>expected cost</strong> updates automatically from your selections.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              <select
                value={vendorCategory}
                onChange={(e) => {
                  setVendorCategory(e.target.value);
                  setVendorId("");
                  setSelectedCollabId("");
                }}
                disabled={editFrozen}
              >
                <option value="">Vendor Category</option>
                {VENDOR_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                disabled={editFrozen || !vendorCategory || vendorCategory === "collabs"}
              >
                <option value="">
                  {vendorCategory === "collabs"
                    ? "Not required for collab package"
                    : vendorCategory
                    ? "Select vendor"
                    : "Select category first"}
                </option>
                {availableVendorsForCategory.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.displayName}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addVendor} disabled={editFrozen}>
                Send request with selection
              </button>
            </div>
            {vendorCategory !== "collabs" && (
              <ServiceSelectionPanel
                category={vendorCategory}
                portfolio={
                  selectedPortfolio?.category === vendorCategory
                    ? selectedPortfolio
                    : null
                }
                value={serviceSelection}
                onChange={setServiceSelection}
                defaultEventDate={
                  data?.date
                    ? new Date(data.date).toISOString().split("T")[0]
                    : ""
                }
              />
            )}
            {vendorCategory === "collabs" && (
              <div className="card" style={{ marginTop: "10px", maxWidth: "760px" }}>
                <h4 style={{ marginTop: 0 }}>Available collab packages</h4>
                {collabLoading ? (
                  <p>Loading packages…</p>
                ) : collabOptions.length === 0 ? (
                  <p style={{ color: "#6b7280" }}>No active collab packages available.</p>
                ) : (
                  <>
                    <select
                      value={selectedCollabId}
                      onChange={(e) => setSelectedCollabId(e.target.value)}
                      style={{ marginBottom: "10px" }}
                    >
                      <option value="">Select collab package</option>
                      {collabOptions.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.title} - total {Number(p.finalPrice || 0).toLocaleString()}
                        </option>
                      ))}
                    </select>
                    {selectedCollabId && (
                      <div style={{ fontSize: "14px", color: "#374151" }}>
                        {(() => {
                          const p = collabOptions.find((x) => x._id === selectedCollabId);
                          if (!p) return null;
                          return (
                            <>
                              <p style={{ marginTop: 0 }}>{p.description || "No description"}</p>
                              <ul style={{ paddingLeft: "18px" }}>
                                {(p.members || []).map((m) => (
                                  <li key={String(m.vendorId)}>
                                    {m.vendorName} ({m.category}) - {m.time || "time not set"} -{" "}
                                    {m.facilities || "facilities not set"}
                                  </li>
                                ))}
                              </ul>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {vendorCategory &&
              vendorCategory !== "collabs" &&
              availableVendorsForCategory.length === 0 && (
              <p>
                {vendorCategory === "venue"
                  ? "No venue vendors available here: each must have at least one upcoming calendar day with open slots (not fully booked), and vendors already on this event are hidden."
                  : "No available vendors in this category (already requested or already in this event are hidden)."}
              </p>
            )}

            {data.vendors?.length ? (
              data.vendors.map((item) => (
                <div key={item.vendorId?._id || item.vendorId} className="card">
                  <p>
                    {item.vendorId?.name || "Vendor"} - {item.category || "N/A"}
                  </p>
                  <p>Request: {item.requestStatus || "pending"}</p>
                  <p>
                    Expected cost:{" "}
                    <strong>{Number(item.offerAmount || 0).toLocaleString()}</strong>
                  </p>
                  <p style={{ fontSize: "14px", color: "#444" }}>
                    {item.offerPackage || "—"}
                  </p>
                  {item.serviceSelection &&
                    Object.keys(item.serviceSelection).length > 0 && (
                      <details style={{ fontSize: "12px", marginTop: "6px" }}>
                        <summary>Selection details</summary>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            marginTop: "6px",
                            background: "#f9fafb",
                            padding: "8px",
                            borderRadius: "6px",
                          }}
                        >
                          {JSON.stringify(item.serviceSelection, null, 2)}
                        </pre>
                      </details>
                    )}
                  <p>
                    Counted in event:{" "}
                    {vendorIsHired(item) ? "Yes" : "No"}
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <input
                      placeholder="Reason to remove vendor (admin review)"
                      value={removalReason[item.vendorId?._id || item.vendorId] || ""}
                      onChange={(e) =>
                        setRemovalReason((prev) => ({
                          ...prev,
                          [item.vendorId?._id || item.vendorId]: e.target.value,
                        }))
                      }
                      disabled={editFrozen}
                    />
                    <button
                      onClick={() =>
                        requestVendorRemoval(item.vendorId?._id || item.vendorId)
                      }
                      disabled={editFrozen}
                    >
                      Request Remove (Admin)
                    </button>
                  </div>
                  {item.checklist?.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <strong>Vendor Checklist</strong>
                      {item.checklist.map((row) => (
                        <p key={row._id}>
                          [{row.done ? "x" : " "}] {row.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No vendors selected.</p>
            )}
          </div>
        )}

        {activeTab === "budget" && (
          <div className="card card--fluid">
            <h3>Smart budget tracker</h3>
            <p style={{ color: "#555", marginBottom: "16px", maxWidth: "720px" }}>
              Your <strong>planned budget</strong> is the target.{" "}
              <strong>Spend</strong> updates automatically when a vendor accepts your
              offer (hired). Add <strong>other expenses</strong> (rentals, décor, etc.)
              so remaining stays accurate.
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                Planned budget (target)
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  style={{ maxWidth: "220px", margin: 0 }}
                />
                <button
                  type="button"
                  onClick={saveBudget}
                  disabled={editFrozen}
                  style={{ width: "auto" }}
                >
                  Save target
                </button>
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "12px",
                background: budgetStats.over ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${budgetStats.over ? "#fecaca" : "#bbf7d0"}`,
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontWeight: 600 }}>Total spend</span>
                <span>
                  {budgetStats.used.toLocaleString()} /{" "}
                  {budgetStats.target.toLocaleString()}{" "}
                  <span style={{ color: "#6b7280", fontWeight: 400 }}>
                    ({budgetStats.pct}% of target)
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: "12px",
                  borderRadius: "8px",
                  background: "#e5e7eb",
                  marginTop: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, budgetStats.target > 0 ? (budgetStats.used / budgetStats.target) * 100 : 0)}%`,
                    borderRadius: "8px",
                    background: budgetStats.over
                      ? "linear-gradient(90deg,#ef4444,#f97316)"
                      : budgetStats.pct > 85
                        ? "linear-gradient(90deg,#eab308,#f59e0b)"
                        : "linear-gradient(90deg,#22c55e,#16a34a)",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: "14px" }}>
                <strong>Remaining:</strong>{" "}
                <span style={{ color: budgetStats.over ? "#b91c1c" : "#15803d" }}>
                  {budgetStats.remaining.toLocaleString()}
                </span>
                {budgetStats.over && (
                  <span style={{ color: "#b91c1c", marginLeft: "8px" }}>
                    — over planned budget
                  </span>
                )}
              </p>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <h4 style={{ margin: "0 0 8px" }}>Vendor hires (automatic)</h4>
              <p style={{ fontSize: "13px", color: "#666", margin: "0 0 10px" }}>
                When a vendor accepts your request, their offer amount is included here.
              </p>
              {(data.vendors || []).filter(vendorIsHired).length === 0 ? (
                <p style={{ color: "#888" }}>No hired vendors yet.</p>
              ) : (
                <ul style={{ paddingLeft: "18px", margin: 0 }}>
                  {(data.vendors || [])
                    .filter(vendorIsHired)
                    .map((item) => (
                      <li key={item.vendorId?._id || item.vendorId}>
                        {item.vendorId?.name || "Vendor"} ({item.category}) —{" "}
                        {Number(item.offerAmount || 0).toLocaleString()}
                      </li>
                    ))}
                </ul>
              )}
              <p style={{ marginTop: "8px", fontSize: "14px" }}>
                Subtotal: <strong>{budgetStats.vendorSpend.toLocaleString()}</strong>
              </p>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ margin: "0 0 8px" }}>Other expenses</h4>
              <p style={{ fontSize: "13px", color: "#666", margin: "0 0 10px" }}>
                Track extra costs so you can stay near your target.
              </p>
              {budgetExtrasRows.map((row) => (
                <div
                  key={row.key}
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginBottom: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    placeholder="Label (e.g. Venue deposit)"
                    value={row.label}
                    onChange={(e) =>
                      setBudgetExtrasRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key ? { ...r, label: e.target.value } : r
                        )
                      )
                    }
                    style={{ flex: "1 1 200px", margin: 0 }}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) =>
                      setBudgetExtrasRows((prev) =>
                        prev.map((r) =>
                          r.key === row.key ? { ...r, amount: e.target.value } : r
                        )
                      )
                    }
                    style={{ width: "140px", margin: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setBudgetExtrasRows((prev) =>
                        prev.filter((r) => r.key !== row.key)
                      )
                    }
                    disabled={editFrozen}
                    style={{ width: "auto", padding: "10px 14px" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() =>
                    setBudgetExtrasRows((prev) => [
                      ...prev,
                      { key: `new-${Date.now()}`, label: "", amount: "" },
                    ])
                  }
                  disabled={editFrozen}
                  style={{ width: "auto" }}
                >
                  Add expense line
                </button>
                <button
                  type="button"
                  onClick={saveBudgetExtras}
                  disabled={editFrozen}
                  style={{ width: "auto" }}
                >
                  Save other expenses
                </button>
              </div>
              <p style={{ marginTop: "10px", fontSize: "14px" }}>
                Other expenses subtotal:{" "}
                <strong>{budgetStats.extrasSpend.toLocaleString()}</strong>
              </p>
            </div>

            <p style={{ fontSize: "13px", color: "#666", marginBottom: 0 }}>
              Hired vendors: <strong>{totalSlots}</strong>. Total spend is vendor offers
              (accepted) plus other expenses — stored as budget used.
            </p>
          </div>
        )}

        {activeTab === "checklist" && (
          <EventPlanningChecklist
            rows={checklistRows}
            setRows={setChecklistRows}
            onSave={saveChecklist}
            saving={checklistSaving}
            readOnly={editFrozen}
          />
        )}

        {activeTab === "poster" && data.isPublic && (
          <div className="card">
            <h3>Public poster & signup</h3>
            <p style={{ color: "#555" }}>
              Share the poster link or QR so guests can register with OTP. This event
              was created as <strong>public</strong>; visibility cannot be changed later.
            </p>
            <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
              <input
                placeholder="Poster title"
                value={posterForm.eventTitle}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, eventTitle: e.target.value })
                }
              />
              <label style={{ display: "block", fontSize: "14px", color: "#374151" }}>
                Banner image
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={editFrozen || posterBannerUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) uploadPosterBannerFile(f);
                  }}
                  style={{ display: "block", marginTop: "6px" }}
                />
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                  Choose a file or use your camera on a phone. Uploads immediately
                  (max ~8MB). Save poster below to persist other fields.
                </span>
              </label>
              {posterBannerUploading ? (
                <p style={{ fontSize: "13px", color: "#6b7280" }}>Uploading…</p>
              ) : null}
              {posterBannerDisplaySrc ? (
                <div style={{ marginTop: "10px" }}>
                  <img
                    src={posterBannerDisplaySrc}
                    alt="Banner preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 220,
                      borderRadius: "12px",
                      objectFit: "cover",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <button
                    type="button"
                    disabled={editFrozen}
                    onClick={() =>
                      setPosterForm((prev) => ({ ...prev, bannerImage: "" }))
                    }
                    style={{ marginTop: "8px", width: "auto" }}
                  >
                    Remove banner
                  </button>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
                    Click <strong>Save poster</strong> after removing so the public page
                    updates.
                  </p>
                </div>
              ) : null}
              <input
                placeholder="Venue"
                value={posterForm.venue}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, venue: e.target.value })
                }
              />
              <input
                type="date"
                value={posterForm.date}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, date: e.target.value })
                }
              />
              <input
                placeholder="Time (e.g. 5:00 PM)"
                value={posterForm.time}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, time: e.target.value })
                }
              />
              <textarea
                placeholder="Poster description"
                value={posterForm.description}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, description: e.target.value })
                }
              />
              <textarea
                placeholder="Highlights (one line each)"
                value={posterForm.highlights}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, highlights: e.target.value })
                }
              />
              <textarea
                placeholder="Schedule (one line each)"
                value={posterForm.schedule}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, schedule: e.target.value })
                }
              />
              <label>
                <input
                  type="checkbox"
                  checked={posterForm.signupOpen}
                  onChange={(e) =>
                    setPosterForm({ ...posterForm, signupOpen: e.target.checked })
                  }
                />
                Signup Open
              </label>
              <input
                type="number"
                min="0"
                placeholder="Max guests (0 means unlimited)"
                value={posterForm.maxGuests}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, maxGuests: e.target.value })
                }
              />
              <button type="button" onClick={savePoster}>
                Save Poster
              </button>
            </div>
            <p style={{ marginTop: "16px" }}>
              Public link: /public/{data.posterSlug || data._id}
            </p>
            <p>Scan QR to open signup page:</p>
            <img
              alt="signup qr"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                `${appOrigin}/public/${data.posterSlug || data._id}`
              )}`}
            />
            {data.stallsEnabled && data.stallCount > 0 && stallPublicUrl && (
              <div style={{ marginTop: "20px" }}>
                <p style={{ marginBottom: "6px" }}>
                  <strong>Stall booking</strong> (separate from guest signup):
                </p>
                <p style={{ fontSize: "14px", wordBreak: "break-all" }}>{stallPublicUrl}</p>
                <p style={{ marginTop: "8px" }}>Scan QR to open the stall map:</p>
                <img
                  alt="stall booking qr"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(stallPublicUrl)}`}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "stalls" && data.isPublic && (
          <div className="card card--fluid">
            <h3>Stall booking</h3>
            {data.postClosureLocked ? (
              <p style={{ color: "#92400e", marginBottom: "12px" }}>
                Event is closed. Stall settings are locked. You can only view assigned stalls and
                booking details below.
              </p>
            ) : (
              <>
                <p style={{ color: "#555", maxWidth: "720px", marginBottom: "16px" }}>
                  For fairs and markets: set how many numbered stalls you have, upload a layout image
                  (with stall numbers on it), and share the public link or QR from the{" "}
                  <strong>Poster &amp; signup</strong> tab. Bookers verify by email OTP and describe
                  what they will sell. Switching the event to private turns stall booking off.
                </p>
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    maxWidth: "480px",
                    marginBottom: "20px",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={stallDraft.enabled}
                      onChange={(e) =>
                        setStallDraft((d) => ({ ...d, enabled: e.target.checked }))
                      }
                    />
                    Enable stall booking
                  </label>
                  <label>
                    Number of stalls
                    <input
                      type="number"
                      min="0"
                      value={stallDraft.count}
                      onChange={(e) =>
                        setStallDraft((d) => ({ ...d, count: e.target.value }))
                      }
                      style={{ marginLeft: "8px", width: "100px" }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={stallDraft.open}
                      onChange={(e) =>
                        setStallDraft((d) => ({ ...d, open: e.target.checked }))
                      }
                    />
                    Accept new stall bookings
                  </label>
                  <div>
                    <span style={{ display: "block", marginBottom: "6px" }}>Stall layout image</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={stallLayoutBusy}
                      onChange={uploadStallLayout}
                    />
                    {stallLayoutBusy && <span style={{ marginLeft: "8px" }}>Uploading…</span>}
                  </div>
                  <button
                    type="button"
                    onClick={saveStallSettings}
                    disabled={stallSettingsBusy}
                    style={{ width: "fit-content" }}
                  >
                    {stallSettingsBusy ? "Saving…" : "Save stall settings"}
                  </button>
                </div>
              </>
            )}
            {stallLayoutDisplaySrc && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "15px" }}>Current layout</h4>
                <img
                  src={stallLayoutDisplaySrc}
                  alt="Stall layout"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "360px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                  }}
                />
              </div>
            )}
            {stallPublicUrl && (
              <p style={{ fontSize: "14px", wordBreak: "break-all", marginBottom: "20px" }}>
                <strong>Public stall page:</strong> {stallPublicUrl}
              </p>
            )}
            <h4 style={{ fontSize: "15px" }}>Stall map</h4>
            {stallBookingsLoading ? (
              <p>Loading stall data…</p>
            ) : !stallClientData?.stallsEnabled || !data.stallsEnabled ? (
              <p style={{ color: "#6b7280" }}>Enable stall booking and set a stall count to see the map.</p>
            ) : (
              <>
                <p style={{ marginBottom: "10px", color: "#374151" }}>
                  Assigned stalls: <strong>{(stallClientData.bookings || []).length}</strong> /{" "}
                  <strong>{Math.max(0, Number(stallClientData.stallCount || 0))}</strong>
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: "10px",
                    maxWidth: "720px",
                  }}
                >
                  {Array.from(
                    { length: Math.max(0, Number(stallClientData.stallCount || 0)) },
                    (_, i) => i + 1
                  ).map((num) => {
                    const b = (stallClientData.bookings || []).find(
                      (x) => x.stallNumber === num
                    );
                    const booked = Boolean(b);
                    return (
                      <div
                        key={num}
                        style={{
                          padding: "12px 10px",
                          borderRadius: "10px",
                          border: "1px solid #e5e7eb",
                          background: booked ? "#22c55e" : "#f9fafb",
                          color: booked ? "#fff" : "#111",
                          minHeight: "88px",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>#{num}</div>
                        {booked ? (
                          <div style={{ fontSize: "12px", marginTop: "6px", lineHeight: 1.35 }}>
                            <div>{b.name}</div>
                            <div style={{ opacity: 0.95 }}>{b.email}</div>
                            {b.phone ? <div>{b.phone}</div> : null}
                            <div style={{ marginTop: "6px" }}>{b.sellingDescription}</div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "12px", marginTop: "6px", opacity: 0.7 }}>
                            Available
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "guestlist" && !data.isPublic && (
          <div className="card">
            <h3>Guest list</h3>
            <p style={{ color: "#555", maxWidth: "560px" }}>
              Build the list of email addresses that may receive your invitation.
              Click Save guest list before sending invitations from the Invitations tab.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              <input
                type="email"
                placeholder="guest@email.com"
                value={newGuestEmail}
                onChange={(e) => setNewGuestEmail(e.target.value)}
                style={{ minWidth: "220px" }}
              />
              <button type="button" onClick={addGuestToList}>
                Add guest
              </button>
              <button type="button" onClick={saveGuestList}>
                Save guest list
              </button>
            </div>
            {privateGuests.length === 0 ? (
              <p>No guests yet.</p>
            ) : (
              <ul style={{ paddingLeft: "18px", maxWidth: "480px" }}>
                {privateGuests.map((email) => (
                  <li
                    key={email}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ flex: 1 }}>{email}</span>
                    <button type="button" onClick={() => removeGuest(email)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "invitations" && !data.isPublic && (
          <div className="card card--fluid">
            <h3>Custom invitations</h3>
            <p style={{ color: "#555", marginBottom: "18px" }}>
              Design your card, save it to replace any previous design, then send it to
              everyone on your saved guest list.
            </p>
            <div className="invitation-editor-grid">
              <div
                style={{
                  minWidth: 0,
                  display: "grid",
                  gap: "10px",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  Card color
                  <input
                    type="color"
                    value={invitationForm.cardColor}
                    onChange={(e) =>
                      setInvitationForm({ ...invitationForm, cardColor: e.target.value })
                    }
                  />
                </label>
                <select
                  value={invitationForm.fontFamily}
                  onChange={(e) =>
                    setInvitationForm({ ...invitationForm, fontFamily: e.target.value })
                  }
                >
                  {INVITE_FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <select
                  value={invitationForm.pattern}
                  onChange={(e) =>
                    setInvitationForm({ ...invitationForm, pattern: e.target.value })
                  }
                >
                  {INVITE_PATTERN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Invitation title"
                  value={invitationForm.titleText}
                  onChange={(e) =>
                    setInvitationForm({ ...invitationForm, titleText: e.target.value })
                  }
                />
                <textarea
                  placeholder="Invitation message (also used in email body)"
                  rows={3}
                  value={invitationForm.bodyText}
                  onChange={(e) =>
                    setInvitationForm({ ...invitationForm, bodyText: e.target.value })
                  }
                />
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <select
                    value={invitationForm.titlePlacement}
                    onChange={(e) =>
                      setInvitationForm({
                        ...invitationForm,
                        titlePlacement: e.target.value,
                      })
                    }
                  >
                    <option value="top">Title Top</option>
                    <option value="middle">Title Middle</option>
                    <option value="bottom">Title Bottom</option>
                  </select>
                  <select
                    value={invitationForm.bodyPlacement}
                    onChange={(e) =>
                      setInvitationForm({
                        ...invitationForm,
                        bodyPlacement: e.target.value,
                      })
                    }
                  >
                    <option value="top">Body Top</option>
                    <option value="middle">Body Middle</option>
                    <option value="bottom">Body Bottom</option>
                  </select>
                  <select
                    value={invitationForm.format}
                    onChange={(e) =>
                      setInvitationForm({ ...invitationForm, format: e.target.value })
                    }
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" onClick={saveInvitationCard}>
                    Save / replace card
                  </button>
                  <button type="button" onClick={sendPrivateInvites}>
                    Send invitation to all guests
                  </button>
                </div>
                <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>
                  Recipients: {privateGuests.length} saved email(s). Manage addresses in
                  the Guest list tab.
                </p>
              </div>
              {invitationLivePreview ? (
                <div
                  style={{
                    minWidth: 0,
                    padding: "14px",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    position: "sticky",
                    top: "12px",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "10px" }}>
                    Live preview
                  </strong>
                  <img
                    src={invitationLivePreview}
                    alt="Live invitation preview"
                    style={{
                      width: "100%",
                      height: "auto",
                      borderRadius: "8px",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                    }}
                  />
                  <p style={{ fontSize: "13px", color: "#666", margin: "10px 0 0" }}>
                    Updates as you edit. Save / replace card when you are happy with it.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === "attendees" && (
          <div className="card">
            <h3>Attendees</h3>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <button onClick={fetchAttendees}>Load Attendees</button>
              <button onClick={sendReminders}>Send QR Reminders</button>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                placeholder="Paste scanned QR token"
                value={checkInQr}
                onChange={(e) => setCheckInQr(e.target.value)}
              />
              <button onClick={checkInAttendee}>Check In</button>
            </div>
            {attendees.length === 0 ? (
              <p>No attendees loaded.</p>
            ) : (
              attendees.map((item) => (
                <div key={item._id} className="card">
                  <p>
                    {item.name} ({item.email})
                  </p>
                  <p>Joined: {new Date(item.joinedAt).toLocaleString()}</p>
                  <p>Status: {item.checkedIn ? "Checked In" : "Pending"}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "photoshare" && !data.isPublic && (
          <div className="card card--fluid">
            <h3>Guest photo sharing</h3>
            <p style={{ color: "#555", maxWidth: "640px" }}>
              Start the event from here to email everyone on your{" "}
              <strong>Guest list</strong> a private link. Guests open it on their phone,
              allow camera access, and each photo they take is saved to this event. After
              the event, download everything as a zip or email it to yourself.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={startGuestPhotoSharing}
                disabled={photoShareBusy}
                style={{ width: "auto" }}
              >
                {photoShareBusy ? "Working…" : "Start event (email guest links)"}
              </button>
              <button
                type="button"
                onClick={resendGuestPhotoLinks}
                disabled={photoShareBusy || !data.photoShareActive}
                style={{ width: "auto" }}
              >
                Resend links to guests
              </button>
            </div>

            {data.photoShareActive && sharePhotoGuestLink && (
              <div
                style={{
                  padding: "12px",
                  background: "#f9fafb",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600 }}>
                  Guest link (also emailed)
                </p>
                <code
                  style={{
                    display: "block",
                    wordBreak: "break-all",
                    fontSize: "13px",
                    marginBottom: "8px",
                  }}
                >
                  {sharePhotoGuestLink}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sharePhotoGuestLink);
                    alert("Link copied");
                  }}
                  style={{ width: "auto" }}
                >
                  Copy link
                </button>
              </div>
            )}

            <h4 style={{ marginBottom: "8px" }}>Photos from guests</h4>
            {!data.guestPhotos?.length ? (
              <p style={{ color: "#6b7280" }}>No guest uploads yet.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                {data.guestPhotos.map((g, idx) => (
                  <a
                    key={`${g.relativePath}-${idx}`}
                    href={`${apiOrigin}${g.relativePath}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "block" }}
                  >
                    <img
                      alt=""
                      src={`${apiOrigin}${g.relativePath}`}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                  </a>
                ))}
              </div>
            )}

            <div
              style={{
                paddingTop: "12px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={downloadGuestPhotoZip}
                disabled={photoShareBusy || !data.guestPhotos?.length}
                style={{ width: "auto" }}
              >
                Download all (ZIP)
              </button>
              <button
                type="button"
                onClick={emailGuestPhotoZip}
                disabled={photoShareBusy || !data.guestPhotos?.length}
                style={{ width: "auto" }}
              >
                Share photos (email zip)
              </button>
              {data.photoZipLastEmailedAt && (
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  Last emailed: {new Date(data.photoZipLastEmailedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === "reviews" && data.postClosureLocked && (
          <div className="card card--fluid">
            <h3>Vendor reviews</h3>
            <p style={{ color: "#555", maxWidth: "640px", marginBottom: "16px" }}>
              After closure, rate vendors you hired for this event. Reviews are public on each
              vendor&apos;s portfolio.
            </p>
            {(data.vendors || []).filter(vendorReviewable).length === 0 ? (
              <p style={{ color: "#6b7280" }}>No hired vendors on this event yet.</p>
            ) : (
              (data.vendors || [])
                .filter(vendorReviewable)
                .map((v) => {
                  const vid = v.vendorId?._id?.toString() || v.vendorId?.toString();
                  const name = v.vendorId?.name || "Vendor";
                  const existing = (data.myVendorReviews || []).find(
                    (r) => r.vendorId?.toString() === vid
                  );
                  return (
                    <VendorReviewBlock
                      key={vid}
                      vendorId={vid}
                      vendorName={name}
                      initialRating={existing?.rating}
                      initialComment={existing?.comment}
                      onSave={submitVendorReview}
                    />
                  );
                })
            )}
          </div>
        )}

        {activeTab === "settlement" && data.postClosureLocked && (
          <div className="card card--fluid">
            <h3>Payment & settlement</h3>
            <p style={{ color: "#555", maxWidth: "680px", marginBottom: "16px" }}>
              After closure, pay the total below (simulated — no card required). Planit keeps{" "}
              <strong>5%</strong> from your side on vendor hires and <strong>5%</strong> from each
              vendor&apos;s share; vendors receive the rest to their Planit balance.
            </p>
            {settlementLoading ? (
              <p>Loading settlement…</p>
            ) : !settlementPreview ? (
              <p style={{ color: "#6b7280" }}>Could not load settlement.</p>
            ) : settlementPreview.baseTotal <= 0 ? (
              <div>
                <p style={{ color: "#6b7280" }}>
                  No accepted vendor amounts to settle. Hire vendors first.
                </p>
                <button
                  type="button"
                  onClick={downloadClientEventInvoice}
                  disabled={invoiceDownloadBusy}
                  style={{ width: "auto", marginTop: "12px" }}
                >
                  {invoiceDownloadBusy ? "Preparing PDF…" : "Download invoice (PDF)"}
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "14px",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    marginBottom: "16px",
                    maxWidth: "560px",
                  }}
                >
                  <p style={{ margin: "0 0 6px" }}>
                    <strong>Vendor hires (subtotal):</strong>{" "}
                    {settlementPreview.baseTotal?.toLocaleString?.() ?? settlementPreview.baseTotal}
                  </p>
                  <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#4b5563" }}>
                    Your service fee (5% on subtotal): +{" "}
                    {(
                      (settlementPreview.clientTotal ?? 0) - (settlementPreview.baseTotal ?? 0)
                    ).toLocaleString?.() ||
                      (settlementPreview.clientTotal - settlementPreview.baseTotal).toFixed(2)}
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: "18px" }}>
                    <strong>You pay (simulated):</strong>{" "}
                    {settlementPreview.clientTotal?.toLocaleString?.() ?? settlementPreview.clientTotal}
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                    Planit commission (admin):{" "}
                    {settlementPreview.adminCommission?.toLocaleString?.() ??
                      settlementPreview.adminCommission}
                  </p>
                </div>
                <h4 style={{ marginBottom: "8px" }}>Per vendor (after 5% vendor fee)</h4>
                <ul style={{ paddingLeft: "18px", maxWidth: "560px" }}>
                  {(settlementPreview.lines || []).map((line) => (
                    <li key={String(line.vendorId)} style={{ marginBottom: "8px" }}>
                      <strong>{line.vendorName}</strong> — offer {line.offerAmount.toLocaleString()} → vendor
                      receives {line.vendorReceives.toLocaleString()} (vendor fee{" "}
                      {line.vendorCommission.toLocaleString()})
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    alignItems: "center",
                    marginTop: "16px",
                  }}
                >
                  {!(settlementPreview.alreadyPaid || data.settlementPaidAt) && (
                    <button
                      type="button"
                      onClick={paySettlementNow}
                      disabled={paySettlementBusy}
                      style={{ width: "auto" }}
                    >
                      {paySettlementBusy ? "Processing…" : "Pay now (simulated)"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={downloadClientEventInvoice}
                    disabled={invoiceDownloadBusy}
                    style={{ width: "auto" }}
                  >
                    {invoiceDownloadBusy ? "Preparing PDF…" : "Download invoice (PDF)"}
                  </button>
                </div>
                {settlementPreview.alreadyPaid || data.settlementPaidAt ? (
                  <p style={{ color: "#15803d", fontWeight: 600, marginTop: "12px" }}>
                    Paid on{" "}
                    {new Date(
                      settlementPreview.paidAt || data.settlementPaidAt
                    ).toLocaleString()}
                    .
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="card">
            <h3>Event Settings</h3>
            <div style={{ marginBottom: "16px" }}>
              <strong>Visibility</strong>
              <p style={{ color: "#555", fontSize: "14px", marginTop: "6px" }}>
                {data.isPublic
                  ? "This is a public event: anyone can open the poster link and request OTP signup. This was chosen when the event was created and cannot be changed."
                  : "This is a private event: only your guest list receives invitations; there is no public signup page. This was chosen when the event was created and cannot be changed."}
              </p>
            </div>
            <label>
              Status
              <select
                value={data.status}
                onChange={(e) => saveSettings({ status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="planning">Planning</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <div style={{ marginTop: "12px", borderTop: "1px solid #ddd", paddingTop: "10px" }}>
              <h4>Delete Event (Admin Approval Required)</h4>
              <textarea
                rows="3"
                placeholder="Reason for deleting this event"
                value={eventDeleteReason}
                onChange={(e) => setEventDeleteReason(e.target.value)}
              />
              <button onClick={requestEventDelete}>Request Event Deletion</button>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: "16px" }}>
          <h3>Notes</h3>
          <textarea
            rows="3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note..."
          />
          <button onClick={addNote}>Add Note</button>
          {data.notes?.length > 0 &&
            data.notes
              .slice()
              .reverse()
              .map((item, idx) => (
                <p key={`${item.createdAt}-${idx}`}>{item.text}</p>
              ))}
        </div>
      </div>
    </div>

    <div
      role="complementary"
      aria-label="Budget summary"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 50,
        width: "min(260px, calc(100vw - 40px))",
        padding: "14px 16px",
        borderRadius: "12px",
        background: "#ffffff",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.12)",
        border: "1px solid #e5e7eb",
        fontSize: "13px",
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px" }}>
        Budget snapshot
      </div>
      <div style={{ display: "grid", gap: "6px" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}
        >
          <span style={{ color: "#6b7280" }}>Planned</span>
          <strong>{budgetStats.target.toLocaleString()}</strong>
        </div>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}
        >
          <span style={{ color: "#6b7280" }}>Spent</span>
          <strong>{budgetStats.used.toLocaleString()}</strong>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            paddingTop: "6px",
            marginTop: "4px",
            borderTop: "1px solid #eee",
          }}
        >
          <span style={{ color: "#6b7280" }}>Remaining</span>
          <strong style={{ color: budgetStats.over ? "#b91c1c" : "#15803d" }}>
            {budgetStats.remaining.toLocaleString()}
          </strong>
        </div>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: "11px", color: "#9ca3af" }}>
        Refreshes every 10s and when you focus this browser tab.
      </p>
    </div>
    </>
  );
};

export default EventDetails;