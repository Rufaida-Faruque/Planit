// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import axios from "../api/axios";

// const VendorPage = () => {
//   const { id } = useParams();

//   const [portfolio, setPortfolio] = useState(null);
//   const [vendor, setVendor] = useState(null);

//   useEffect(() => {
//     fetchVendor();
//     fetchPortfolio();
//   }, []);

//   const fetchVendor = async () => {
//     const res = await axios.get(`/user/${id}`);
//     setVendor(res.data);
//   };

//   const fetchPortfolio = async () => {
//     try {
//       const res = await axios.get(`/portfolio/${id}`);
//       setPortfolio(res.data);
//     } catch {
//       setPortfolio(null);
//     }
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       {/* NAME */}
//       <h1>{vendor?.name}</h1>

//       {/* VERIFIED */}
//       {vendor?.verificationStatus === "approved" && (
//         <p style={{ color: "green" }}>✔ Verified Vendor</p>
//       )}

//       {/* PORTFOLIO */}
//       {!portfolio ? (
//         <p>No Portfolio Available</p>
//       ) : (
//         <>
//           <h2>{portfolio.displayName}</h2>
//           <p>{portfolio.location}</p>

//           {portfolio.content.map((block, i) => (
//             <div key={i}>
//               {block.type === "title" && <h3>{block.value}</h3>}
//               {block.type === "text" && <p>{block.value}</p>}
//               {block.type === "image" && (
//                 <img
//                   src={`http://localhost:5000${block.value}`}
//                   width="300"
//                 />
//               )}
//             </div>
//           ))}
//         </>
//       )}

//       {/* AVAILABILITY */}
//       {vendor?.verificationStatus === "approved" && (
//         <div style={{ marginTop: "30px" }}>
//           <h3>Availability</h3>
//           <p>Available (dummy for now)</p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default VendorPage;




import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axios";

const buildMonthDays = (year, month) => {
  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const iso = new Date(year, month, day)
      .toISOString()
      .split("T")[0];
    return { day, iso };
  });
};

const VendorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendor();
  }, [id]);

  const loadVendor = async () => {
    try {
      const res = await axios.get(`/portfolio/${id}`);

      setPortfolio(res.data);
    } catch (err) {
      setPortfolio(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <h2>Loading...</h2>;

  if (!portfolio || portfolio.isPublished === false)
    return <h2>No portfolio available</h2>;

  const now = new Date();
  const monthDays = buildMonthDays(
    now.getFullYear(),
    now.getMonth()
  );
  const availabilityMap = new Map(
    (portfolio.availabilityCalendar || []).map((item) => [
      item.date,
      Number(item.slots || 0),
    ])
  );
  const bookingsByDate = portfolio.availabilityBookingsByDate || {};

  const handleChatWithVendor = async () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!token || user?.role !== "client") {
      alert("Please log in as a client to chat with vendors.");
      navigate("/login");
      return;
    }
    try {
      const res = await axios.get("/messages/contacts");
      const contacts = res.data || [];
      const target = contacts.find(
        (c) => String(c.otherUserId || "") === String(id || "")
      );
      if (!target) {
        alert(
          "You can chat after this vendor accepts one of your event requests."
        );
        return;
      }
      localStorage.setItem("clientDashboardActiveTab", "messages");
      localStorage.setItem(
        "clientPrefillMessageRoom",
        JSON.stringify({
          eventId: target.eventId,
          otherUserId: target.otherUserId,
        })
      );
      navigate("/client");
    } catch (e) {
      alert(e?.response?.data?.message || "Could not open chat");
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>{portfolio.displayName}</h1>
      <p>📍 {portfolio.location}</p>
      <p>{portfolio.category}</p>

      {portfolio.content?.map((block, index) => (
        <div key={`${block.type}-${index}`}>
          {block.type === "title" && (
            <h3>{block.value}</h3>
          )}
          {block.type === "text" && (
            <p>{block.value}</p>
          )}
          {block.type === "image" &&
            block.value && (
              <img
                src={`http://localhost:5000${block.value}`}
                alt="portfolio item"
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  borderRadius: "10px",
                  marginBottom: "12px",
                }}
              />
            )}
        </div>
      ))}

      {portfolio.availabilityOptions?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Booking Availability</h3>
          <p>
            {portfolio.availabilityOptions.join(", ")}
          </p>
          <button type="button">
            Request Booking
          </button>
        </div>
      )}

      {(portfolio.reviewStats?.reviewCount > 0 || (portfolio.reviews || []).length > 0) && (
        <div style={{ marginTop: 28, maxWidth: "560px" }}>
          <h3>Client reviews</h3>
          {portfolio.reviewStats?.averageRating != null && (
            <p style={{ fontSize: "18px", marginBottom: "16px" }}>
              <strong>{portfolio.reviewStats.averageRating}</strong> / 5 average ·{" "}
              {portfolio.reviewStats.reviewCount} review
              {portfolio.reviewStats.reviewCount === 1 ? "" : "s"}
            </p>
          )}
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(portfolio.reviews || []).map((r) => (
              <li
                key={r._id}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  padding: "14px 0",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {r.rating}★ · {r.eventId?.title || "Event"}
                </div>
                <div style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>
                  {r.clientId?.name || "Client"}
                  {r.eventId?.date
                    ? ` · ${new Date(r.eventId.date).toLocaleDateString()}`
                    : ""}
                </div>
                {r.comment ? (
                  <p style={{ marginTop: "10px", marginBottom: 0, color: "#374151" }}>
                    {r.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h3>Availability Calendar</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(70px, 1fr))",
            gap: "8px",
            maxWidth: "760px",
          }}
        >
          {monthDays.map((item) => {
            const slots =
              availabilityMap.get(item.iso) || 0;
            const booked = Number(bookingsByDate[item.iso] || 0);
            const open = Math.max(0, slots - booked);
            const available = open > 0;

            return (
              <div
                key={item.iso}
                title={
                  slots > 0
                    ? `${item.iso}: ${open} open, ${booked} booked (${slots} capacity)`
                    : `${item.iso}`
                }
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "10px",
                  textAlign: "center",
                  background: available
                    ? "#d1fae5"
                    : slots > 0 && booked >= slots
                    ? "#fee2e2"
                    : "transparent",
                }}
              >
                <div>{item.day}</div>
                <small>
                  {slots > 0
                    ? `${open}/${slots}`
                    : "-"}
                </small>
              </div>
            );
          })}
        </div>
      </div>

      <button type="button" style={{ marginTop: 16 }} onClick={handleChatWithVendor}>
        Chat with Vendor
      </button>
    </div>
  );
};

export default VendorPage;