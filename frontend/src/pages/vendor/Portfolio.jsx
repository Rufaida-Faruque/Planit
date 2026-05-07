
// import { useEffect, useState } from "react";
// import axios from "../../api/axios";

// const Portfolio = () => {
//   const [portfolio, setPortfolio] = useState(null);
//   const [editMode, setEditMode] = useState(false);

//   const [form, setForm] = useState({
//     displayName: "",
//     categories: [],
//     location: "",
//     logo: "",
//     content: [],
//   });

//   const token = localStorage.getItem("token");

//     <select
//       value={form.category}
//       onChange={(e) =>
//         setForm({
//           ...form,
//           category: e.target.value,
//         })
//       }
//     >
//       <option value="">Select Category</option>

//       {CATEGORY_OPTIONS.map((cat) => (
//         <option key={cat} value={cat}>
//           {cat}
//         </option>
//       ))}
//     </select>

//   // ================= FETCH =================
//   useEffect(() => {
//     fetchPortfolio();
//   }, []);

//   const fetchPortfolio = async () => {
//     try {
//       const res = await axios.get("/portfolio/me", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (res.data) {
//         setPortfolio(res.data);

//         setForm({
//           displayName: res.data.displayName || "",
//           categories: res.data.categories || [],
//           location: res.data.location || "",
//           logo: res.data.logo || "",
//           content: res.data.content || [],
//         });
//       }
//     } catch (err) {
//       console.log("No portfolio yet");
//     }
//   };

//   // ================= BLOCK HANDLING =================
//   const addBlock = (type) => {
//     setForm({
//       ...form,
//       content: [...form.content, { type, value: "" }],
//     });
//   };

//   const updateBlock = (index, value) => {
//     const updated = [...form.content];
//     updated[index].value = value;
//     setForm({ ...form, content: updated });
//   };

//   const deleteBlock = (index) => {
//     const updated = form.content.filter((_, i) => i !== index);
//     setForm({ ...form, content: updated });
//   };

//   // ================= SAVE =================
//   const handleSave = async () => {
//     try {
//       const res = await axios.post("/portfolio", form, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       setPortfolio(res.data);
//       setEditMode(false);
//     } catch (err) {
//       alert("Error saving portfolio");
//     }
//   };

//   // ================= DELETE =================
//   const handleDelete = async () => {
//     await axios.delete("/portfolio", {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     setPortfolio(null);
//     setEditMode(false);
//   };

//   // ================= RESTORE =================
//   const handleRestore = async () => {
//     await axios.patch(
//       "/portfolio/restore",
//       {},
//       {
//         headers: { Authorization: `Bearer ${token}` },
//       }
//     );

//     fetchPortfolio();
//   };

//   // ================= UI =================

//   // 🚫 NO PORTFOLIO
//   if (!portfolio && !editMode) {
//     return (
//       <div className="center">
//         <h2>Create your portfolio to start getting clients</h2>
//         <button onClick={() => setEditMode(true)}>Create Portfolio</button>
//       </div>
//     );
//   }

//   // ✏️ EDIT MODE
//   if (editMode) {
//     return (
//       <div className="portfolio-edit">
//         <h2>Edit Portfolio</h2>

//         {/* BASIC INFO */}
//         <input
//           placeholder="Display Name"
//           value={form.displayName}
//           onChange={(e) =>
//             setForm({ ...form, displayName: e.target.value })
//           }
//         />

//         {/* ✅ CATEGORY CHECKBOXES */}
//         <div className="categories">
//           <p>Select Categories:</p>
//           {CATEGORY_OPTIONS.map((cat) => (
//             <label key={cat} style={{ display: "block" }}>
//               <input
//                 type="checkbox"
//                 checked={form.categories.includes(cat)}
//                 onChange={(e) => {
//                   if (e.target.checked) {
//                     setForm({
//                       ...form,
//                       categories: [...form.categories, cat],
//                     });
//                   } else {
//                     setForm({
//                       ...form,
//                       categories: form.categories.filter(
//                         (c) => c !== cat
//                       ),
//                     });
//                   }
//                 }}
//               />
//               {cat}
//             </label>
//           ))}
//         </div>

//         <input
//           placeholder="Location"
//           value={form.location}
//           onChange={(e) =>
//             setForm({ ...form, location: e.target.value })
//           }
//         />

//         {/* ✅ LOGO UPLOAD (FIXED) */}
//         <div>
//           <p>Upload Logo:</p>
//           <input
//             type="file"
//             onChange={async (e) => {
//               const file = e.target.files[0];
//               if (!file) return;

//               const formData = new FormData();
//               formData.append("image", file);

//               try {
//                 const res = await axios.post("/upload", formData, {
//                   headers: {
//                     Authorization: `Bearer ${token}`,
//                     "Content-Type": "multipart/form-data",
//                   },
//                 });

