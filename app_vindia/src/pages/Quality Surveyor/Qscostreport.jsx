import React, { useState, useEffect, useCallback } from "react";
import "./Qscostreport.css";

const BOQ_API = "/api/boq";
const CR_API  = "/api/cost-report";

const STATUS = {
  pending_pm: { label: "Awaiting PM Approval", color: "amber", icon: "⏳" },
  approved:   { label: "Approved by PM",        color: "green", icon: "✅" },
  rejected:   { label: "Changes Requested",     color: "red",   icon: "↩️" },
};

const fmt = (n) =>
  "₹ " + (parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

// Safe array helper
const safeArr = (val) => {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch (_) { return []; }
  }
  return [];
};

export default function Qscostreport() {
  const [tab,            setTab]           = useState("list");
  const [toast,          setToast]         = useState(null);
  const [apiError,       setApiError]      = useState(null);
  const [projects,       setProjects]      = useState([]);
  const [reports,        setReports]       = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [filterProject,  setFilterProject]  = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterFrom,     setFilterFrom]     = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [filterTo,      setFilterTo]      = useState(() => new Date().toISOString().split("T")[0]);
  const [viewingReport, setViewingReport] = useState(null);
  const [rejectModal,   setRejectModal]   = useState(null);
  const [rejectComment, setRejectComment] = useState("");

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${BOQ_API}/projects`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setProjects(data);
      } catch (err) {
        setApiError("Could not load projects: " + err.message);
      }
    })();
  }, []);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.append("projectId", filterProject);
      if (filterStatus)  params.append("status",    filterStatus);
      const res  = await fetch(`${CR_API}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReports(data);
    } catch (err) {
      notify("Could not load reports: " + err.message, "error");
    } finally {
      setReportsLoading(false);
    }
  }, [filterProject, filterStatus]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const pmApprove = async (id) => {
    try {
      const res  = await fetch(`${CR_API}/approve/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      notify("PM approved ✅ — BOQ moved to SE approval stage");
      fetchReports();
      if (viewingReport?.id === id) {
        const r = await fetch(`${CR_API}/${id}`);
        setViewingReport(await r.json());
      }
    } catch (err) { notify(err.message, "error"); }
  };

  const openRejectModal = (id) => { setRejectComment(""); setRejectModal({ id }); };

  const submitReject = async () => {
    if (!rejectModal) return;
    const id = rejectModal.id;
    try {
      const res  = await fetch(`${CR_API}/reject/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: rejectComment.trim() || "Please review the cost figures." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      notify("Changes requested ↩️ — BOQ rejected, QS must edit and resubmit");
      setRejectModal(null); setRejectComment("");
      fetchReports();
      if (viewingReport?.id === id) {
        const r = await fetch(`${CR_API}/${id}`);
        setViewingReport(await r.json());
      }
    } catch (err) { notify(err.message, "error"); }
  };

  const openDetail = async (report) => {
    setTab("detail");
    setViewingReport(report);
    try {
      const res  = await fetch(`${CR_API}/${report.id}`);
      const data = await res.json();
      if (res.ok) setViewingReport(data);
    } catch (_) {}
  };

  const exportCSV = (report) => {
    const labourItems = safeArr(report.labourItems);
    const matLines = [
      `Cost Report — ${report.projectName} · ${report.milestoneName}`,
      `Generated: ${new Date().toLocaleDateString("en-IN")} | BOQ Ref: #${report.boqId}`,
      "",
      "--- MATERIALS ---",
      ["#", "Material", "Unit", "Quantity", "Unit Price (₹)", "Total (₹)"].join(","),
      ...safeArr(report.items).map((item, i) =>
        [i + 1, item.material, item.unit, item.quantity,
          parseFloat(item.unitPrice || 0).toFixed(2),
          parseFloat(item.total || 0).toFixed(2)].join(",")
      ),
      `,,,,Material Total,${parseFloat(report.materialTotal || report.totalCost).toFixed(2)}`,
      "",
    ];
    const labLines = labourItems.length > 0 ? [
      "--- LABOUR ---",
      ["#", "Labour Type", "Workers", "Working Days", "Daily Wage (₹)", "Total Wage (₹)"].join(","),
      ...labourItems.map((item, i) =>
        [i + 1, item.labourType, item.workers, item.workingDays,
          parseFloat(item.dailyWage || 0).toFixed(2),
          parseFloat(item.total || 0).toFixed(2)].join(",")
      ),
      `,,,,Labour Total,${parseFloat(report.labourTotal || 0).toFixed(2)}`,
      "",
    ] : [];
    const footer = [`,,,,Grand Total,${parseFloat(report.totalCost).toFixed(2)}`];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([[...matLines, ...labLines, ...footer].join("\n")], { type: "text/csv" })
    );
    a.download = `CostReport_${report.projectName?.replace(/ /g, "_")}_${report.milestoneName}.csv`;
    a.click();
  };

  const pct = (part, total) => total ? ((part / total) * 100).toFixed(1) : "0.0";

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    const parts = String(dateStr).split(" ");
    if (parts.length === 3 && months[parts[1]] !== undefined)
      return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
    const d = new Date(dateStr);
    return isNaN(d) ? null : d;
  };

  const setRange = (days) => {
    const to = new Date(); const from = new Date();
    from.setDate(from.getDate() - days);
    setFilterFrom(from.toISOString().split("T")[0]);
    setFilterTo(to.toISOString().split("T")[0]);
  };

  const filtered = reports.filter((r) => {
    if (filterProject && String(r.projectId) !== String(filterProject)) return false;
    if (filterStatus  && r.status !== filterStatus) return false;
    if (filterFrom || filterTo) {
      const d = parseDate(r.createdDate);
      if (d) {
        if (filterFrom) { const [fy,fm,fd] = filterFrom.split("-").map(Number); if (d < new Date(fy,fm-1,fd)) return false; }
        if (filterTo)   { const [ty,tm,td] = filterTo.split("-").map(Number);   if (d > new Date(ty,tm-1,td,23,59,59)) return false; }
      }
    }
    return true;
  });

  // ── Reusable Labour table ──
  const LabourTable = ({ items, labourTotal }) => {
    const safeItems = safeArr(items);
    if (safeItems.length === 0) return null;
    return (
      <div className="cr__table-scroll">
        <table className="cr__table">
          <colgroup>
            <col style={{width:"44px"}} /><col />
            <col style={{width:"88px"}} /><col style={{width:"110px"}} />
            <col style={{width:"145px"}} /><col style={{width:"155px"}} />
            <col style={{width:"90px"}} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th><th>Labour Type</th><th>Workers</th>
              <th>Working Days</th><th>Daily Wage (₹)</th>
              <th>Total Wage (₹)</th><th>% Share</th>
            </tr>
          </thead>
          <tbody>
            {safeItems.map((item, i) => {
              const share = pct(parseFloat(item.total || 0), labourTotal);
              return (
                <tr key={i}>
                  <td className="cr-num">{i + 1}</td>
                  <td className="cr-material"><strong>{item.labourType}</strong></td>
                  <td className="cr-center">{parseInt(item.workers || 0).toLocaleString("en-IN")}</td>
                  <td className="cr-center">{parseInt(item.workingDays || 0).toLocaleString("en-IN")}</td>
                  <td className="cr-mono">₹ {parseFloat(item.dailyWage || 0).toLocaleString("en-IN")}</td>
                  <td className="cr-labour-total">{fmt(item.total)}</td>
                  <td className="cr-pct">
                    <div className="cr-pct-wrap">
                      <span>{share}%</span>
                      <div className="cr-pct-bar">
                        <div className="cr-pct-fill cr-pct-fill--blue" style={{width:`${share}%`}} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="cr-tfoot-lbl">Total Labour Cost</td>
              <td className="cr-tfoot-val">{fmt(labourTotal)}</td>
              <td className="cr-tfoot-pct">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="cr">
      {toast && <div className={`cr__toast cr__toast--${toast.type}`}>{toast.msg}</div>}

      {/* HEADER */}
      <div className="cr__header">
        <div className="cr__header-left">
          {tab === "detail" ? (
            <button className="cr__back-btn"
              onClick={() => { setViewingReport(null); setTab("list"); }}>← Back</button>
          ) : (
            <div className="cr__header-icon">💰</div>
          )}
          <div>
            <h1 className="cr__title">
              {tab === "detail" && viewingReport
                ? `${viewingReport.projectName} · ${viewingReport.milestoneName}`
                : "Cost Report"}
            </h1>
            <p className="cr__subtitle">Quantity Surveyor · Cost Management</p>
          </div>
        </div>
        {tab !== "detail" && (
          <div className="cr__tabs">
            <button className={`cr__tab ${tab === "list" ? "active" : ""}`} onClick={() => setTab("list")}>
              All Reports
              {reports.length > 0 && <span className="cr__badge">{reports.length}</span>}
            </button>
          </div>
        )}
      </div>

      {/* FLOW BANNER */}
      <div className="cr__flow-bar">
        {["BOQ Created by QS", "Cost Report Auto-Created", "Sent to PM", "PM Approves / Rejects", "BOQ → SE Stage"].map(
          (s, i, arr) => (
            <React.Fragment key={i}>
              <div className="cr__flow-step">
                <span className="cr__flow-dot">{i + 1}</span>
                <span className="cr__flow-label">{s}</span>
              </div>
              {i < arr.length - 1 && <span className="cr__flow-arrow">›</span>}
            </React.Fragment>
          )
        )}
      </div>

      {apiError && <div className="cr__api-error">⚠️ {apiError}</div>}

      <div className="cr__body">

        {/* ══ LIST TAB ══ */}
        {tab === "list" && (
          <>
            <div className="cr__view-head">
              <h2 className="cr__view-h">All Cost Reports</h2>
            </div>

            <div className="cr__filter-bar">
              <div className="cr__range-btns">
                <span className="cr__range-label">📅 Show:</span>
                {[{l:"Today",d:0},{l:"1 Week",d:7},{l:"1 Month",d:30},{l:"3 Months",d:90}].map(({l,d}) => {
                  const from = new Date(); from.setDate(from.getDate()-d);
                  const isActive = filterFrom===from.toISOString().split("T")[0] && filterTo===new Date().toISOString().split("T")[0];
                  return <button key={l} className={`cr__range-btn ${isActive?"active":""}`} onClick={()=>setRange(d)}>{l}</button>;
                })}
                <button className="cr__range-btn" onClick={()=>{setFilterFrom("");setFilterTo("");}}>All Time</button>
              </div>
              <div className="cr__date-range">
                <span className="cr__date-range-label">From</span>
                <input type="date" className="cr__date-input" value={filterFrom} onChange={(e)=>setFilterFrom(e.target.value)} />
                <span className="cr__date-range-label">To</span>
                <input type="date" className="cr__date-input" value={filterTo} onChange={(e)=>setFilterTo(e.target.value)} />
              </div>
              <div className="cr__filters">
                <select className="cr__select cr__select--sm" value={filterProject} onChange={(e)=>setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="cr__select cr__select--sm" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {reportsLoading ? (
              <div className="cr__loading"><div className="cr__spinner" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="cr__empty">
                <span>💰</span>
                <p>No cost reports yet.</p>
                <p className="cr__empty-hint">Cost reports are automatically created when you click "Create Cost Report" in the BOQ page.</p>
              </div>
            ) : (
              <div className="cr__cards-list">
                {filtered.map((r) => {
                  const st         = STATUS[r.status] || STATUS.pending_pm;
                  const labourItems = safeArr(r.labourItems);
                  const hasLabour   = r.labourTotal > 0 || labourItems.length > 0;
                  return (
                    <div key={r.id} className={`cr__card cr__card--${st.color}`}>
                      <div className="cr__card-top">
                        <div>
                          <div className="cr__card-proj">{r.projectName}</div>
                          <div className="cr__card-meta">
                            🏗️ {r.milestoneName} &nbsp;·&nbsp;
                            BOQ #{r.boqId} &nbsp;·&nbsp;
                            📅 {r.createdDate}
                            {r.updatedDate && <span> · Updated {r.updatedDate}</span>}
                          </div>
                        </div>
                        <div className="cr__card-right">
                          <div className="cr__card-total">{fmt(r.totalCost)}</div>
                          {hasLabour && (
                            <div className="cr__card-cost-split">
                              <span className="cr__cost-pill cr__cost-pill--mat">Mat {fmt(r.materialTotal || 0)}</span>
                              <span className="cr__cost-pill cr__cost-pill--lab">Lab {fmt(r.labourTotal || 0)}</span>
                            </div>
                          )}
                          <span className={`cr__status-badge cr__status--${st.color}`}>
                            {st.icon} {st.label}
                          </span>
                        </div>
                      </div>

                      {r.status === "rejected" && r.pmComment && (
                        <div className="cr__card-comment">
                          <strong>💬 PM:</strong> {r.pmComment}
                        </div>
                      )}

                      <div className="cr__card-actions">
                        <button className="cr__view-btn" onClick={() => openDetail(r)}>👁 View Report</button>
                        {r.status === "pending_pm" && (
                          <>
                            <button className="cr__approve-btn" onClick={() => pmApprove(r.id)}>✔ PM Approve</button>
                            <button className="cr__reject-btn" onClick={() => openRejectModal(r.id)}>✘ PM Reject</button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <button className="cr__export-btn" onClick={() => exportCSV(r)}>⬇ Export CSV</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══ DETAIL TAB ══ */}
        {tab === "detail" && viewingReport && (() => {
          const r           = viewingReport;
          const st          = STATUS[r.status] || STATUS.pending_pm;
          const items       = safeArr(r.items);
          const labourItems = safeArr(r.labourItems);

          // Always recalculate from arrays to be safe
          const matTotal   = items.reduce((s, i) => s + parseFloat(i.total || 0), 0);
          const labTotal   = labourItems.reduce((s, i) => s + parseFloat(i.total || 0), 0);
          const grandTotal = matTotal + labTotal;
          const hasLabour  = labourItems.length > 0;

          return (
            <div className="cr__detail">

              {/* Info bar */}
              <div className="cr__detail-infobar">
                <div className="cr__detail-infoitem">
                  <span className="cr__detail-infolbl">Project</span>
                  <span className="cr__detail-infoval">{r.projectName}</span>
                </div>
                <div className="cr__detail-infoitem">
                  <span className="cr__detail-infolbl">Milestone</span>
                  <span className="cr__detail-infoval">🏗️ {r.milestoneName}</span>
                </div>
                <div className="cr__detail-infoitem">
                  <span className="cr__detail-infolbl">BOQ Ref</span>
                  <span className="cr__detail-infoval">#{r.boqId}</span>
                </div>
                <div className="cr__detail-infoitem">
                  <span className="cr__detail-infolbl">Created</span>
                  <span className="cr__detail-infoval">{r.createdDate}</span>
                </div>
                {r.updatedDate && (
                  <div className="cr__detail-infoitem">
                    <span className="cr__detail-infolbl">Updated</span>
                    <span className="cr__detail-infoval">{r.updatedDate}</span>
                  </div>
                )}
                <div className="cr__detail-infoitem">
                  <span className="cr__detail-infolbl">Status</span>
                  <span className={`cr__status-badge cr__status--${st.color}`}>{st.icon} {st.label}</span>
                </div>
                {hasLabour && (
                  <>
                    <div className="cr__detail-infoitem">
                      <span className="cr__detail-infolbl">Materials</span>
                      <span className="cr__detail-infoval" style={{color:"#0b6e72"}}>
                        {fmt(matTotal)}
                      </span>
                    </div>
                    <div className="cr__detail-infoitem">
                      <span className="cr__detail-infolbl">Labour</span>
                      <span className="cr__detail-infoval" style={{color:"#1d4ed8"}}>
                        {fmt(labTotal)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Rejection note */}
              {r.status === "rejected" && r.pmComment && (
                <div className="cr__note">
                  <strong>💬 PM Comment:</strong> {r.pmComment}
                  <span className="cr__note-hint">Go to BOQ page → Edit BOQ → Resubmit</span>
                </div>
              )}

              {/* Approved banner */}
              {r.status === "approved" && (
                <div className="cr__approved-banner">
                  <span className="cr__approved-icon">✅</span>
                  <div>
                    <div className="cr__approved-title">Approved by Project Manager</div>
                    <div className="cr__approved-sub">
                      BOQ has moved to SE approval stage. QS can now create the Quantity Report.
                    </div>
                  </div>
                  <button className="cr__export-btn cr__export-btn--lg" onClick={() => exportCSV(r)}>⬇ Export CSV</button>
                </div>
              )}

              {/* Approval tracker */}
              <div className="cr__block">
                <div className="cr__block-label"><span className="cr__num">📊</span> Approval Progress</div>
                <div className="cr__approval-track">
                  {[
                    { label: "Cost Report Created", done: true },
                    { label: "Sent to PM",  done: ["pending_pm","approved","rejected"].includes(r.status), current: r.status === "pending_pm" },
                    { label: "PM Approved", done: r.status === "approved", current: r.status === "pending_pm" },
                    { label: "BOQ → SE Stage", done: r.status === "approved" },
                  ].map((step, i, arr) => (
                    <React.Fragment key={i}>
                      <div className={`cr__ap-step ${step.done ? "done" : step.current ? "active" : ""}`}>
                        <span className="cr__ap-dot">{step.done ? "✓" : i + 1}</span>
                        <span className="cr__ap-label">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className="cr__ap-line" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* PM action buttons */}
              {r.status === "pending_pm" && (
                <div className="cr__pm-actions">
                  <span className="cr__pm-actions-label">[ PM Actions ]</span>
                  <button className="cr__approve-btn cr__approve-btn--lg" onClick={() => pmApprove(r.id)}>✔ Approve Cost Report</button>
                  <button className="cr__reject-btn cr__reject-btn--lg" onClick={() => openRejectModal(r.id)}>✘ Request Changes</button>
                </div>
              )}

              {/* ── MATERIAL COST TABLE ── */}
              <div className="cr__block">
                <div className="cr__block-label">
                  <span className="cr__num">📋</span>
                  Material Cost Breakdown
                  <span className="cr__auto-tag">🔗 From BOQ #{r.boqId}</span>
                </div>
                <div className="cr__table-scroll">
                  <table className="cr__table">
                    <colgroup>
                      <col style={{width:"44px"}} /><col />
                      <col style={{width:"80px"}} /><col style={{width:"110px"}} />
                      <col style={{width:"145px"}} /><col style={{width:"155px"}} />
                      <col style={{width:"90px"}} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>#</th><th>Material / Item</th><th>Unit</th>
                        <th>Quantity</th><th>Unit Price (₹)</th>
                        <th>Total Cost (₹)</th><th>% Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const share = pct(parseFloat(item.total || 0), matTotal);
                        return (
                          <tr key={i}>
                            <td className="cr-num">{i + 1}</td>
                            <td className="cr-material"><strong>{item.material}</strong></td>
                            <td className="cr-center">{item.unit}</td>
                            <td className="cr-center">{parseFloat(item.quantity || 0).toLocaleString("en-IN")}</td>
                            <td className="cr-mono">₹ {parseFloat(item.unitPrice || 0).toLocaleString("en-IN")}</td>
                            <td className="cr-total">{fmt(item.total)}</td>
                            <td className="cr-pct">
                              <div className="cr-pct-wrap">
                                <span>{share}%</span>
                                <div className="cr-pct-bar">
                                  <div className="cr-pct-fill" style={{width:`${share}%`}} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="cr-tfoot-lbl">Material Total</td>
                        <td className="cr-tfoot-val">{fmt(matTotal)}</td>
                        <td className="cr-tfoot-pct">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── LABOUR COST TABLE — shown only when labour exists ── */}
              {hasLabour && (
                <div className="cr__block">
                  <div className="cr__block-label">
                    <span className="cr__num cr__num--blue">👷</span>
                    Labour Cost Breakdown
                    <span className="cr__auto-tag cr__auto-tag--blue">🔗 From BOQ #{r.boqId}</span>
                  </div>
                  <LabourTable items={labourItems} labourTotal={labTotal} />
                </div>
              )}

              {/* ── COST SUMMARY ── */}
              <div className="cr__cost-summary">
                <div className="cr__cost-summary-row">
                  <span>Material Total</span>
                  <span className="cr__cost-summary-mat">{fmt(matTotal)}</span>
                </div>
                {hasLabour && (
                  <div className="cr__cost-summary-row">
                    <span>Labour Total</span>
                    <span className="cr__cost-summary-lab">{fmt(labTotal)}</span>
                  </div>
                )}
                <div className="cr__cost-summary-total">
                  <span>Grand Total</span>
                  <span>{fmt(grandTotal)}</span>
                </div>
              </div>

              {/* Summary stat cards */}
              <div className="cr__detail-summary">
                <div className="cr__sum-card">
                  <span className="cr__sum-lbl">Material Items</span>
                  <span className="cr__sum-val">{items.length}</span>
                </div>
                {hasLabour && (
                  <div className="cr__sum-card">
                    <span className="cr__sum-lbl">Labour Types</span>
                    <span className="cr__sum-val">{labourItems.length}</span>
                  </div>
                )}
                <div className="cr__sum-card cr__sum-card--highlight">
                  <span className="cr__sum-lbl">Grand Total Cost</span>
                  <span className="cr__sum-val cr__sum-val--big">{fmt(grandTotal)}</span>
                </div>
                {hasLabour && (
                  <div className="cr__sum-card cr__sum-card--blue">
                    <span className="cr__sum-lbl">Labour % of Total</span>
                    <span className="cr__sum-val cr__sum-val--blue">
                      {grandTotal > 0 ? ((labTotal / grandTotal) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                )}
                <div className="cr__sum-card">
                  <span className="cr__sum-lbl">Highest Material Cost</span>
                  <span className="cr__sum-val">
                    {items.length > 0
                      ? items.reduce((a, b) => parseFloat(b.total || 0) > parseFloat(a.total || 0) ? b : a, items[0])?.material || "—"
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="cr__detail-actions">
                <button className="cr__ghost-btn"
                  onClick={() => { setViewingReport(null); setTab("list"); }}>
                  ← Back to All Reports
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* REJECT MODAL */}
      {rejectModal && (
        <div className="cr__modal-overlay">
          <div className="cr__modal">
            <div className="cr__modal-header">
              <span className="cr__modal-icon">↩️</span>
              <div>
                <div className="cr__modal-title">Request Changes</div>
                <div className="cr__modal-sub">Add a suggestion for the Quantity Surveyor</div>
              </div>
            </div>
            <textarea className="cr__modal-textarea"
              placeholder="e.g. Please review the unit prices for steel and concrete…"
              value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
              rows={4} autoFocus />
            <div className="cr__modal-actions">
              <button className="cr__modal-cancel"
                onClick={() => { setRejectModal(null); setRejectComment(""); }}>Cancel</button>
              <button className="cr__modal-submit" onClick={submitReject}>
                ✘ Send Rejection &amp; Suggestion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}