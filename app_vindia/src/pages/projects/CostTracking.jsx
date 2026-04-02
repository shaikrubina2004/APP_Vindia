import React, { useState } from "react";

function CostTracking({
  selectedProject,
  activePhase,
  setActivePhase,
  costSummary = [],
  activeCategory,
  setActiveCategory,
  costBreakdown,
}) {
  const [details, setDetails] = useState({});

  if (selectedProject?.status === "Rejected") {
    return <h3 style={{ textAlign: "center" }}>❌ No Cost Tracking</h3>;
  }

  // ✅ Safe percentage (no Infinity%)
  const safePercentage = (spent, budget) => {
    if (!budget || budget === 0) return 0;
    return ((spent / budget) * 100).toFixed(1);
  };

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
                      `http://localhost:5000/api/cost-summary/details/${wbs.wbs_id}`
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

                <div>{safePercentage(totalSpent, wbs.budget)}%</div>
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

                  {/* 🔥 LABOUR TABLE */}
                  {activeCategory === "labour" && (
                    <div className="table-wrapper">
                      <table className="cost-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Total Workers</td>
                            <td>{details.labour?.total_workers || 0}</td>
                          </tr>
                          <tr>
                            <td>Total Cost</td>
                            <td>₹{details.labour?.total_cost || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 🔥 MATERIAL TABLE */}
                  {activeCategory === "material" && (
                    <div className="table-wrapper">
                      <table className="cost-table">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th>Quantity</th>
                            <th>Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(details.material || []).map((item, i) => (
                            <tr key={i}>
                              <td>{item.name}</td>
                              <td>{item.total_qty}</td>
                              <td>₹{item.total_cost}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 🔥 EQUIPMENT TABLE */}
                  {activeCategory === "equipment" && (
                    <div className="table-wrapper">
                      <table className="cost-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Total Equipment Cost</td>
                            <td>₹{details.equipment?.total_cost || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 🔥 MISC TABLE */}
                  {activeCategory === "miscellaneous" && (
                    <div className="table-wrapper">
                      <table className="cost-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(details.miscellaneous || []).map((item, i) => (
                            <tr key={i}>
                              <td>{item.name}</td>
                              <td>₹{item.cost}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

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