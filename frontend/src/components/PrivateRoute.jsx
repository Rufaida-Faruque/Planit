// import { Navigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";

// const PrivateRoute = ({ children }) => {
//   const { user } = useAuth();
//   return user ? children : <Navigate to="/login" />;
// };

// export default PrivateRoute;

import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    localStorage.setItem("redirect_after_login", window.location.pathname);
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;