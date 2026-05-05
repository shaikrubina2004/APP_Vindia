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

  // ✅ Prevent blank screen
  if (!user) {
    return <h2 style={{ padding: 20 }}>Loading...</h2>;
  }

  // ✅ ROLE is already normalized ("ceo")
  const role = user.role;

  const hour = new Date().getHours();
  let greeting = "Hello";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  return (
    <div style={{ padding: 20 }}>
    <h1>Dashboard Working ✅</h1>
  </div>
  );
}

export default Dashboard;