// // import { useEffect, useState } from "react";
// // import axios from "../../api/axios";

// // const Browse = ({ starred, setStarred }) => {
// //   const [vendors, setVendors] = useState([]);
// //   const [filteredVendors, setFilteredVendors] = useState([]);
// //   const [selectedCategory, setSelectedCategory] = useState("all");
// //   const [search, setSearch] = useState("");

// //   const CATEGORY_OPTIONS = [
// //     "all",
// //     "photography",
// //     "catering",
// //     "decoration",
// //     "venue",
// //   ];

// //   // ================= FETCH VENDORS =================
// //   useEffect(() => {
// //     fetchVendors();
// //   }, []);

// //   const fetchVendors = async () => {
// //     try {
// //       const res = await axios.get("/portfolio/browse");

// //       setVendors(res.data || []);
// //       setFilteredVendors(res.data || []);
// //     } catch (err) {
// //       console.log("No vendors found");
// //       setVendors([]);
// //       setFilteredVendors([]);
// //     }
// //   };

// //   // ================= FILTER =================
// //   useEffect(() => {
// //     let data = [...vendors];

// //     // Category filter
// //     if (selectedCategory !== "all") {
// //       data = data.filter((vendor) =>
// //         vendor.categories?.includes(selectedCategory)
// //       );
// //     }

// //     // Search filter
// //     if (search.trim() !== "") {
// //       data = data.filter((vendor) =>
// //         vendor.displayName
// //           ?.toLowerCase()
// //           .includes(search.toLowerCase())
// //       );
// //     }

// //     setFilteredVendors(data);
// //   }, [vendors, selectedCategory, search]);

// //   // ================= STAR =================
// //   const toggleStar = (vendor) => {
// //     const exists = starred.find((v) => v._id === vendor._id);

// //     if (exists) {
// //       setStarred(starred.filter((v) => v._id !== vendor._id));
// //     } else {
// //       setStarred([...starred, vendor]);
// //     }
// //   };

// //   return (
// //     <div style={{ padding: "20px" }}>
// //       <h2>Browse Vendors</h2>

// //       {/* SEARCH BAR */}
// //       <input
// //         type="text"
// //         placeholder="Search vendors by name..."
// //         value={search}
// //         onChange={(e) => setSearch(e.target.value)}
// //         style={{
// //           width: "100%",
// //           padding: "10px",
// //           marginBottom: "15px",
// //           borderRadius: "8px",
// //           border: "1px solid #ccc",
// //         }}
// //       />

// //       {/* CATEGORY FILTER */}
// //       <div
// //         style={{
// //           display: "flex",
// //           gap: "10px",
// //           flexWrap: "wrap",
// //           marginBottom: "20px",
// //         }}
// //       >
// //         {CATEGORY_OPTIONS.map((cat) => (
// //           <button
// //             key={cat}
// //             onClick={() => setSelectedCategory(cat)}
// //             style={{
// //               padding: "8px 14px",
// //               borderRadius: "8px",
// //               border: "none",
// //               cursor: "pointer",
// //               background:
// //                 selectedCategory === cat ? "#333" : "#ddd",
// //               color:
// //                 selectedCategory === cat ? "#fff" : "#000",
// //             }}
// //           >
// //             {cat}
// //           </button>
// //         ))}
// //       </div>

// //       {/* NO VENDORS */}
// //       {filteredVendors.length === 0 ? (
// //         <p>No vendors available.</p>
// //       ) : (
// //         <div
// //           style={{
// //             display: "grid",
// //             gridTemplateColumns:
// //               "repeat(auto-fit, minmax(260px, 1fr))",
// //             gap: "20px",
// //           }}
// //         >
// //           {filteredVendors.map((vendor) => {
// //             const isStarred = starred.find(
// //               (v) => v._id === vendor._id
// //             );

// //             return (
// //               <div
// //                 key={vendor._id}
// //                 style={{
// //                   border: "1px solid #ddd",
// //                   padding: "15px",
// //                   borderRadius: "12px",
// //                   background: "#fff",
// //                 }}
// //               >
// //                 {/* LOGO */}
// //                 {vendor.logo && (
// //                   <img
// //                     src={`http://localhost:5000${vendor.logo}`}
// //                     alt="logo"
// //                     style={{
// //                       width: "70px",
// //                       height: "70px",
// //                       objectFit: "cover",
// //                       borderRadius: "10px",
// //                       marginBottom: "10px",
// //                     }}
// //                   />
// //                 )}

// //                 {/* NAME */}
// //                 <h3 style={{ margin: "0 0 8px 0" }}>
// //                   {vendor.displayName}
// //                 </h3>

// //                 {/* LOCATION */}
// //                 <p style={{ margin: "0 0 8px 0" }}>
// //                   📍 {vendor.location}
// //                 </p>

