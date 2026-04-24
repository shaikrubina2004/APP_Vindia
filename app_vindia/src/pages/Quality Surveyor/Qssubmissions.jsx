import { useState } from "react";
import "./Qssubmissions.css";

const DATA = [
  {
    id: 1,
    project: "Tower A",
    activity: "Footing Casting",
    date: "2026-04-22",
    progress: 72,
    status: "On Track",
    issue: "",
  },
  {
    id: 2,
    project: "Mall Project",
    activity: "Column Casting",
    date: "2026-04-21",
    progress: 45,
    status: "Delayed",
    issue: "Concrete pump breakdown",
  },
];

export default function Qssubmissions() {
  const [filter, setFilter] = useState("All");

  const filtered =
    filter === "All" ? DATA : DATA.filter((d) => d.status === filter);

  const summary = {
    total: DATA.length,
    onTrack: DATA.filter((d) => d.status === "On Track").length,
    issues: DATA.filter((d) => d.issue).length,
    avg:
      DATA.reduce((sum, d) => sum + d.progress, 0) /
      (DATA.length || 1),
  };

  return (
    <div className="sub-container">
      
      {/* HEADER */}
      <div className="sub-header">
        <h2>Submissions</h2>
        <p>Final reports submitted to management</p>
      </div>

      {/* SUMMARY */}
      <div className="sub-cards">
        <div className="card">
          <h3>{summary.total}</h3>
          <p>Total Submitted</p>
        </div>

        <div className="card">
          <h3 className="green">{summary.onTrack}</h3>
          <p>On Track</p>
        </div>

        <div className="card">
          <h3 className="red">{summary.issues}</h3>
          <p>With Issues</p>
        </div>

        <div className="card">
          <h3>{Math.round(summary.avg)}%</h3>
          <p>Avg Progress</p>
        </div>
      </div>

      {/* FILTER */}
      <div className="sub-filter">
        {["All", "On Track", "Delayed"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="sub-list">
        {filtered.map((d) => (
          <div key={d.id} className="sub-card">
            
            <div className="sub-left">
              <h4>{d.project}</h4>
              <p className="sub-meta">
                {d.activity} • {d.date}
              </p>

              {d.issue && (
                <div className="issue">
                  ⚠ {d.issue}
                </div>
              )}
            </div>

            <div className="sub-right">
              
              <span className={`badge ${d.status.replace(" ", "")}`}>
                {d.status}
              </span>

              <div className="progress">
                <div
                  className="bar"
                  style={{ width: `${d.progress}%` }}
                ></div>
              </div>

              <span className="percent">{d.progress}%</span>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}