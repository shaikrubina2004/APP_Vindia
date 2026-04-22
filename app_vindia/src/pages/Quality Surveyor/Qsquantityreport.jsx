import { useState } from "react";
import "./Qsquantityreport.css";

const DATA = [
  { id: 1, item: "Excavation", unit: "m³", boq: 450, actual: 320, milestone: "Foundation" },
  { id: 2, item: "Concrete", unit: "m³", boq: 200, actual: 150, milestone: "Structure" },
  { id: 3, item: "Brick Work", unit: "m³", boq: 300, actual: 100, milestone: "Structure" },
  { id: 4, item: "Plastering", unit: "m²", boq: 900, actual: 0, milestone: "Finishing" },
];

const getPercent = (actual, boq) => boq ? Math.round((actual / boq) * 100) : 0;

const getStatus = (actual, boq) => {
  if (actual === 0) return "Not Started";
  if (actual >= boq) return "Completed";
  return "In Progress";
};

export default function Qsquantityreport() {
  const [filter, setFilter] = useState("All");

  const filtered =
    filter === "All"
      ? DATA
      : DATA.filter((d) => d.milestone === filter);

  const summary = {
    total: filtered.length,
    completed: filtered.filter((d) => d.actual >= d.boq).length,
    progress: filtered.filter((d) => d.actual > 0 && d.actual < d.boq).length,
    pending: filtered.filter((d) => d.actual === 0).length,
  };

  return (
    <div className="qr-container">
      
      {/* HEADER */}
      <div className="qr-header">
        <h2>Quantity Report</h2>
        <p>Track BOQ vs actual work progress</p>
      </div>

      {/* SUMMARY */}
      <div className="qr-cards">
        <div className="card">
          <h4>Total Items</h4>
          <h3>{summary.total}</h3>
        </div>

        <div className="card">
          <h4>Completed</h4>
          <h3>{summary.completed}</h3>
        </div>

        <div className="card">
          <h4>In Progress</h4>
          <h3>{summary.progress}</h3>
        </div>

        <div className="card">
          <h4>Not Started</h4>
          <h3>{summary.pending}</h3>
        </div>
      </div>

      {/* FILTER */}
      <div className="qr-filter">
        {["All", "Foundation", "Structure", "Finishing"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table className="qr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Unit</th>
              <th>BOQ</th>
              <th>Actual</th>
              <th>Remaining</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((d, i) => {
              const percent = getPercent(d.actual, d.boq);
              const status = getStatus(d.actual, d.boq);

              return (
                <tr key={d.id}>
                  <td>{i + 1}</td>
                  <td>{d.item}</td>
                  <td>{d.unit}</td>
                  <td>{d.boq}</td>
                  <td>{d.actual}</td>
                  <td>{d.boq - d.actual}</td>

                  <td>
                    <div className="qr-progress">
                      <div
                        className="qr-bar"
                        style={{ width: `${percent}%` }}
                      ></div>
                      <span>{percent}%</span>
                    </div>
                  </td>

                  <td>
                    <span className={`badge ${status.replace(" ", "")}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}