//                 setForm({ ...form, logo: res.data.url });
//               } catch (err) {
//                 alert("Logo upload failed");
//               }
//             }}
//           />

//           {/* LOGO PREVIEW */}
//           {form.logo && (
//             <img
//               src={`http://localhost:5000${form.logo}`}
//               alt="logo"
//               width="100"
//             />
//           )}
//         </div>

//         {/* CONTENT BLOCKS */}
//         <div className="blocks">
//           {form.content.map((block, index) => (
//             <div key={index} className="block">
//               <button onClick={() => deleteBlock(index)}>❌</button>

//               {block.type === "title" && (
//                 <input
//                   placeholder="Title"
//                   value={block.value}
//                   onChange={(e) =>
//                     updateBlock(index, e.target.value)
//                   }
//                 />
//               )}

//               {block.type === "text" && (
//                 <textarea
//                   placeholder="Text"
//                   value={block.value}
//                   onChange={(e) =>
//                     updateBlock(index, e.target.value)
//                   }
//                   style={{
//                     width: "100%",
//                     minHeight: "140px",
//                     padding: "12px",
//                     fontSize: "16px",
//                     borderRadius: "10px",
//                     border: "1px solid #ccc",
//                     lineHeight: "1.6",
//                     resize: "vertical",
//                     marginTop: "8px",
//                   }}
//                 />
//               )}

//               {block.type === "image" && (
//                 <>
//                   <input
//                     type="file"
//                     onChange={async (e) => {
//                       const file = e.target.files[0];
//                       if (!file) return;

//                       const formData = new FormData();
//                       formData.append("image", file);

//                       try {
//                         const res = await axios.post(
//                           "/upload",
//                           formData,
//                           {
//                             headers: {
//                               Authorization: `Bearer ${token}`,
//                               "Content-Type":
//                                 "multipart/form-data",
//                             },
//                           }
//                         );

//                         updateBlock(index, res.data.url);
//                       } catch (err) {
//                         alert("Upload failed");
//                       }
//                     }}
//                   />

//                   {block.value && (
//                     <img
//                       src={`http://localhost:5000${block.value}`}
//                       alt=""
//                       width="150"
//                     />
//                   )}
//                 </>
//               )}
//             </div>
//           ))}
//         </div>

//         {/* ADD BLOCK */}
//         <div className="add-block">
//           <button onClick={() => addBlock("title")}>+ Title</button>
//           <button onClick={() => addBlock("text")}>+ Text</button>
//           <button onClick={() => addBlock("image")}>+ Image</button>
//         </div>

//         <button onClick={handleSave}>Save Portfolio</button>
//       </div>
//     );
//   }





// // 👁️ PREVIEW MODE
// return (
//   <div
//     className="portfolio-preview"
//     style={{
//       maxWidth: "800px",
//       margin: "auto",
//       padding: "20px",
//     }}
//   >
//     {/* TOP BAR */}
//     <div
//       className="top-bar"
//       style={{
//         display: "flex",
//         gap: "10px",
//         marginBottom: "20px",
//       }}
//     >
//       <button onClick={() => setEditMode(true)}>Edit</button>
//       <button onClick={handleDelete}>Delete</button>
//     </div>

//     {/* LOGO + BASIC INFO */}
//     <div
//       style={{
//         display: "flex",
//         alignItems: "center",
//         gap: "20px",
//         marginBottom: "25px",
//       }}
//     >
//       {/* LOGO */}
//       {portfolio.logo ? (
//         <img
//           src={`http://localhost:5000${portfolio.logo}`}
//           alt="logo"
//           style={{
//             width: "100px",
//             height: "100px",
//             objectFit: "cover",
//             borderRadius: "12px",
//           }}
//         />
//       ) : (
//         <div
//           style={{
//             width: "100px",
//             height: "100px",
//             background: "#ccc",
//             borderRadius: "12px",
//           }}
//         />
//       )}

//       {/* TEXT INFO */}
//       <div>
//         <h2 style={{ margin: 0 }}>
//           <strong>Name:</strong> {portfolio.displayName}
//         </h2>

//         <p style={{ margin: "6px 0" }}>
//           <strong>Location:</strong> {portfolio.location}
//         </p>

//         {portfolio.categories?.length > 0 && (
//           <p style={{ margin: 0 }}>
//             <strong>Category:</strong>{" "}
//             {portfolio.categories.join(", ")}
//           </p>
//         )}
//       </div>
//     </div>

//     {/* CONTENT SECTION */}
//     <div>
//       {portfolio.content.map((block, index) => (
//         <div key={index} style={{ marginBottom: "25px" }}>
//           {/* TITLE */}
//           {block.type === "title" && (
//             <h3
//               style={{
//                 fontWeight: "bold",
//                 marginBottom: "8px",
//               }}
//             >
//               {block.value}
//             </h3>
//           )}

