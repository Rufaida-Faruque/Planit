// import { useEffect, useState } from "react";
// import axios from "../../api/axios";

// const VerificationPanel = () => {
//   const [list, setList] = useState([]);

//   const token = localStorage.getItem("token");

//   useEffect(() => {
//     load();
//   }, []);

//   const load = async () => {
//     const res = await axios.get(
//       "/verification/all",
//       {
//         headers: {
//           Authorization:
//             `Bearer ${token}`,
//         },
//       }
//     );

//     setList(res.data);
//   };

//   const approve = async (id) => {
//     await axios.patch(
//       `/verification/approve/${id}`,
//       {},
//       {
//         headers: {
//           Authorization:
//             `Bearer ${token}`,
//         },
//       }
//     );

//     load();
//   };

//   const reject = async (id) => {
//     const comment = prompt(
//       "Reason?"
//     );

//     await axios.patch(
//       `/verification/reject/${id}`,
//       { comment },
//       {
//         headers: {
//           Authorization:
//             `Bearer ${token}`,
//         },
//       }
//     );

//     load();
//   };

//   return (
//     <div>
//       <h2>Verification Panel</h2>

//       {list.map((v) => (
//         <div key={v._id}>
//           <h3>{v.businessName}</h3>
//           <p>Status: {v.status}</p>

//           <button
//             onClick={() =>
//               approve(v._id)
//             }
//           >
//             Approve
//           </button>

//           <button
//             onClick={() =>
//               reject(v._id)
//             }
//           >
//             Reject
//           </button>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default VerificationPanel;



import { useEffect, useState } from "react";
import axios from "../../api/axios";

const VerificationPanel = () => {
  const token = localStorage.getItem("token");

  const [list, setList] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await axios.get(
        "/verification/all",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setList(res.data);
    } catch {
      setList([]);
    }
  };

  const approve = async (id) => {
    try {
      await axios.patch(
        `/verification/approve/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      load();
    } catch {
      alert("Approve failed");
    }
  };

  const reject = async (id) => {
    const comment = prompt(
      "Enter rejection reason:"
    );

    if (!comment) return;

    try {
      await axios.patch(
        `/verification/reject/${id}`,
        { comment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      load();
    } catch {
      alert("Reject failed");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Verification Requests</h2>

      {list.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        list.map((v) => (
          <div
            key={v._id}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              borderRadius: "10px",
              marginBottom: "15px",
            }}
          >
            <h3>{v.businessName}</h3>

            <p>
              <strong>Owner:</strong>{" "}
              {v.ownerName}
            </p>

            <p>
              <strong>Phone:</strong>{" "}
              {v.phone}
            </p>

            <p>
              <strong>NID:</strong>{" "}
              {v.nid}
            </p>

            <p>
              <strong>Trade License:</strong>{" "}
              {v.tradeLicense}
            </p>

            <p>
              <strong>Category:</strong>{" "}
              {v.category}
            </p>

            <p>
              <strong>Address:</strong>{" "}
              {v.address}
            </p>

            <p>
              <strong>Details:</strong>{" "}
              {v.details}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {v.status}
            </p>

            {v.files?.length > 0 && (
              <div>
                <strong>Files:</strong>

                {v.files.map((file, i) => (
                  <div key={i}>
                    <a
                      href={`http://localhost:5000${file}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View File {i + 1}
                    </a>
                  </div>
                ))}
              </div>
            )}

            <br />

            <button
              onClick={() => approve(v._id)}
              style={{ marginRight: "10px" }}
            >
              Approve
            </button>

            <button
              onClick={() => reject(v._id)}
            >
              Reject
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default VerificationPanel;