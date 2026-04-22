import "./QuantitySurveyorDashboard.css";
import { useNavigate } from "react-router-dom";

export default function QuantitySurveyorDashboard() {
  const navigate = useNavigate();

  const updates = [
    { name: "Tower A", task: "Footing casting Grid C1-C4", status: "On Track", progress: 72 },
    { name: "Mall Project", task: "Column casting Lvl 3", status: "Delayed", progress: 45 },
    { name: "Hospital Block", task: "Plumbing rough-in Wing C", status: "Critical", progress: 29 },
    { name: "Villa Complex", task: "Internal plastering Unit 3A", status: "Ahead", progress: 88 },
  ];

  const milestones = [
    { name: "Foundation", percent: 87 },
    { name: "Structure", percent: 43 },
    { name: "Finishing", percent: 0 },
    { name: "MEP", percent: 29 },
  ];

  return (
    <div className="qsdb">

      <div className="qsdb-header">
        <div>
          <p className="qsdb-sub">CONSTRUCTION MANAGEMENT</p>
          <h2>QS Dashboard</h2>
          <p className="qsdb-desc">Cost, Quantity & Reporting Overview</p>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="qsdb-cards">
        <div className="qs-card" onClick={() => navigate("/quantity-surveyor/boq")}>
          <h3>12</h3>
          <p>BOQ Items</p>
        </div>

        <div className="qs-card" onClick={() => navigate("/quantity-surveyor/cost-report")}>
          <h3>₹1.84 Cr</h3>
          <p>Planned Cost</p>
        </div>

        <div className="qs-card" onClick={() => navigate("/quantity-surveyor/cost-report")}>
          <h3>₹62.4 L</h3>
          <p>Actual Spent</p>
        </div>

        <div className="qs-card" onClick={() => navigate("/quantity-surveyor/quantity-report")}>
          <h3>38%</h3>
          <p>Avg Progress</p>
        </div>
      </div>

      {/* GRID */}
      <div className="qsdb-grid">

        {/* DAILY */}
        <div className="qsdb-card">
          <div className="card-header">
            <h3>Recent Daily Updates</h3>
            <span className="link" onClick={() => navigate("/quantity-surveyor/daily-updates")}>
              View all →
            </span>
          </div>

          {updates.map((u, i) => (
            <div key={i} className="update-row">
              <div className="update-left">
                <h4>{u.name}</h4>
                <p>{u.task}</p>
              </div>

              <div className="right">
                <span className={`badge ${u.status.replace(" ", "")}`}>
                  {u.status}
                </span>

                <div className="progress">
                  <div style={{ width: `${u.progress}%` }}></div>
                </div>

                <span className="percent">{u.progress}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* MILESTONE */}
        <div className="qsdb-card">
          <div className="card-header">
            <h3>Milestone Cost Summary</h3>
            <span className="link" onClick={() => navigate("/quantity-surveyor/quantity-report")}>
              Full report →
            </span>
          </div>

          {milestones.map((m, i) => (
            <div key={i} className="milestone">
              <div className="top">
                <span>{m.name}</span>
                <span>{m.percent}%</span>
              </div>

              <div className="progress">
                <div style={{ width: `${m.percent}%` }}></div>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}