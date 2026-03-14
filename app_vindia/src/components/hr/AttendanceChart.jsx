import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

function AttendanceChart() {

  const data = {
    labels: ["Present", "Absent", "Late", "WFH"],
    datasets: [
      {
        data: [32, 4, 2, 3],
        backgroundColor: [
          "#22c55e",
          "#ef4444",
          "#f59e0b",
          "#3b82f6"
        ],
        borderWidth: 0
      }
    ]
  };

  const options = {
    plugins: {
      legend: {
        position: "bottom"
      }
    }
  };

  return (
    <div className="dashboard-card">
      <h3>Attendance Distribution</h3>
      <Doughnut data={data} options={options} />
    </div>
  );
}

export default AttendanceChart;