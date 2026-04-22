import "./Qscostreport.css";

const DATA = [
  { id: 1, item: "Concrete", planned: 500000, actual: 200000 },
  { id: 2, item: "Steel", planned: 3000000, actual: 3300000 },
];

export default function Qscostreport() {
  // Totals
  const totalPlanned = DATA.reduce((sum, d) => sum + d.planned, 0);
  const totalActual = DATA.reduce((sum, d) => sum + d.actual, 0);
  const variance = totalActual - totalPlanned;

  const format = (num) => "₹" + num.toLocaleString();

  return (
    <div className="qscr-container">
      
      {/* HEADER */}
      <div className="qscr-header">
        <h2>Cost Report</h2>
        <p>Financial overview</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="qscr-cards">
        <div className="card">
          <h4>Planned</h4>
          <h3>{format(totalPlanned)}</h3>
        </div>

        <div className="card">
          <h4>Actual</h4>
          <h3>{format(totalActual)}</h3>
        </div>

        <div className={`card ${variance > 0 ? "over" : "under"}`}>
          <h4>Variance</h4>
          <h3>{format(variance)}</h3>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table className="cost-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Planned</th>
              <th>Actual</th>
              <th>Remaining</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {DATA.map((d, i) => {
              const remaining = d.planned - d.actual;
              const isOver = d.actual > d.planned;

              return (
                <tr key={d.id}>
                  <td>{i + 1}</td>
                  <td>{d.item}</td>

                  <td className="money">{format(d.planned)}</td>
                  <td className="money">{format(d.actual)}</td>

                  <td className={`money ${remaining < 0 ? "red" : "green"}`}>
                    {format(remaining)}
                  </td>

                  <td>
                    <span className={`badge ${isOver ? "red" : "green"}`}>
                      {isOver ? "Over Budget" : "Under Budget"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}