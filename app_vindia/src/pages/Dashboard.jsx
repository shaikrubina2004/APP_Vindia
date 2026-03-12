import AppLayout from "../layout/AppLayout";
import { useAuth } from "../context/useAuth";
import { ROLES } from "../roles";
import { useNavigate } from "react-router-dom";

import "../styles/Dashboard.css";

import KpiCard from "../components/dashboard/KpiCard";
import QuickModuleCard from "../components/dashboard/QuickModuleCard";
import ProjectTable from "../components/dashboard/ProjectTable";
import WbsOverview from "../components/dashboard/WbsOverview";

function Dashboard() {

  const { user } = useAuth();
  const navigate = useNavigate();

  const hour = new Date().getHours();

  let greeting = "Hello";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  return (

    <AppLayout>

      <div className="dashboard-container">

        {/* Header */}

        <div className="dashboard-header">
          <h1>{greeting}, {user?.name}</h1>
          <p>Role: {user?.role}</p>
        </div>


        {/* KPI Cards */}

        <div className="kpi-grid">

          <KpiCard title="Revenue" value="₹45L" />
          <KpiCard title="Projects" value="12" />
          <KpiCard title="Employees" value="38" />
          <KpiCard title="Leads" value="15" />

        </div>


        {/* Project Overview */}

        <ProjectTable />


        {/* WBS Section */}

        <WbsOverview />


        {/* Quick Modules */}

        <div className="quick-modules">

          <h2>Quick Modules</h2>

          <div className="module-grid">

            {(user?.role === ROLES.CEO || user?.role === ROLES.EMPLOYEE) && (
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

            {(user?.role === ROLES.CEO || user?.role === ROLES.EMPLOYEE) && (
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

    </AppLayout>

  );

}

export default Dashboard;