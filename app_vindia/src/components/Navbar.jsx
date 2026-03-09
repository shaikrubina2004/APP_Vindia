import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "15px 30px",
      backgroundColor: "#1e3a8a",
      color: "white"
    }}>
      <h2>VINDIA ERP</h2>

      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search..."
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none"
          }}
        />

        <span>Hello, {user?.name}</span>

        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid white",
            color: "white",
            padding: "5px 10px",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;