import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div
      style={{
        width: "220px",
        background: "#0f172a",
        color: "white",
        minHeight: "100vh",
        padding: "20px"
      }}
    >
      <h3 style={{ marginBottom: "30px" }}>Menu</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <Link to="/dashboard" style={{ color: "white" }}>Dashboard</Link>
        <Link to="/hr" style={{ color: "white" }}>HR</Link>
        <Link to="/finance" style={{ color: "white" }}>Finance</Link>
        <Link to="/projects" style={{ color: "white" }}>Projects</Link>
        <Link to="/attendance" style={{ color: "white" }}>Attendance</Link>
        <Link to="/reports" style={{ color: "white" }}>Reports</Link>
        <Link to="/users" style={{ color: "white" }}>Users</Link>
      </div>
    </div>
  );
}

export default Sidebar;