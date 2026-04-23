import "./Qsalerts.css";
import { useNavigate } from "react-router-dom";

const Qsalerts = () => {
  const navigate = useNavigate();

  const alerts = [
    {
      type: "danger",
      message: "Steel exceeding budget",
      time: "2h ago"
    },
    {
      type: "warning",
      message: "Pending approval (2 items)",
      time: "4h ago"
    },
    {
      type: "success",
      message: "Foundation work on track",
      time: "6h ago"
    }
  ];

  return (
    <div className="qsalerts">

      {/* HEADER */}
      <div className="qsalerts-header">
        <h2>Alerts</h2>
        <span onClick={() => navigate("/quantity-surveyor/dashboard")}>
          Back →
        </span>
      </div>

      {/* ALERT LIST */}
      <div className="qsalerts-list">
        {alerts.map((a, i) => (
          <div key={i} className={`alert-item ${a.type}`}>

            {/* ICON */}
            <div className="alert-icon">
              {a.type === "danger" && "⚠"}
              {a.type === "warning" && "⏳"}
              {a.type === "success" && "✔"}
            </div>

            {/* TEXT */}
            <div className="alert-text">
              <p>{a.message}</p>
              <small>{a.time}</small>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default Qsalerts;