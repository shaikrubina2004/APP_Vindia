import "./QuantitySurveyorDashboard.css";
import { useNavigate } from "react-router-dom";


export default function QuantitySurveyorDashboard() {
  const navigate = useNavigate();

  return (
    <div className="qsdb">

      {/* HEADER */}
      <div className="qsdb-header">
        <div>
          <p className="qsdb-sub">CONSTRUCTION MANAGEMENT</p>
          <h2>QS Dashboard</h2>
          <p className="qsdb-desc">Cost, Quantity & Reporting Overview</p>
        </div>
      </div>

      {/* CLICKABLE CARDS */}
      <div className="qsdb-cards">

        <div className="qs-card purple" onClick={() => navigate("/quantity-surveyor/quantity-report")}>
          <span>📋</span>
          <div>
            <p>BOQ Items</p>
            <h3>12</h3>
          </div>
        </div>

        <div className="qs-card dark" onClick={() => navigate("/quantity-surveyor/cost-report")}>
          <span>💰</span>
          <div>
            <p>Planned Cost</p>
            <h3>₹1.84 Cr</h3>
          </div>
        </div>

        <div className="qs-card orange" onClick={() => navigate("/quantity-surveyor/cost-report")}>
          <span>⚠</span>
          <div>
            <p>Actual Spent</p>
            <h3>₹62.4 L</h3>
          </div>
        </div>

        <div className="qs-card cyan" onClick={() => navigate("/quantity-surveyor/measurements")}>
          <span>📊</span>
          <div>
            <p>Avg Progress</p>
            <h3>38%</h3>
          </div>
        </div>

      </div>

      {/* GRAPH SECTION */}
      <div className="qsdb-grid">
        {/* BOTTOM SECTION */}
<div className="bottom-grid">

  {/* RECENT ACTIVITY */}
  <div className="box">
    <div className="box-header">
      <h3>Recent Activities</h3>
    <span onClick={() => navigate("/quantity-surveyor/daily-updates")}>
  View all →
</span>
    </div>

    <div className="activity">

      <div className="activity-item">
        <p className="title">BOQ Updated</p>
        <span className="sub">Steel quantity revised</span>
      </div>

      <div className="activity-item">
        <p className="title">Measurement Added</p>
        <span className="sub">Concrete work updated</span>
      </div>

      <div className="activity-item">
        <p className="title">Cost Alert</p>
        <span className="sub red-text">Over budget detected</span>
      </div>

    </div>
  </div>

  {/* ALERTS */}
  <div className="box">
    <div className="box-header">
      <h3>Alerts</h3>
    </div>

    <div className="alerts">

      <div className="alert red-bg">
        ⚠ Steel exceeding budget
      </div>

      <div className="alert yellow-bg">
        ⏳ Pending approval (2 items)
      </div>

      <div className="alert green-bg">
        ✔ Foundation work on track
      </div>

    </div>
  </div>

</div>

        {/* SMALL BAR CARDS */}
        <div className="qsdb-card">
          <div className="box">
  <h3>Project Overview</h3>

  <div className="overview-list">

    {/* Quantity */}
    <div className="overview-item">
      <div className="overview-top">
        <span>Quantity Work</span>
        <span>70%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill purple-fill" style={{ width: "70%" }}></div>
      </div>
    </div>

    {/* Cost */}
    <div className="overview-item">
      <div className="overview-top">
        <span>Cost Utilization</span>
        <span>55%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill blue-fill" style={{ width: "55%" }}></div>
      </div>
    </div>

    {/* Progress */}
    <div className="overview-item">
      <div className="overview-top">
        <span>Project Progress</span>
        <span>40%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill cyan-fill" style={{ width: "40%" }}></div>
      </div>
    </div>

  </div>
</div>

          <div className="mini-bars">

            <div className="mini-bar">
              <div className="mini-fill purple-fill" style={{ height: "60%" }}></div>
              <p>Quantity</p>
            </div>

            <div className="mini-bar">
              <div className="mini-fill blue-fill" style={{ height: "80%" }}></div>
              <p>Cost</p>
            </div>

            <div className="mini-bar">
              <div className="mini-fill cyan-fill" style={{ height: "40%" }}></div>
              <p>Progress</p>
            </div>

          </div>
        </div>

        {/* SMALL DONUT */}
        <div className="qsdb-card">
          <h3>Distribution</h3>

          <div className="donut small">
            <div className="donut-inner">70%</div>
          </div>

          <div className="legend">
            <span><b className="green"></b> Completed</span>
            <span><b className="red"></b> Pending</span>
          </div>
        </div>

      </div>

    </div>
  );
}