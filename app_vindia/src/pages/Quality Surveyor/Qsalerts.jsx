import "./Qsalerts.css";

const ALERTS = [
  {
    id: 1,
    type: "delay",
    message: "Foundation work delayed (Tower A)",
  },
  {
    id: 2,
    type: "cost",
    message: "Steel exceeded budget",
  },
  {
    id: 3,
    type: "approval",
    message: "3 submissions pending approval",
  },
];

export default function Qsalerts() {
  return (
    <div className="alert-container">
      <div className="alert-header">
        <h2>Alerts</h2>
        <p>Project warnings and notifications</p>
      </div>

      <div className="alert-list">
        {ALERTS.map((a) => (
          <div key={a.id} className={`alert-card ${a.type}`}>
            <div className="alert-icon">
              {a.type === "delay" && "⚠"}
              {a.type === "cost" && "💰"}
              {a.type === "approval" && "⏳"}
            </div>

            <div className="alert-text">
              <p>{a.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}