function KpiCard({ title, value, color = "#4f46e5", icon }) {

  return (

    <div className="kpi-card">

      <div
        className="kpi-icon"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>

      <div className="kpi-content">

        <p className="kpi-title">{title}</p>

        <h2 className="kpi-value">{value}</h2>

      </div>

    </div>

  );

}

export default KpiCard;