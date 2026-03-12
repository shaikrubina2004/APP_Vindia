import KpiCard from "./KpiCard";

function WbsOverview() {
  return (
    <div style={{ marginTop: "40px" }}>
      <h2>WBS Cost Overview</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <KpiCard title="Labour Cost" value="₹25L" />
        <KpiCard title="Material Cost" value="₹40L" />
        <KpiCard title="Equipment" value="₹15L" />
        <KpiCard title="Travel" value="₹3L" />
      </div>
    </div>
  );
}

export default WbsOverview;