import { FaUserCheck } from "react-icons/fa";

function AttendanceOverview({ data }) {
  if (!data) return <div className="dashboard-card">Loading...</div>;

  return (
    <div className="dashboard-card">
      <h3>Attendance Overview</h3>
      <p>Present: {data.present}</p>
      <p>Absent: {data.absent}</p>
      <p>Late: {data.late}</p>
      <p>Work From Home: {data.wfh}</p>
    </div>
  );
}

export default AttendanceOverview;
