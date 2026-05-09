import React, { useState } from "react";

function CostTracking({
  selectedProject,
  activePhase,
  setActivePhase,
  costSummary = [],
  activeCategory,
  setActiveCategory,
  costBreakdown = {},
}) {
  const [details, setDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  if (selectedProject?.status === "Rejected") {
    return <h3 style={{ textAlign: "center" }}>❌ No Cost Tracking</h3>;
  }

  // Formatters
  const formatCr = (value) => (Number(value || 0) / 10000000).toFixed(2);
  const formatRs = (value) =>
    Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Top-card totals (only labour + material)
  const labour   = costBreakdown?.labour   || 0;
  const material = costBreakdown?.material || 0;
  const totalSpentAll = labour + material;

  // Total budget = sum of all phase budgets (BOQ grand_totals)
  const totalBudgetAll = costSummary.reduce((s, w) => s + Number(w.budget || 0), 0);
  const totalRemainingAll = Math.max(totalBudgetAll - totalSpentAll, 0);
  const totalPct = totalBudgetAll > 0 ? ((totalSpentAll / totalBudgetAll) * 100).toFixed(1) : null;

  const pctColor = (pct) => {
    const n = parseFloat(pct);
    if (n > 90) return "#dc2626";
    if (n > 70) return "#d97706";
    return "#16a34a";
  };

  // Fetch expanded row details
  const handlePhaseClick = (wbsId) => {
    const newId = activePhase === wbsId ? null : wbsId;
    setActivePhase(newId);
    if (newId) {
      setLoadingDetails(true);
      fetch(`http://localhost:5000/api/cost-summary/details/${wbsId}`)
        .then((res) => res.json())
        .then((data) => { setDetails(data); setLoadingDetails(false); })
        .catch((err) => { console.error(err); setLoadingDetails(false); });
    }
  };

  return (
    <div className="cost-section">
      <h2>Cost Management</h2>

      {/* ── TOP SUMMARY CARDS (Labour + Material only) ── */}
      <div className="cost-breakdown">
        <h3>Cost Breakdown by Category</h3>
        <div className="cost-cards">
          <div className="cost-card labour">
            <div className="cost-label">LABOUR COST</div>
            <h2>₹{formatCr(labour)} Cr</h2>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>₹{formatRs(labour)}</div>
          </div>
          <div className="cost-card material">
            <div className="cost-label">MATERIAL COST</div>
            <h2>₹{formatCr(material)} Cr</h2>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>₹{formatRs(material)}</div>
          </div>
          <div className="cost-card" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div className="cost-label" style={{ color: "#15803d" }}>TOTAL BUDGET</div>
            <h2 style={{ color: "#15803d" }}>₹{formatCr(totalBudgetAll)} Cr</h2>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>₹{formatRs(totalBudgetAll)}</div>
          </div>
          <div className="cost-card" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
            <div className="cost-label" style={{ color: "#c2410c" }}>REMAINING</div>
            <h2 style={{ color: "#c2410c" }}>₹{formatCr(totalRemainingAll)} Cr</h2>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>₹{formatRs(totalRemainingAll)}</div>
          </div>
        </div>

        {/* Overall budget progress bar */}
        {totalBudgetAll > 0 && (
          <div style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "13px" }}>
              <span style={{ color: "#555" }}>Overall Budget Used</span>
              <span style={{ fontWeight: 600, color: pctColor(totalPct) }}>{totalPct}%</span>
            </div>
            <div style={{ background: "#e5e7eb", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, parseFloat(totalPct))}%`,
                background: pctColor(totalPct),
                borderRadius: "8px",
                transition: "width 0.8s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "11px", color: "#888" }}>
             <span>Spent: ₹{formatRs(totalSpentAll)}</span>
              <span>Budget: ₹{formatRs(totalBudgetAll)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── PHASE TABLE ── */}
      <div className="phase-wise-cost">
        <h3>Cost by Phase (WBS)</h3>

        <div className="table-header">
          <div>Phase</div>
          <div>Budget (BOQ)</div>
          <div>Spent</div>
          <div>Remaining</div>
          <div>% Used</div>
        </div>

        {costSummary.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "#888" }}>
            No cost data found. Submit a BOQ and Cost Report first.
          </div>
        ) : (
          costSummary.map((wbs) => {
            const spent =
              Number(wbs.labour_cost   || 0) +
              Number(wbs.material_cost || 0);

            const budget    = Number(wbs.budget || 0);
            const remaining = budget > 0 ? Math.max(budget - spent, 0) : null;
            const pct       = budget > 0 ? ((spent / budget) * 100).toFixed(1) : null;
            const hasData   = spent > 0 || budget > 0;

            return (
              <div key={wbs.wbs_id}>
                <div
                  className="table-row"
                  style={{ cursor: hasData ? "pointer" : "default", opacity: hasData ? 1 : 0.45 }}
                  onClick={() => hasData && handlePhaseClick(wbs.wbs_id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {hasData && (
                      <span style={{ color: "#2563eb", fontSize: "10px" }}>
                        {activePhase === wbs.wbs_id ? "▼" : "▶"}
                      </span>
                    )}
                    {wbs.name}
                  </div>

                  {/* Budget */}
                  <div style={{ color: budget > 0 ? "#15803d" : "#bbb", fontWeight: budget > 0 ? 600 : 400 }}>
                    {budget > 0 ? `₹${formatCr(budget)} Cr` : "—"}
                  </div>

                  {/* Spent */}
                  <div style={{ fontWeight: spent > 0 ? 600 : 400, color: spent > 0 ? "#111" : "#bbb" }}>
                    {spent > 0 ? `₹${formatRs(spent)}` : "—"}
                  </div>

                  {/* Remaining */}
                  <div style={{ color: remaining !== null ? (remaining === 0 ? "#dc2626" : "#15803d") : "#bbb" }}>
                    {remaining !== null ? `₹${formatRs(remaining)}` : "—"}
                  </div>

                  {/* % Used */}
                  <div>
                    {pct !== null ? (
                      <span style={{
                        color: pctColor(pct), fontWeight: 600,
                        background: `${pctColor(pct)}18`,
                        padding: "2px 8px", borderRadius: "12px", fontSize: "12px"
                      }}>
                        {pct}%
                      </span>
                    ) : (
                      <span style={{ color: "#bbb" }}>—</span>
                    )}
                  </div>
                </div>

                {/* ── EXPANDED DETAILS ── */}
                {activePhase === wbs.wbs_id && (
                  <div className="expanded-row">
                    {loadingDetails ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>Loading details...</div>
                    ) : (
                      <>
                        <div className="category-buttons">
                          {["labour", "material"].map((cat) => (
                            <button
                              key={cat}
                              className={`cat-btn ${activeCategory === cat ? "active" : ""}`}
                              onClick={() => setActiveCategory(cat)}
                            >
                              {cat.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        {/* LABOUR */}
                        {activeCategory === "labour" && (
                          <div className="table-wrapper">
                            <table className="cost-table" style={{ marginBottom: "12px" }}>
                              <tbody>
                                <tr>
                                  <td><strong>Total Workers</strong></td>
                                  <td>{details.labour?.total_workers || 0}</td>
                                </tr>
                                <tr>
                                  <td><strong>Total Labour Cost</strong></td>
                                  <td><strong>₹{formatRs(details.labour?.total_cost)}</strong></td>
                                </tr>
                              </tbody>
                            </table>
                            {(details.labour?.rows || []).length > 0 ? (
                              <table className="cost-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Labour Type</th>
                                    <th>Workers</th>
                                    <th>Days</th>
                                    <th>Daily Wage (₹)</th>
                                    <th>Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.labour.rows.map((row, i) => (
                                    <tr key={i}>
                                      <td>{i + 1}</td>
                                      <td>{row.labour_type}</td>
                                      <td>{row.workers}</td>
                                      <td>{row.working_days}</td>
                                      <td>{formatRs(row.daily_wage)}</td>
                                      <td><strong>₹{formatRs(row.total_cost)}</strong></td>
                                    </tr>
                                  ))}
                                  <tr style={{ borderTop: "2px solid #ddd", background: "#f9fafb" }}>
                                    <td colSpan={5}><strong>Total</strong></td>
                                    <td><strong>₹{formatRs(details.labour?.total_cost)}</strong></td>
                                  </tr>
                                </tbody>
                              </table>
                            ) : (
                              <p style={{ color: "#888", textAlign: "center", padding: "16px" }}>
                                No labour breakdown available
                              </p>
                            )}
                          </div>
                        )}

                        {/* MATERIAL */}
                        {activeCategory === "material" && (
                          <div className="table-wrapper">
                            {(details.material || []).length > 0 ? (
                              <table className="cost-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Material</th>
                                    <th>Unit</th>
                                    <th>Quantity</th>
                                    <th>Unit Price (₹)</th>
                                    <th>Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.material.map((item, i) => (
                                    <tr key={i}>
                                      <td>{i + 1}</td>
                                      <td>{item.name}</td>
                                      <td>{item.unit || "—"}</td>
                                      <td>{Number(item.total_qty).toLocaleString("en-IN")}</td>
                                      <td>{formatRs(item.unit_price)}</td>
                                      <td><strong>₹{formatRs(item.total_cost)}</strong></td>
                                    </tr>
                                  ))}
                                  <tr style={{ borderTop: "2px solid #ddd", background: "#f9fafb" }}>
                                    <td colSpan={5}><strong>Material Total</strong></td>
                                    <td>
                                      <strong>
                                        ₹{formatRs(
                                          details.material.reduce((s, i) => s + parseFloat(i.total_cost || 0), 0)
                                        )}
                                      </strong>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            ) : (
                              <p style={{ color: "#888", textAlign: "center", padding: "16px" }}>
                                No material data available
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default CostTracking;