//           {/* TEXT */}
//           {block.type === "text" && (
//             <p
//               style={{
//                 lineHeight: "1.6",
//               }}
//             >
//               {block.value}
//             </p>
//           )}

//           {/* IMAGE */}
//           {block.type === "image" && (
//             <img
//               src={`http://localhost:5000${block.value}`}
//               alt=""
//               style={{
//                 width: "100%",
//                 maxHeight: "400px",
//                 objectFit: "cover",
//                 borderRadius: "12px",
//                 marginTop: "10px",
//               }}
//             />
//           )}
//         </div>
//       ))}
//     </div>

//     {/* UNPUBLISHED STATE */}
//     {!portfolio.isPublished && (
//       <div
//         style={{
//           marginTop: "30px",
//           textAlign: "center",
//         }}
//       >
//         <p>No Portfolio to show</p>
//         <button onClick={handleRestore}>Restore</button>
//       </div>
//     )}
//   </div>
// );
// };

// export default Portfolio;



import { useEffect, useState } from "react";
import axios from "../../api/axios";

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    category: "",
    location: "",
    logo: "",
    content: [],
  });

  const token = localStorage.getItem("token");

  // ✅ SINGLE CATEGORY ONLY
  const CATEGORY_OPTIONS = [
    "photography",
    "catering",
    "decoration",
    "venue",
  ];

  // ================= FETCH =================
  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await axios.get("/portfolio/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data) {
        setPortfolio(res.data);

        setForm({
          displayName: res.data.displayName || "",
          category: res.data.category || "",
          location: res.data.location || "",
          logo: res.data.logo || "",
          content: res.data.content || [],
        });
      }
    } catch (err) {
      console.log("No portfolio yet");
    }
  };

  // ================= BLOCK HANDLING =================
  const addBlock = (type) => {
    setForm({
      ...form,
      content: [...form.content, { type, value: "" }],
    });
  };

  const updateBlock = (index, value) => {
    const updated = [...form.content];
    updated[index].value = value;

    setForm({ ...form, content: updated });
  };

  const deleteBlock = (index) => {
    const updated = form.content.filter((_, i) => i !== index);
    setForm({ ...form, content: updated });
  };

  // ================= SAVE =================
  const handleSave = async () => {
    try {
      const res = await axios.post("/portfolio", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPortfolio(res.data);
      setEditMode(false);
    } catch (err) {
      alert("Error saving portfolio");
    }
  };

  // ================= DELETE =================
  const handleDelete = async () => {
    try {
      await axios.delete("/portfolio", {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchPortfolio();
      setEditMode(false);
    } catch (err) {
      alert("Delete failed");
    }
  };

  // ================= RESTORE =================
  const handleRestore = async () => {
    try {
      await axios.patch(
        "/portfolio/restore",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      fetchPortfolio();
    } catch (err) {
      alert("Restore failed");
    }
  };

  // 🚫 NO PORTFOLIO
  if (!portfolio && !editMode) {
    return (
      <div className="center">
        <h2>Create your portfolio to start getting clients</h2>
        <button onClick={() => setEditMode(true)}>
          Create Portfolio
        </button>
      </div>
    );
  }

  // ================= EDIT MODE =================
  if (editMode) {
    return (
      <div
        className="portfolio-edit"
        style={{
          maxWidth: "800px",
          margin: "auto",
          padding: "20px",
        }}
      >
        <h2>Edit Portfolio</h2>

        {/* NAME */}
        <input
          placeholder="Display Name"
          value={form.displayName}
          onChange={(e) =>
            setForm({
              ...form,
              displayName: e.target.value,
            })
          }
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
          }}
        />

        {/* CATEGORY */}
        <select
          value={form.category}
          onChange={(e) =>
            setForm({
              ...form,
              category: e.target.value,
            })
          }
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
          }}
        >
          <option value="">Select Category</option>

          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* LOCATION */}
        <input
          placeholder="Location"
          value={form.location}
          onChange={(e) =>
            setForm({
              ...form,
              location: e.target.value,
            })
          }
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
          }}
        />

        {/* LOGO */}
        <div style={{ marginBottom: "15px" }}>
          <p>Upload Logo:</p>

          <input
            type="file"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;

              const formData = new FormData();
              formData.append("image", file);

              try {
                const res = await axios.post(
                  "/upload",
                  formData,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type":
                        "multipart/form-data",
                    },
                  }
                );

                setForm({
                  ...form,
                  logo: res.data.url,
                });
              } catch (err) {
                alert("Logo upload failed");
              }
            }}
          />

          {form.logo && (
            <img
              src={`http://localhost:5000${form.logo}`}
              alt="logo"
              width="100"
              style={{
                marginTop: "10px",
                borderRadius: "10px",
              }}
            />
          )}
        </div>

        {/* CONTENT BLOCKS */}
        <div className="blocks">
          {form.content.map((block, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                marginBottom: "15px",
                borderRadius: "10px",
              }}
            >
              <button
                onClick={() => deleteBlock(index)}
                style={{
                  marginBottom: "10px",
                }}
              >
                ❌ Remove
              </button>

              {block.type === "title" && (
                <input
                  placeholder="Title"
                  value={block.value}
                  onChange={(e) =>
                    updateBlock(index, e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                  }}
                />
              )}

              {block.type === "text" && (
                <textarea
                  placeholder="Text"
                  value={block.value}
                  onChange={(e) =>
                    updateBlock(index, e.target.value)
                  }
                  rows="5"
                  style={{
                    width: "100%",
                    padding: "10px",
                  }}
                />
              )}

              {block.type === "image" && (
                <>
                  <input
                    type="file"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append("image", file);

                      try {
                        const res = await axios.post(
                          "/upload",
                          formData,
                          {
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type":
                                "multipart/form-data",
                            },
                          }
                        );

                        updateBlock(index, res.data.url);
                      } catch (err) {
                        alert("Upload failed");
                      }
                    }}
                  />

                  {block.value && (
                    <img
                      src={`http://localhost:5000${block.value}`}
                      alt=""
                      width="150"
                      style={{
                        marginTop: "10px",
                        borderRadius: "10px",
                      }}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* ADD BLOCK */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <button onClick={() => addBlock("title")}>
            + Title
          </button>

          <button onClick={() => addBlock("text")}>
            + Text
          </button>

          <button onClick={() => addBlock("image")}>
            + Image
          </button>
        </div>

        <button onClick={handleSave}>
          Save Portfolio
        </button>
      </div>
    );
  }

  // ================= PREVIEW MODE =================
  return (
    <div
      className="portfolio-preview"
      style={{
        maxWidth: "850px",
        margin: "auto",
        padding: "20px",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <button onClick={() => setEditMode(true)}>
          Edit
        </button>

        <button onClick={handleDelete}>
          Delete
        </button>
      </div>

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        {portfolio.logo && (
          <img
            src={`http://localhost:5000${portfolio.logo}`}
            alt="logo"
            style={{
              width: "100px",
              height: "100px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />
        )}

        <div>
          <h2 style={{ margin: 0 }}>
            <strong>Name:</strong>{" "}
            {portfolio.displayName}
          </h2>

          <p>
            <strong>Location:</strong>{" "}
            {portfolio.location}
          </p>

          <p>
            <strong>Category:</strong>{" "}
            {portfolio.category}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      {(portfolio.reviewStats?.reviewCount > 0 || (portfolio.reviews || []).length > 0) && (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "12px",
            marginBottom: "20px",
            background: "#f9fafb",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Client reviews</h3>
          {portfolio.reviewStats?.averageRating != null ? (
            <p style={{ marginTop: 0, color: "#374151" }}>
              <strong>{portfolio.reviewStats.averageRating}</strong> / 5 average ·{" "}
              {portfolio.reviewStats.reviewCount} review
              {portfolio.reviewStats.reviewCount === 1 ? "" : "s"}
            </p>
          ) : null}
          {(portfolio.reviews || []).slice(0, 8).map((r) => (
            <div
              key={r._id}
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "8px",
                marginTop: "8px",
              }}
            >
              <div style={{ fontSize: "14px", color: "#111827", fontWeight: 600 }}>
                {r.rating}★ · {r.eventId?.title || "Event"}
              </div>
              <div style={{ fontSize: "13px", color: "#4b5563" }}>
                by {r.clientId?.name || "Client"} ·{" "}
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
              </div>
              {r.comment ? <p style={{ margin: "6px 0 0" }}>{r.comment}</p> : null}
            </div>
          ))}
        </div>
      )}
      {portfolio.content?.map((block, index) => (
        <div
          key={index}
          style={{
            marginBottom: "25px",
          }}
        >
          {block.type === "title" && (
            <h3
              style={{
                fontWeight: "bold",
              }}
            >
              {block.value}
            </h3>
          )}

          {block.type === "text" && (
            <p
              style={{
                fontSize: "18px",
                lineHeight: "1.8",
              }}
            >
              {block.value}
            </p>
          )}

          {block.type === "image" && (
            <img
              src={`http://localhost:5000${block.value}`}
              alt=""
              style={{
                width: "100%",
                borderRadius: "12px",
                maxHeight: "450px",
                objectFit: "cover",
              }}
            />
          )}
        </div>
      ))}

      {/* UNPUBLISHED */}
      {!portfolio.isPublished && (
        <div style={{ textAlign: "center" }}>
          <p>No Portfolio to show</p>

          <button onClick={handleRestore}>
            Restore
          </button>
        </div>
      )}
    </div>
  );
};

export default Portfolio;