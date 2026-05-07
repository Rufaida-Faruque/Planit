import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

const Starred = () => {
  const navigate = useNavigate();
  const [sortType, setSortType] = useState("date");
  const [starred, setStarred] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStarred();
  }, []);

  const fetchStarred = async () => {
    try {
      const res = await axios.get("/user/starred");
      setStarred(res.data || []);
    } catch {
      setStarred([]);
    } finally {
      setLoading(false);
    }
  };

  const sortedVendors = useMemo(() => {
    const list = [...starred];

    if (sortType === "alphabet") {
      return list.sort((a, b) => {
        const left =
          a.portfolio?.displayName ||
          a.vendor?.name ||
          "Vendor";
        const right =
          b.portfolio?.displayName ||
          b.vendor?.name ||
          "Vendor";
        return left.localeCompare(right);
      });
    }

    return list.sort(
      (a, b) =>
        new Date(b.addedAt || 0) -
        new Date(a.addedAt || 0)
    );
  }, [sortType, starred]);

  const removeStar = async (vendorId) => {
    try {
      const res = await axios.patch(
        `/user/star/${vendorId}`,
        {}
      );
      setStarred(res.data || []);
    } catch {
      alert("Failed to remove star");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>⭐ Starred Vendors</h2>

      {/* SORT DROPDOWN */}
      <select
        value={sortType}
        onChange={(e) => setSortType(e.target.value)}
        style={{ marginBottom: "20px", padding: "8px" }}
      >
        <option value="date">Sort by Date</option>
        <option value="alphabet">Sort A-Z</option>
      </select>

      {/* EMPTY */}
      {loading ? (
        <p>Loading...</p>
      ) : sortedVendors.length === 0 ? (
        <p>No starred vendors yet.</p>
      ) : (
        sortedVendors.map((entry) => (
          <div
            key={entry.vendorId}
            className="card"
            style={{
              border: "1px solid #ddd",
              padding: "14px",
              borderRadius: "12px",
              marginBottom: "12px",
            }}
          >
            {entry.portfolio ? (
              <>
                <h3>
                  {entry.portfolio.displayName}
                </h3>
                <p>{entry.portfolio.location}</p>
                <button
                  onClick={() =>
                    navigate(`/vendor/${entry.vendorId}`)
                  }
                  style={{ marginRight: "10px" }}
                >
                  View Profile
                </button>
              </>
            ) : (
              <>
                <h3>
                  {entry.vendor?.name || "Vendor"}
                </h3>
                <p>No portfolio available</p>
              </>
            )}

            <button
              onClick={() => removeStar(entry.vendorId)}
            >
              ⭐ Remove
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default Starred;