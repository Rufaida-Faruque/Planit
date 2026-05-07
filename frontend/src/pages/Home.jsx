import { useNavigate } from "react-router-dom";
import Browse from "./client/Browse";

const Home = () => {
  const navigate = useNavigate();
  let role = null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) role = JSON.parse(raw).role;
  } catch {
    role = null;
  }

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "20px 20px 48px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "22px" }}>
            Browse vendors
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#4b5563" }}>
            {role === "guest"
              ? "You’re signed in as a guest — explore portfolios. Register as a client to create events."
              : "Explore verified vendor portfolios. Log in to save favourites or book services."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={{ width: "auto", padding: "8px 14px" }}
            onClick={() => navigate("/")}
          >
            Home
          </button>
          <button
            type="button"
            style={{ width: "auto", padding: "8px 14px" }}
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            type="button"
            style={{ width: "auto", padding: "8px 14px" }}
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </div>
      </div>

      <Browse />
    </div>
  );
};

export default Home;