import { useState } from "react";
import "./Qscostreport.css";

const Qscostreport = () => {

  const [data] = useState([
    {
      id: 1,
      item: "Concrete",
      total: 100,
      completed: 40,
      rate: 5000,
    },
    {
      id: 2,
      item: "Steel",
      total: 50,
      completed: 55,
      rate: 60000,
    },
  ]);

  const totalPlanned = data.reduce(
    (sum, d) => sum + d.total * d.rate,
    0
  );

  const totalActual = data.reduce(
    (sum, d) => sum + d.completed * d.rate,
    0
  );

  const totalVariance = totalActual - totalPlanned;

  return (
    <div className="qscr-container">

      {/* HEADER */}
      <div className="qscr-header">
        <h2>Cost Report</h2>
        <p>Financial overview</p>
      </div>

      {/* CARDS */}
      <div className="qscr-cards">
        <div className="card">
          <h4>Planned</h4>
          <p>₹{totalPlanned}</p>
        </div>

        <div className="card">
          <h4>Actual</h4>
          <p>₹{totalActual}</p>
        </div>

        <div className={`card ${totalVariance > 0 ? "over" : "under"}`}>
          <h4>Variance</h4>
          <p>₹{totalVariance}</p>
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
              <th>Variance</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {data.map((d, index) => {
              const planned = d.total * d.rate;
              const actual = d.completed * d.rate;
              const remaining = planned - actual;
              const variance = actual - planned;

              return (
                <tr key={d.id}>
                  <td>{index + 1}</td>
                  <td>{d.item}</td>

                  <td className="money">₹{planned}</td>
                  <td className="money">₹{actual}</td>
                  <td className="money">₹{remaining}</td>

                  <td className={variance > 0 ? "red money" : "green money"}>
                    ₹{variance}
                  </td>

                  <td>
                    <span className={variance > 0 ? "badge red" : "badge green"}>
                      {variance > 0 ? "Over Budget" : "Under Budget"}
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
};

export default Qscostreport;