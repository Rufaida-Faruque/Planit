// import { useEffect, useState } from "react";
// import axios from "../../api/axios";

// const Verification = () => {
//   const token = localStorage.getItem("token");

//   const [verification, setVerification] = useState(null);
//   const [showForm, setShowForm] = useState(false);

//   const [form, setForm] = useState({
//     businessName: "",
//     ownerName: "",
//     phone: "",
//     nid: "",
//     tradeLicense: "",
//     category: "",
//     address: "",
//     details: "",
//     files: [],
//   });

//   const CATEGORY_OPTIONS = [
//     "photography",
//     "catering",
//     "decoration",
//     "venue",
//   ];

//   useEffect(() => {
//     loadVerification();
//   }, []);

//   const loadVerification = async () => {
//     try {
//       const res = await axios.get("/verification/me", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       setVerification(res.data);

//       if (
//         !res.data ||
//         res.data.status === "rejected" ||
//         res.data.status === "expired"
//       ) {
//         setShowForm(false);
//       }
//     } catch (err) {
//       setVerification(null);
//     }
//   };

//   const handleSubmit = async () => {
//     try {
//       const formData = new FormData();

//       Object.keys(form).forEach((key) => {
//         if (key !== "files") {
//           formData.append(key, form[key]);
//         }
//       });

//       for (let i = 0; i < form.files.length; i++) {
//         formData.append("files", form.files[i]);
//       }

//       await axios.post("/verification/request", formData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "multipart/form-data",
//         },
//       });

//       alert("Verification submitted");
//       setShowForm(false);
//       loadVerification();
//     } catch (err) {
//       alert("Submission failed");
//     }
//   };

//   // =====================================
//   // FORM UI
//   // =====================================
//   if (showForm) {
//     return (
//       <div style={{ maxWidth: "700px", margin: "auto" }}>
//         <h2>Vendor Verification Form</h2>

//         <input
//           placeholder="Business Name"
//           value={form.businessName}
//           onChange={(e) =>
//             setForm({ ...form, businessName: e.target.value })
//           }
//         />

//         <input
//           placeholder="Owner Name"
//           value={form.ownerName}
//           onChange={(e) =>
//             setForm({ ...form, ownerName: e.target.value })
//           }
//         />

//         <input
//           placeholder="Phone Number"
//           value={form.phone}
//           onChange={(e) =>
//             setForm({ ...form, phone: e.target.value })
//           }
//         />

//         <input
//           placeholder="NID Number"
//           value={form.nid}
//           onChange={(e) => {
//             const onlyNumbers = e.target.value.replace(/\D/g, "");
//             setForm({ ...form, nid: onlyNumbers });
//           }}
//         />

//         <input
//           placeholder="Trade License Number"
//           value={form.tradeLicense}
//           onChange={(e) =>
//             setForm({
//               ...form,
//               tradeLicense: e.target.value,
//             })
//           }
//         />

//         <select
//           value={form.category}
//           onChange={(e) =>
//             setForm({ ...form, category: e.target.value })
//           }
//         >
//           <option value="">Select Category</option>

//           {CATEGORY_OPTIONS.map((cat) => (
//             <option key={cat} value={cat}>
//               {cat}
//             </option>
//           ))}
//         </select>

//         <input
//           placeholder="Business Address"
//           value={form.address}
//           onChange={(e) =>
//             setForm({ ...form, address: e.target.value })
//           }
//         />

//         <textarea
//           rows="5"
//           placeholder="Extra Details"
//           value={form.details}
//           onChange={(e) =>
//             setForm({ ...form, details: e.target.value })
//           }
//         />

//         <input
//           type="file"
//           multiple
//           onChange={(e) =>
//             setForm({
//               ...form,
//               files: e.target.files,
//             })
//           }
//         />

//         <button onClick={handleSubmit}>
//           Submit Verification
//         </button>
//       </div>
//     );
//   }

//   // =====================================
//   // NO REQUEST
//   // =====================================
//   if (!verification) {
//     return (
//       <div>
//         <h2>No request yet</h2>

//         <button onClick={() => setShowForm(true)}>
//           Request Verification
//         </button>
//       </div>
//     );
//   }

//   // =====================================
//   // PENDING
//   // =====================================
//   if (verification.status === "pending") {
//     return (
//       <div>
//         <h2>Status: Pending</h2>
//         <p>Your verification is under review.</p>
//       </div>
//     );
//   }

//   // =====================================
//   // APPROVED
//   // =====================================
//   if (verification.status === "approved") {
//     return (
//       <div>
//         <h2>🎉 Congratulations!</h2>
//         <p>You are now verified.</p>
//       </div>
//     );
//   }

//   // =====================================
//   // REJECTED
//   // =====================================
//   if (verification.status === "rejected") {
//     return (
//       <div>
//         <h2>Verification Rejected</h2>

//         <p>
//           <strong>Reason:</strong>{" "}
//           {verification.adminComment}
//         </p>

//         <button onClick={() => setShowForm(true)}>
//           Request Again
//         </button>
//       </div>
//     );
//   }

//   // =====================================
//   // EXPIRED
//   // =====================================
//   if (verification.status === "expired") {
//     return (
//       <div>
//         <h2>Verification Expired</h2>

