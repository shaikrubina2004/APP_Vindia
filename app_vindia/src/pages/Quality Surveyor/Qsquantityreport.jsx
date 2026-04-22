import { useState } from "react";
import "./Qsquantityreport.css";

const QsSubmissions = () => {
  const [data] = useState([
    {
      id: 1,
      project: "Hospital Block",
      type: "MEP",
      date: "2026-04-13",
      time: "16:45",
      title: "Plumbing rough-in Wing C",
      issue: "Material shortage – uPVC fittings pending",
      status: "Critical",
      progress: 29,
    },
    {
      id: 2,
      project: "Mall Project",
      type: "MEP",
      date: "2026-04-12",
      time: "16:30",
      title: "Electrical conduit laying Basement B1",
      issue: "",
      status: "On Track",
      progress: 33,
    },
  ]);

  return (
    <div className="sub-container">

      {/* HEADER */}
      <div className="sub-header">
        <h2>Submissions</h2>
        <p>All submitted daily updates — history and tracking</p>
      </div>

      {/* STATS */}
      <div className="sub-stats">
        <div className="stat-card blue">
          <h2>6</h2>
          <p>Total Submitted</p>
        </div>

        <div className="stat-card green">
          <h2>3</h2>
          <p>On Track</p>
        </div>

        <div className="stat-card red">
          <h2>2</h2>
          <p>With Issues</p>
        </div>

        <div className="stat-card purple">
          <h2>56%</h2>
          <p>Avg Progress</p>
        </div>
      </div>

      {/* SEARCH */}
      <input
        className="search"
        placeholder="Search project or activity..."
      />

      {/* FILTERS */}
      <div className="filters">
        <button className="active">All Status</button>
        <button>On Track</button>
        <button>Delayed</button>
        <button>Critical</button>
        <button>Ahead</button>
      </div>

      {/* LIST */}
      <div className="sub-list">
        {data.map((item) => (
          <div key={item.id} className="sub-card">

            <div className="left">
              <h3>{item.project}</h3>

              <p className="meta">
                {item.type} • {item.date} • {item.time}
              </p>

              <p>{item.title}</p>

              {item.issue && (
                <div className="issue">
                  ⚠ {item.issue}
                </div>
              )}
            </div>

            <div className="right">

              <span className={`status ${item.status.toLowerCase()}`}>
                {item.status}
              </span>

              <div className="progress">
                <div
                  className="bar"
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>

              <span className="percent">{item.progress}%</span>

              <button className="view">View →</button>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default QsSubmissions;