import HRStats from "../../components/hr/HRStats";
import AttendanceOverview from "../../components/hr/AttendanceOverview";
import NewJoiners from "../../components/hr/NewJoiners";
import PendingRequests from "../../components/hr/PendingRequests";
import Birthdays from "../../components/hr/Birthdays";
import QuickActions from "../../components/hr/QuickActions";
import AttendanceChart from "../../components/hr/AttendanceChart";

import "../../styles/HRDashboard.css";

function HRDashboard() {

  return (

    <div className="hr-dashboard">

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

  );

}

export default HRDashboard;