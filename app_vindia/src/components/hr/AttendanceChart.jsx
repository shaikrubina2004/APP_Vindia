import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

function AttendanceChart({ data }) {

  // ✅ Prevent crash when data is not loaded
  if (!data) {
    return (
      <div className="dashboard-card">
        <h3>Attendance Distribution</h3>
        <p>Loading...</p>
      </div>
    );
  }

  const chartData = {
    labels: ["Present", "Absent", "Late", "WFH"],
    datasets: [
      {
        data: [
          data.present || 0,
          data.absent || 0,
          data.late || 0,
          data.wfh || 0
        ],
        backgroundColor: ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6"],
      },
    ],
  };

  return (
    <div className="dashboard-card">
      <h3>Attendance Distribution</h3>
      <div className="chart-container">
        <Doughnut data={chartData} />
      </div>
    </div>
  );
}

export default AttendanceChart;''