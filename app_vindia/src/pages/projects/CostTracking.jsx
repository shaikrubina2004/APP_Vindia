import React from "react";

function CostTracking({
  selectedProject,
  activePhase,
  setActivePhase,
  activeCategory,
  setActiveCategory,
  costBreakdown,
  calculateRemaining,
  calculatePercentage,
}) {
  if (selectedProject?.status === "Rejected") {
    return <h3 style={{ textAlign: "center" }}>❌ No Cost Tracking</h3>;
  }

  const miscTotal = selectedProject.wbs.reduce(
    (sum, w) =>
      sum +
      (w.costDetails?.miscellaneous || []).reduce(
        (s, i) => s + i.amount,
        0
      ),
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

      {/* 🔥 PHASE TABLE */}
      <div className="phase-wise-cost">
        <h3>Cost by Phase (WBS)</h3>

        <div className="table-header">
          <div>Phase</div>
          <div>Budget</div>
          <div>Spent</div>
          <div>Remaining</div>
          <div>% Used</div>
        </div>

        {selectedProject.wbs.map((wbs) => (
          <div key={wbs.id}>
            {/* ROW */}
            <div
              className="table-row"
              onClick={() =>
                setActivePhase(activePhase === wbs.id ? null : wbs.id)
              }
            >
              <div>{wbs.name}</div>
              <div>₹{(wbs.budget / 10000000).toFixed(1)}Cr</div>
              <div>₹{(wbs.spent / 10000000).toFixed(1)}Cr</div>
              <div>
                ₹{((wbs.budget - wbs.spent) / 10000000).toFixed(1)}Cr
              </div>
              <div>{calculatePercentage(wbs.spent, wbs.budget)}%</div>
            </div>

            {/* 🔥 EXPAND */}
            {activePhase === wbs.id && (
              <div className="expanded-row">

                {/* 🔥 CATEGORY BUTTONS */}
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

                {/* 🔥 TABLES */}
                {activeCategory === "labour" && (
                  <div className="table-wrapper">
                    <table className="cost-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Workers</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(wbs.costDetails?.labour || []).map((item, i) => (
                          <tr key={i}>
                            <td>{item.name}</td>
                            <td>{item.workers || 0}</td>
                            <td>₹{item.amount}</td>
                          </tr>
                        ))}
                        <tr style={{ fontWeight: "bold" }}>
                          <td>Total</td>
                          <td>
                            {(wbs.costDetails?.labour || []).reduce(
                              (sum, i) => sum + (i.workers || 0),
                              0
                            )}
                          </td>
                          <td>
                            ₹
                            {(wbs.costDetails?.labour || []).reduce(
                              (sum, i) => sum + (i.amount || 0),
                              0
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {activeCategory === "material" && (
                  <div className="table-wrapper">
                    <table className="cost-table">
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(wbs.costDetails?.material || []).map((item, i) => (
                          <tr key={i}>
                            <td>{item.name}</td>
                            <td>₹{item.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeCategory === "equipment" && (
                  <div className="table-wrapper">
                    <table className="cost-table">
                      <thead>
                        <tr>
                          <th>Equipment</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(wbs.costDetails?.equipment || []).map((item, i) => (
                          <tr key={i}>
                            <td>{item.name}</td>
                            <td>₹{item.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeCategory === "miscellaneous" && (
                  <div className="table-wrapper">
                    <table className="cost-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(wbs.costDetails?.miscellaneous || []).map(
                          (item, i) => (
                            <tr key={i}>
                              <td>{item.name}</td>
                              <td>₹{item.amount}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CostTracking;