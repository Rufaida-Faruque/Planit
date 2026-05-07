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
    <div className="container">
      <div className="card">
        <h1>Planit</h1>
        <p>Plan your events effortlessly</p>

        <button onClick={() => navigate("/register")}>
          Register
        </button>

        <button onClick={() => navigate("/login")}>
          Login
        </button>

        <button onClick={() => navigate("/home")}>
          Continue as Guest
        </button>
      </div>
    </div>
  );
};

export default Landing;