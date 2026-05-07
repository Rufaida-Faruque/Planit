


// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "../api/axios";

// const Register = () => {
//   const [method, setMethod] = useState("email"); // email | phone
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [phone, setPhone] = useState("");
//   const [password, setPassword] = useState("");
//   const [role, setRole] = useState("client");

//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     let data = {
//       name,
//       password,
//       role,
//     };

//     if (method === "email") {
//       data.email = email;
//     } else {
//       data.phone = phone;
//     }

//     try {
//       await axios.post("/auth/register", data);
//       alert("Registered successfully");
//       navigate("/login");

//     } catch (err) {
//       alert(err.response?.data?.message || "Registration failed");
//     }
//   };

//   return (
//     <div>
//       <h2>Register</h2>

//       <div>
//         <button onClick={() => setMethod("email")}>Email</button>
//         <button onClick={() => setMethod("phone")}>Phone</button>
//       </div>

//       <form onSubmit={handleSubmit}>
//         <input
//           type="text"
//           placeholder="Name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           required
//         />

//         {method === "email" && (
//           <input
//             type="email"
//             placeholder="Email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//           />
//         )}

//         {method === "phone" && (
//           <input
//             type="text"
//             placeholder="Phone"
//             value={phone}
//             onChange={(e) => setPhone(e.target.value)}
//             required
//           />
//         )}

//         <input
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//         />

//         <select value={role} onChange={(e) => setRole(e.target.value)}>
//           <option value="client">Client</option>
//           <option value="vendor">Vendor</option>
//         </select>

//         <button type="submit">Register</button>
//       </form>
//         <p>
//         Already have an account?{" "}
//         <span
//             style={{ color: "blue", cursor: "pointer" }}
//             onClick={() => navigate("/login")}
//         >
//             Login
//         </span>
//         </p>      
//     </div>
//   );
// };

// export default Register;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";

const Register = () => {
  const [method, setMethod] = useState("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      name,
      password,
      role,
      ...(method === "email" ? { email } : { phone }),
    };

    try {
      await axios.post("/auth/register", data);
      alert("Registered!");
      navigate("/login");
    } catch (err) {
      alert("Error");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Create Account</h2>

        <div>
          <button onClick={() => setMethod("email")}>Email</button>
          <button onClick={() => setMethod("phone")}>Phone</button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {method === "email" ? (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <input
              type="text"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="client">Client (plan events)</option>
            <option value="vendor">Vendor</option>
            <option value="guest">Guest (browse vendors only)</option>
          </select>

          <button type="submit">Register</button>
        </form>

        <p className="link" onClick={() => navigate("/login")}>
          Already have an account?
        </p>
      </div>
    </div>
  );
};

export default Register;