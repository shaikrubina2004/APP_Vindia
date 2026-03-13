import AppLayout from "../../layout/AppLayout";

import HRStats from "../../components/hr/HRStats";
import AttendanceOverview from "../../components/hr/AttendanceOverview";
import NewJoiners from "../../components/hr/NewJoiners";
import PendingRequests from "../../components/hr/PendingRequests";
import Birthdays from "../../components/hr/Birthdays";
import QuickActions from "../../components/hr/QuickActions";

import "../../styles/hrDashboard.css";

function HRDashboard() {

  return (

    <AppLayout>

      <div className="hr-dashboard">

        <h1>HR Dashboard</h1>

        {/* TOP CARDS */}

        <HRStats />

        {/* SECOND ROW */}

        <div className="dashboard-row">

          <AttendanceOverview />

          <NewJoiners />

        </div>

        {/* THIRD ROW */}

        <div className="dashboard-row">

          <PendingRequests />

          <Birthdays />

        </div>

        {/* QUICK ACTIONS */}

        <QuickActions />

      </div>

    </AppLayout>

  );

}

export default HRDashboard;