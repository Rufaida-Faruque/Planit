import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };

    loadUser(); // initial load

    // listen for updates
    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // 🔥 force update
    window.dispatchEvent(new Event("storage"));

    navigate("/home");
  };

  return (
    <div className="navbar">
      
      {/* LEFT */}
      <h2 className="logo" onClick={() => navigate("/home")}>
        Planit
      </h2>

      {/* RIGHT */}
      <div className="nav-right">
        <div className="profile">
          
          <div onClick={() => setOpen(!open)} className="icon">
            👤
          </div>

          {open && (
            <div className="dropdown">
              {user ? (
                <>
                  <p><b>{user.name}</b></p>
                  <p>{user.email || user.phone}</p>
                  <button onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate("/login")}>Login</button>
                  <button onClick={() => navigate("/register")}>Register</button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Navbar;