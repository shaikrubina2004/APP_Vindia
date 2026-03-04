import AppLayout from "../layout/AppLayout";
import { useAuth } from "../context/useAuth";
function Dashboard() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "600" }}>
          Good Evening, {user?.name}!
        </h1>
        <p style={{ color: "#666", marginTop: "8px" }}>
          Role: {user?.role}
        </p>
      </div>

      {/* App Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "25px",
        }}
      >
        <AppCard title="HR Management" />
        <AppCard title="Finance" />
        <AppCard title="Projects" />
        <AppCard title="Attendance" />
        <AppCard title="Payroll" />
        <AppCard title="Reports" />
      </div>
    </AppLayout>
  );
}

export default Dashboard;



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
    >
      <h3 style={{ marginBottom: "10px" }}>{title}</h3>
      <p style={{ color: "#777" }}>Open {title}</p>
    </div>
  );
}