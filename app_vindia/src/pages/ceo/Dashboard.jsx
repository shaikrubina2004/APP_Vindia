import { useAuth } from "../../context/useAuth";
import { ROLES } from "../../roles";
import { useNavigate } from "react-router-dom";

import "../../styles/Dashboard.css";

import KpiCard from "../../components/ceo/KpiCard";
import QuickModuleCard from "../../components/ceo/QuickModuleCard";
import ProjectTable from "../../components/ceo/ProjectTable";
import WbsOverview from "../../components/ceo/WbsOverview";
import FinanceChart from "../../components/ceo/FinanceChart";
import WbsCostTable from "../../components/ceo/WbsCostTable";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const hour = new Date().getHours();

  let greeting = "Hello";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  return (
    <div className="dashboard-container">
      {/* HEADER */}

      <div className="dashboard-header">
        <h1>
          {greeting}, {user?.name}
        </h1>
        <p>Role: {user?.role}</p>
      </div>

      {/* FINANCIAL SNAPSHOT */}

      <h2 className="dashboard-section-title">
        Financial Snapshot (This Month)
      </h2>

      <div className="snapshot-grid">
        <KpiCard title="Monthly Revenue" value="₹45L" />
        <KpiCard title="Monthly Expenses" value="₹30L" />
        <KpiCard title="Net Profit" value="₹15L" />
        <KpiCard title="Active Clients" value="8" />
      </div>

      {/* OPERATIONS TODAY */}

      <h2 className="dashboard-section-title">Operations Today</h2>

      <div className="kpi-grid">
        <KpiCard title="Active Projects" value="12" />
        <KpiCard title="Employees Present Today" value="32" />
        <KpiCard title="New Leads Today" value="4" />
      </div>

      {/* FINANCE OVERVIEW */}

      <h2 className="dashboard-section-title">Finance Overview</h2>

      <FinanceChart />

      {/* PROJECT TABLE */}

      <ProjectTable />

      {/* WBS OVERVIEW */}

      <WbsOverview />

      {/* WBS COST TRACKING */}

      <WbsCostTable />

      {/* LEAD + HR SECTION */}

      <div className="dual-section">
        <div className="info-card">
          <h3>Lead Pipeline</h3>

          <ul>
            <li>New Leads: 15</li>
            <li>Contacted: 10</li>
            <li>Proposal Sent: 5</li>
            <li>Converted: 3</li>
          </ul>
        </div>

        <div className="info-card">
          <h3>HR Overview</h3>

          <ul>
            <li>Total Employees: 38</li>
            <li>Present Today: 32</li>
            <li>On Leave: 4</li>
          </ul>
        </div>
      </div>

      {/* QUICK MODULES */}

      <div className="quick-modules">
        <h2>Quick Modules</h2>

        <div className="module-grid">
          {(user?.role?.toLowerCase() === ROLES.CEO ||
            user?.role?.toLowerCase() === ROLES.EMPLOYEE) && (
            <QuickModuleCard
              title="HR Management"
              onClick={() => navigate("/hr")}
            />
          )}

          {(user?.role === ROLES.CEO || user?.role === ROLES.FINANCE) && (
            <QuickModuleCard
              title="Finance"
              onClick={() => navigate("/finance")}
            />
          )}

          <QuickModuleCard
            title="Projects"
            onClick={() => navigate("/projects")}
          />

          <QuickModuleCard
            title="Attendance"
            onClick={() => navigate("/attendance")}
          />

          {(user?.role?.toLowerCase() === ROLES.CEO ||
            user?.role?.toLowerCase() === ROLES.EMPLOYEE) && (
            <QuickModuleCard
              title="Payroll"
              onClick={() => navigate("/payroll")}
            />
          )}

          {(user?.role === ROLES.CEO || user?.role === ROLES.FINANCE) && (
            <QuickModuleCard
              title="Reports"
              onClick={() => navigate("/reports")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
