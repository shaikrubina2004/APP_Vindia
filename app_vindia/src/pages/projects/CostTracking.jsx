import React, { useState } from "react";

function CostTracking({
  selectedProject,
  activePhase,
  setActivePhase,
  costSummary = [],
  activeCategory,
  setActiveCategory,
  costBreakdown,
  calculatePercentage,
}) {
  const [details, setDetails] = useState({});

  if (selectedProject?.status === "Rejected") {
    return <h3 style={{ textAlign: "center" }}>❌ No Cost Tracking</h3>;
  }

  const miscTotal = costSummary.reduce(
    (s, w) => s + (w.misc_cost || 0),
    0
  );

  return (
    <div className="cost-section">
      <h2>Cost Management</h2>

      {/* 🔥 TOP CARDS */}
      <div className="cost-breakdown">
        <h3>Cost Breakdown by Category</h3>

        <div className="cost-cards">
          <div className="cost-card labour">
            <div className="cost-label">LABOUR COST</div>
            <h2>₹{(costBreakdown.labour / 10000000).toFixed(1)}Cr</h2>
          </div>

          <div className="cost-card material">
            <div className="cost-label">MATERIAL COST</div>
            <h2>₹{(costBreakdown.material / 10000000).toFixed(1)}Cr</h2>
          </div>

          <div className="cost-card equipment">
            <div className="cost-label">EQUIPMENT COST</div>
            <h2>₹{(costBreakdown.equipment / 10000000).toFixed(1)}Cr</h2>
          </div>

          <div className="cost-card misc">
            <div className="cost-label">MISC COST</div>
            <h2>₹{(miscTotal / 10000000).toFixed(1)}Cr</h2>
          </div>
        </div>
      </div>

      {/* 🔥 TABLE */}
      <div className="phase-wise-cost">
        <h3>Cost by Phase (WBS)</h3>

        <div className="table-header">
          <div>Phase</div>
          <div>Budget</div>
          <div>Spent</div>
          <div>Remaining</div>
          <div>% Used</div>
        </div>

        {costSummary.map((wbs) => {
          const totalSpent =
            (wbs.labour_cost || 0) +
            (wbs.material_cost || 0) +
            (wbs.equipment_cost || 0) +
            (wbs.misc_cost || 0);

          return (
            <div key={wbs.wbs_id}>
              {/* 🔹 ROW */}
              <div
                className="table-row"
                onClick={() => {
                  const newId =
                    activePhase === wbs.wbs_id ? null : wbs.wbs_id;

                  setActivePhase(newId);

                  if (newId) {
                    fetch(
                      `http://localhost:5000/api/cost-details/${wbs.wbs_id}`
                    )
                      .then((res) => res.json())
                      .then((data) => setDetails(data))
                      .catch((err) => console.error(err));
                  }
                }}
              >
                <div>{wbs.name}</div>

                <div>
                  ₹{((wbs.budget || 0) / 10000000).toFixed(1)}Cr
                </div>

                <div>
                  ₹{(totalSpent / 10000000).toFixed(1)}Cr
                </div>

                <div>
                  ₹
                  {(
                    ((wbs.budget || 0) - totalSpent) /
                    10000000
                  ).toFixed(1)}
                  Cr
                </div>

                <div>
                  {calculatePercentage(totalSpent, wbs.budget || 1)}%
                </div>
              </div>

              {/* 🔥 EXPAND */}
              {activePhase === wbs.wbs_id && (
                <div className="expanded-row">

                  {/* CATEGORY BUTTONS */}
                  <div className="category-buttons">
                    {["labour", "material", "equipment", "miscellaneous"].map(
                      (cat) => (
                        <button
                          key={cat}
                          className={`cat-btn ${
                            activeCategory === cat ? "active" : ""
                          }`}
                          onClick={() => setActiveCategory(cat)}
                        >
                          {cat === "miscellaneous"
                            ? "MISC"
                            : cat.toUpperCase()}
                        </button>
                      )
                    )}
                  </div>

                  {/* TABLE */}
                  <div className="table-wrapper">
                    <table className="cost-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(details[activeCategory] || []).map((item, i) => (
                          <tr key={i}>
                            <td>{item.name}</td>
                            <td>₹{item.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CostTracking;