//         <button onClick={() => setShowForm(true)}>
//           Request Again
//         </button>
//       </div>
//     );
//   }

//   return null;
// };

// export default Verification;








import { useEffect, useState } from "react";
import axios from "../../api/axios";

const Verification = () => {
  const token = localStorage.getItem("token");

  const [verification, setVerification] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    nid: "",
    tradeLicense: "",
    category: "",
    address: "",
    details: "",
    files: [],
  });

  const CATEGORY_OPTIONS = [
    "photography",
    "catering",
    "decoration",
    "venue",
  ];

  useEffect(() => {
    loadVerification();
  }, []);

  useEffect(() => {
    let timer;

    if (
      verification &&
      verification.status === "approved" &&
      verification.expiresAt
    ) {
      timer = setInterval(() => {
        const diff =
          new Date(verification.expiresAt) - new Date();

        if (diff <= 0) {
          setTimeLeft("Expired");
          clearInterval(timer);
          loadVerification();
          return;
        }

        const hrs = Math.floor(diff / 1000 / 60 / 60);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [verification]);

  const loadVerification = async () => {
    try {
      const res = await axios.get("/verification/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setVerification(res.data);
    } catch {
      setVerification(null);
    }
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        if (key !== "files") {
          formData.append(key, form[key]);
        }
      });

      for (let i = 0; i < form.files.length; i++) {
        formData.append("files", form.files[i]);
      }

      await axios.post(
        "/verification/request",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Verification submitted.");
      setShowForm(false);
      loadVerification();
    } catch {
      alert("Submission failed.");
    }
  };

  // ================= FORM =================
  if (showForm) {
    return (
      <div style={{ maxWidth: "700px", margin: "auto", padding: "20px" }}>
        <h2>Vendor Verification Form</h2>

        <input
          placeholder="Business Name"
          value={form.businessName}
          onChange={(e) =>
            setForm({ ...form, businessName: e.target.value })
          }
        />

        <input
          placeholder="Owner Name"
          value={form.ownerName}
          onChange={(e) =>
            setForm({ ...form, ownerName: e.target.value })
          }
        />

        <input
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
        />

        <input
          placeholder="NID Number"
          value={form.nid}
          onChange={(e) =>
            setForm({
              ...form,
              nid: e.target.value.replace(/\D/g, ""),
            })
          }
        />

        <input
          placeholder="Trade License Number"
          value={form.tradeLicense}
          onChange={(e) =>
            setForm({
              ...form,
              tradeLicense: e.target.value,
            })
          }
        />

        <select
          value={form.category}
          onChange={(e) =>
            setForm({
              ...form,
              category: e.target.value,
            })
          }
        >
          <option value="">Select Category</option>

          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          placeholder="Business Address"
          value={form.address}
          onChange={(e) =>
            setForm({
              ...form,
              address: e.target.value,
            })
          }
        />

        <textarea
          rows="5"
          placeholder="Extra Details"
          value={form.details}
          onChange={(e) =>
            setForm({
              ...form,
              details: e.target.value,
            })
          }
        />

        <input
          type="file"
          multiple
          onChange={(e) =>
            setForm({
              ...form,
              files: e.target.files,
            })
          }
        />

        <br />
        <br />

        <button onClick={handleSubmit}>
          Submit Verification
        </button>
      </div>
    );
  }

  // ================= NO REQUEST =================
  if (!verification) {
    return (
      <div>
        <h2>No verification request yet</h2>

        <button onClick={() => setShowForm(true)}>
          Request Verification
        </button>
      </div>
    );
  }

  // ================= PENDING =================
  if (verification.status === "pending") {
    return (
      <div>
        <h2>Status: Pending ⏳</h2>
        <p>Your request is under review.</p>
      </div>
    );
  }

  // ================= APPROVED =================
  if (verification.status === "approved") {
    return (
      <div>
        <h2>🎉 Verified Vendor</h2>

        <p>
          <strong>Expires In:</strong> {timeLeft}
        </p>

        <p>
          <strong>Business:</strong>{" "}
          {verification.businessName}
        </p>

        <p>
          <strong>Owner:</strong>{" "}
          {verification.ownerName}
        </p>

        <p>
          <strong>Category:</strong>{" "}
          {verification.category}
        </p>

        <p>
          <strong>Address:</strong>{" "}
          {verification.address}
        </p>

        <p>
          <strong>Phone:</strong>{" "}
          {verification.phone}
        </p>
      </div>
    );
  }

  // ================= REJECTED =================
  if (verification.status === "rejected") {
    return (
      <div>
        <h2>Rejected ❌</h2>

        <p>
          <strong>Reason:</strong>{" "}
          {verification.adminComment}
        </p>

        <button onClick={() => setShowForm(true)}>
          Request Again
        </button>
      </div>
    );
  }

  // ================= EXPIRED =================
  if (verification.status === "expired") {
    return (
      <div>
        <h2>Verification Expired ⌛</h2>

        <button onClick={() => setShowForm(true)}>
          Renew Verification
        </button>
      </div>
    );
  }

  return null;
};

export default Verification;