// //                 {/* CATEGORY */}
// //                 <p style={{ margin: "0 0 12px 0" }}>
// //                   {vendor.categories?.join(", ")}
// //                 </p>

// //                 {/* BUTTONS */}
// //                 <div
// //                   style={{
// //                     display: "flex",
// //                     gap: "10px",
// //                     flexWrap: "wrap",
// //                   }}
// //                 >
// //                   <button
// //                     onClick={() => toggleStar(vendor)}
// //                   >
// //                     {isStarred ? "⭐ Unstar" : "⭐ Star"}
// //                   </button>

// //                   <button>
// //                     View Profile
// //                   </button>
// //                 </div>
// //               </div>
// //             );
// //           })}
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default Browse;

// import { useEffect, useState } from "react";
// import axios from "../../api/axios";
// import { useNavigate } from "react-router-dom";

// const Browse = () => {
//   const [vendors, setVendors] = useState([]);
//   const [filteredVendors, setFilteredVendors] = useState([]);
//   const [selectedCategory, setSelectedCategory] = useState("all");
//   const [search, setSearch] = useState("");
//   const [starred, setStarred] = useState([]);
//   const [sortType, setSortType] = useState("date");

//   const navigate = useNavigate();
//   const token = localStorage.getItem("token");

//   const CATEGORY_OPTIONS = [
//     "all",
//     "photography",
//     "catering",
//     "decoration",
//     "venue",
//   ];

//   // ================= INIT =================
//   useEffect(() => {
//     fetchVendors();
//     fetchStarred();
//   }, []);

//   // ================= FETCH VENDORS =================
//   const fetchVendors = async () => {
//     try {
//       const res = await axios.get("/portfolio/browse");
//       setVendors(res.data || []);
//     } catch (err) {
//       console.log("No vendors found");
//       setVendors([]);
//     }
//   };

//   // ================= FETCH STARRED =================
//   const fetchStarred = async () => {
//     try {
//       const res = await axios.get("/user/starred", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setStarred(res.data || []);
//     } catch (err) {
//       console.log("No starred vendors");
//     }
//   };

//   // ================= STAR / UNSTAR =================
//   const toggleStar = async (vendorId, e) => {
//     e.stopPropagation(); // ✅ prevent card click

//     try {
//       const res = await axios.patch(
//         `/user/star/${vendorId}`,
//         {},
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       setStarred(res.data); // updated list from backend
//     } catch (err) {
//       alert("Star failed");
//     }
//   };

//   // ================= FILTER + SORT =================
//   useEffect(() => {
//     let data = [...vendors];

//     // CATEGORY
//     if (selectedCategory !== "all") {
//       data = data.filter((v) =>
//         v.categories?.includes(selectedCategory)
//       );
//     }

//     // SEARCH
//     if (search.trim()) {
//       data = data.filter((v) =>
//         v.displayName?.toLowerCase().includes(search.toLowerCase())
//       );
//     }

//     // SORT
//     if (sortType === "alpha") {
//       data.sort((a, b) =>
//         (a.displayName || "").localeCompare(b.displayName || "")
//       );
//     } else {
//       data.sort(
//         (a, b) =>
//           new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
//       );
//     }

//     setFilteredVendors(data);
//   }, [vendors, selectedCategory, search, sortType]);

//   // ================= NAVIGATE =================
//   const goToVendor = (vendorId) => {
//     navigate(`/vendor/${vendorId}`);
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       <h2>Browse Vendors</h2>

//       {/* SEARCH */}
//       <input
//         type="text"
//         placeholder="Search vendors by name..."
//         value={search}
//         onChange={(e) => setSearch(e.target.value)}
//         style={{
//           width: "100%",
//           padding: "10px",
//           marginBottom: "15px",
//           borderRadius: "8px",
//           border: "1px solid #ccc",
//         }}
//       />

//       {/* SORT */}
//       <div style={{ marginBottom: "15px" }}>
//         <select
//           value={sortType}
//           onChange={(e) => setSortType(e.target.value)}
//         >
//           <option value="date">Sort by Latest</option>
//           <option value="alpha">Sort A-Z</option>
//         </select>
//       </div>

//       {/* CATEGORY FILTER */}
//       <div
//         style={{
//           display: "flex",
//           gap: "10px",
//           flexWrap: "wrap",
//           marginBottom: "20px",
//         }}
//       >
//         {CATEGORY_OPTIONS.map((cat) => (
//           <button
//             key={cat}
//             onClick={() => setSelectedCategory(cat)}
//             style={{
//               padding: "8px 14px",
//               borderRadius: "8px",
//               border: "none",
//               cursor: "pointer",
//               background:
//                 selectedCategory === cat ? "#333" : "#ddd",
//               color:
//                 selectedCategory === cat ? "#fff" : "#000",
//             }}
//           >
//             {cat}
//           </button>
//         ))}
//       </div>

