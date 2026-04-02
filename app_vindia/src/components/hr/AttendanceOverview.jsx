import { FaUserCheck } from "react-icons/fa";

function AttendanceOverview({ data }) {
 if (!data) {
  return (
    <div className="dashboard-card">
      <h3>Attendance Overview</h3>
      <p>Present: 0</p>
      <p>Absent: 0</p>
      <p>Late: 0</p>
      <p>Work From Home: 0</p>
    </div>
  );
}
}

export default AttendanceOverview;
