import HRStats from "../../components/hr/HRStats";
import AttendanceOverview from "../../components/hr/AttendanceOverview";
import NewJoiners from "../../components/hr/NewJoiners";
import PendingRequests from "../../components/hr/PendingRequests";
import Birthdays from "../../components/hr/Birthdays";
import QuickActions from "../../components/hr/QuickActions";
import HRSidebar from "../../components/hr/HRSidebar";
import AttendanceChart from "../../components/hr/AttendanceChart";
import "../../styles/HRDashboard.css";

function HRDashboard() {
  return (
    <div className="hr-layout">
      <HRSidebar />

      <div className="hr-content">
        <h1>HR Dashboard</h1>

        {/* Top Stats */}
        <HRStats />

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          <AttendanceOverview />
          <NewJoiners />
          <AttendanceChart />
          
          <PendingRequests />
          <Birthdays />
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}

export default HRDashboard;