//       {/* NO DATA */}
//       {filteredVendors.length === 0 ? (
//         <p>No vendors available.</p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns:
//               "repeat(auto-fit, minmax(260px, 1fr))",
//             gap: "20px",
//           }}
//         >
//           {filteredVendors.map((vendor) => {
//             const isStarred = starred.some(
//               (v) => v._id === vendor._id || v === vendor.vendorId
//             );

//             return (
//               <div
//                 key={vendor._id}
//                 onClick={() => goToVendor(vendor.vendorId)}
//                 style={{
//                   border: "1px solid #ddd",
//                   padding: "15px",
//                   borderRadius: "12px",
//                   background: "#fff",
//                   cursor: "pointer",
//                 }}
//               >
//                 {/* LOGO */}
//                 {vendor.logo && (
//                   <img
//                     src={`http://localhost:5000${vendor.logo}`}
//                     alt="logo"
//                     style={{
//                       width: "70px",
//                       height: "70px",
//                       objectFit: "cover",
//                       borderRadius: "10px",
//                       marginBottom: "10px",
//                     }}
//                   />
//                 )}

//                 {/* NAME */}
//                 <h3 style={{ margin: "0 0 8px 0" }}>
//                   {vendor.displayName}
//                 </h3>

//                 {/* LOCATION */}
//                 <p style={{ margin: "0 0 8px 0" }}>
//                   📍 {vendor.location}
//                 </p>

//                 {/* CATEGORY */}
//                 <p style={{ margin: "0 0 12px 0" }}>
//                   {vendor.categories?.join(", ")}
//                 </p>

//                 {/* BUTTONS */}
//                 <div style={{ display: "flex", gap: "10px" }}>
//                   <button
//                     onClick={(e) =>
//                       toggleStar(vendor.vendorId, e)
//                     }
//                   >
//                     {isStarred ? "⭐ Unstar" : "⭐ Star"}
//                   </button>

//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       goToVendor(vendor.vendorId);
//                     }}
//                   >
//                     View Profile
//                   </button>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default Browse;






import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";

const Browse = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const canUseStar = Boolean(token);
  const CATEGORY_OPTIONS = [
    "all",
    "photography",
    "catering",
    "decoration",
    "venue",
  ];

  const [vendors, setVendors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [starred, setStarred] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (token) fetchStars();
  }, [token]);

  useEffect(() => {
    const q = search.toLowerCase();
    let data = vendors.filter((v) =>
      v.displayName?.toLowerCase().includes(q)
    );
    if (selectedCategory !== "all") {
      data = data.filter(
        (v) => String(v.category || "").toLowerCase() === selectedCategory
      );
    }
    setFiltered(data);
  }, [search, vendors, selectedCategory]);

  const fetchVendors = async () => {
    try {
      const res = await axios.get("/portfolio/browse");
      setVendors(res.data);
      setFiltered(res.data);
    } catch {
      setVendors([]);
    }
  };

  const fetchStars = async () => {
    try {
      const res = await axios.get("/user/starred", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStarred(res.data);
    } catch {}
  };

  const toggleStar = async (vendorId) => {
    try {
      const res = await axios.patch(
        `/user/star/${vendorId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStarred(res.data);
    } catch {
      alert("Failed");
    }
  };

  const isStarred = (vendorUserId) => {
    return starred.some(
      (v) =>
        v.vendorId === vendorUserId ||
        v._id === vendorUserId ||
        v?.vendorId?.toString?.() === vendorUserId ||
        v?.toString?.() === vendorUserId
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Browse Vendors</h2>

      <input
        placeholder="Search vendor..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        style={{
          padding: 10,
          width: "100%",
          marginBottom: 20,
        }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {CATEGORY_OPTIONS.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                width: "auto",
                padding: "6px 12px",
                borderRadius: 999,
                background: active ? "#1d4ed8" : "#e5e7eb",
                color: active ? "#fff" : "#111827",
                fontWeight: 600,
              }}
            >
              {cat === "all" ? "All" : cat[0].toUpperCase() + cat.slice(1)}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p>No vendors found</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 20,
          }}
        >
          {filtered.map((vendor) => (
            <div
              key={vendor._id}
              style={{
                border: "1px solid #ddd",
                padding: 15,
                borderRadius: 12,
              }}
            >
              <h3>{vendor.displayName}</h3>
              <p>{vendor.location}</p>
              <p>{vendor.category}</p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                }}
              >
                {canUseStar ? (
                  <button
                    onClick={() =>
                      toggleStar(vendor.vendorId)
                    }
                  >
                    {isStarred(vendor.vendorId)
                      ? "⭐ Unstar"
                      : "⭐ Star"}
                  </button>
                ) : null}

                <button
                  onClick={() =>
                    navigate(
                      `/vendor/${vendor.vendorId}`
                    )
                  }
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Browse;