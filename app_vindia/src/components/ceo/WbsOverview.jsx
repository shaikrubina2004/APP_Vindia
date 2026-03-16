import "../../styles/WbsOverview.css";

function WbsOverview() {

  const wbsData = [
    { title: "Labour Cost", value: 2500000, color: "#4CAF50" },
    { title: "Material Cost", value: 4000000, color: "#2196F3" },
    { title: "Equipment", value: 1500000, color: "#FF9800" },
    { title: "Travel", value: 300000, color: "#9C27B0" }
  ];

  const total = wbsData.reduce((sum, item) => sum + item.value, 0);

  return (

    <div className="wbs-section">

      <h2>WBS Cost Overview</h2>

      <div className="wbs-grid">

        {wbsData.map((item, index) => (

          <div key={index} className="wbs-card">

            <p>{item.title}</p>

            <h3 style={{ color: item.color }}>
              ₹{item.value.toLocaleString()}
            </h3>

          </div>

        ))}

        <div className="wbs-card total">

          <p>Total Cost</p>
          <h3>₹{total.toLocaleString()}</h3>

        </div>

      </div>

    </div>
  );
}

export default WbsOverview;