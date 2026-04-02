import { FaUserCheck } from "react-icons/fa";

function AttendanceOverview({ data }) {
  const present = data?.present ?? 0;
  const absent = data?.absent ?? 0;
  const late = data?.late ?? 0;
  const wfh = data?.wfh ?? 0;

  return (
    <div className="dashboard-card">
      <h3><FaUserCheck className="card-icon" /> Attendance Overview</h3>

      <p>Present: {present}</p>
      <p>Absent: {absent}</p>
      <p>Late: {late}</p>
      <p>Work From Home: {wfh}</p>
    </div>
  );
}

export default AttendanceOverview;