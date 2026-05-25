// import { useNavigate } from "react-router-dom";

// const Landing = () => {
//   const navigate = useNavigate();

//   return (
//     <div style={{ textAlign: "center", marginTop: "100px" }}>
//       <h1>Planit</h1>

//       <button onClick={() => navigate("/register")}>
//         Register
//       </button>

//       <br /><br />

//       <button onClick={() => navigate("/login")}>
//         Login
//       </button>

//       <br /><br />

//       <button onClick={() => navigate("/home")}>
//         Continue as Guest
//       </button>
//     </div>
//   );
// };

// export default Landing;


import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="container auth-shell">
      <div className="card auth-card landing-card">
        <h1>Planit</h1>
        <p>Design, coordinate, and deliver events beautifully.</p>
        <div className="landing-actions">
          <button onClick={() => navigate("/register")}>Create account</button>
          <button onClick={() => navigate("/login")}>Login</button>
          <button onClick={() => navigate("/home")}>Continue as Guest</button>
        </div>
      </div>
    </div>
  );
};

export default Landing;