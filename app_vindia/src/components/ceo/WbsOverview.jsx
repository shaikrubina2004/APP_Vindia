function WbsOverview() {

  const wbsData = [
    { title: "Labour Cost", value: "₹25L" },
    { title: "Material Cost", value: "₹40L" },
    { title: "Equipment", value: "₹15L" },
    { title: "Travel", value: "₹3L" }
  ];

  return (

    <div className="wbs-section">

      <h2>WBS Cost Overview</h2>

      <div className="wbs-grid">

        {wbsData.map((item, index) => (

          <div key={index} className="wbs-card">

            <p>{item.title}</p>
            <h3>{item.value}</h3>

          </div>

        ))}

      </div>

    </div>

  );
}

export default WbsOverview;