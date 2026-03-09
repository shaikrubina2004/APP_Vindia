import AppLayout from "../layout/AppLayout";
import { useAuth } from "../context/useAuth";
import { ROLES } from "../roles";

function Dashboard() {
  const { user } = useAuth();

  return (
    <AppLayout>
      {/* Greeting */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "600" }}>
          Welcome, {user?.name}!
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
          <AppCard title="HR Management" />
        )}

        {(user?.role === ROLES.CEO || user?.role === ROLES.FINANCE) && (
          <AppCard title="Finance" />
        )}

        <AppCard title="Projects" />

        <AppCard title="Attendance" />

        {(user?.role === ROLES.CEO || user?.role === ROLES.EMPLOYEE) && (
          <AppCard title="Payroll" />
        )}

        {(user?.role === ROLES.CEO || user?.role === ROLES.FINANCE) && (
          <AppCard title="Reports" />
        )}
      </div>
    </AppLayout>
  );
}

export default Dashboard;

/* Card Component */

function AppCard({ title }) {
  return (
    <div
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