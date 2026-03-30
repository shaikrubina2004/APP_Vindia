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
  // ❌ Rejected
  if (selectedProject?.status === "Rejected") {
    return <h3 style={{ textAlign: "center" }}>❌ No Cost Tracking</h3>;
  }

  // ❌ Pending
  if (selectedProject?.status === "Pending") {
    return <h3 style={{ textAlign: "center" }}>⏳ Not Available</h3>;
  }

  // ✅ Calculate misc total
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
            <p>
              {selectedProject.spent > 0
                ? ((costBreakdown.labour / selectedProject.spent) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          <div className="cost-card material">
            <div className="cost-label">MATERIAL COST</div>
            <h2>₹{(costBreakdown.material / 10000000).toFixed(1)}Cr</h2>
            <p>
              {selectedProject.spent > 0
                ? ((costBreakdown.material / selectedProject.spent) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          <div className="cost-card equipment">
            <div className="cost-label">EQUIPMENT COST</div>
            <h2>₹{(costBreakdown.equipment / 10000000).toFixed(1)}Cr</h2>
            <p>
              {selectedProject.spent > 0
                ? ((costBreakdown.equipment / selectedProject.spent) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          <div className="cost-card misc">
            <div className="cost-label">MISCELLANEOUS COST</div>
            <h2>₹{(miscTotal / 10000000).toFixed(1)}Cr</h2>
            <p>
              {selectedProject.spent > 0
                ? ((miscTotal / selectedProject.spent) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

        </div>
      </div>

      {/* 🔥 BUDGET VS SPENT */}
      <div className="budget-comparison">
        <h3>Budget vs Actual Spending</h3>

        <div className="comparison-chart">
          <div className="chart-item">
            <div className="chart-label">Budget</div>
            <div className="chart-bar budget">
              ₹{(selectedProject.budget / 10000000).toFixed(1)}Cr
            </div>
          </div>

          <div className="chart-item">
            <div className="chart-label">Spent</div>
            <div className="chart-bar spent">
              ₹{(selectedProject.spent / 10000000).toFixed(1)}Cr
            </div>
          </div>

          <div className="chart-item">
            <div className="chart-label">Remaining</div>
            <div className="chart-bar remaining">
              ₹
              {(
                calculateRemaining(
                  selectedProject.budget,
                  selectedProject.spent
                ) / 10000000
              ).toFixed(1)}
              Cr
            </div>
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

            {/* EXPAND */}
            {activePhase === wbs.id && (
              <div className="expanded-row">

                {/* BUTTONS */}
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

                {/* TOTAL */}
                {activeCategory && (
                  <div className="summary-box">

                    {activeCategory === "labour" && <p>₹{wbs.labour}</p>}
                    {activeCategory === "material" && <p>₹{wbs.material}</p>}
                    {activeCategory === "equipment" && <p>₹{wbs.equipment}</p>}

                    {activeCategory === "miscellaneous" && (
                      <p>
                        ₹{
                          (wbs.costDetails?.miscellaneous || []).reduce(
                            (sum, i) => sum + i.amount,
                            0
                          )
                        }
                      </p>
                    )}

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