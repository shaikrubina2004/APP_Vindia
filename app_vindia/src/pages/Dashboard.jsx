import AppLayout from "../layout/AppLayout";
import { useAuth } from "../context/useAuth";
import { ROLES } from "../roles";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamic Greeting
  const hour = new Date().getHours();

  let greeting = "Hello";
  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  return (
    <AppLayout>
      {/* Greeting */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "600" }}>
<<<<<<< Updated upstream
          Welcome, {user?.name}!
=======
          {greeting}, {user?.name}!
>>>>>>> Stashed changes
        </h1>

        <p style={{ color: "#666", marginTop: "8px" }}>
          Role: {user?.role}
        </p>
      </div>

      {/* App Modules Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "25px",
        }}
      >
        {(user?.role === ROLES.CEO || user?.role === ROLES.EMPLOYEE) && (
          <AppCard
            title="HR Management"
            onClick={() => navigate("/hr")}
          />
        )}

        {(user?.role === ROLES.CEO || user?.role === ROLES.FINANCE) && (
          <AppCard
            title="Finance"
            onClick={() => navigate("/finance")}
          />
        )}

        <AppCard
          title="Projects"
          onClick={() => navigate("/projects")}
        />

        <AppCard
          title="Attendance"
          onClick={() => navigate("/attendance")}
        />

        {(user?.role === ROLES.CEO || user?.role === ROLES.EMPLOYEE) && (
          <AppCard
            title="Payroll"
            onClick={() => navigate("/payroll")}
          />
        )}

        {(user?.role === ROLES.CEO || user?.role === ROLES.FINANCE) && (
          <AppCard
            title="Reports"
            onClick={() => navigate("/reports")}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default Dashboard;


/* -------------------- */
/* Card Component */
/* -------------------- */

function AppCard({ title, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        padding: "30px",
        borderRadius: "12px",
        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transition: "0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-5px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <h3 style={{ marginBottom: "10px" }}>{title}</h3>
      <p style={{ color: "#777" }}>Open {title}</p>
    </div>
  );
}