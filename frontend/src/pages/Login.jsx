
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await axios.post("/auth/login", {
      identifier,
      password,
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    // 🔥 IMPORTANT: update Navbar instantly
    window.dispatchEvent(new Event("storage"));

    // 🔥 ROLE-BASED REDIRECT
    const role = res.data.user.role;

    if (role === "admin") {
      navigate("/admin");
    } else if (role === "vendor") {
      navigate("/vendor");
    } else if (role === "guest") {
      navigate("/home");
    } else {
      navigate("/client");
    }

  } catch (err) {
    alert(err.response?.data?.message || "Login failed");
  }
};

  return (
    <div className="container">
      <div className="card">
        <h2>Welcome Back</h2>
        <p>Login to Planit</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Email or Phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Login</button>
        </form>

        <p className="link" onClick={() => navigate("/forgot-password")}>
          Forgot Password?
        </p>

        <p className="link" onClick={() => navigate("/register")}>
          Create an account
        </p>
      </div>
    </div>
  );
};

export default Login;