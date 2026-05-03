import React, { useState, useEffect, useCallback } from "react";
import "./Qsquantityreport.css";

const BOQ_API = "/api/boq";
const QR_API  = "/api/quantity-report";

const STATUS = {
  pending_se: { label: "Awaiting SE Approval", color: "blue",  icon: "⏳" },
  approved:   { label: "Approved by SE",        color: "green", icon: "✅" },
  rejected:   { label: "Changes Requested",     color: "red",   icon: "↩️" },
};

export default function Qsquantityreport() {
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
  const [filterTo,       setFilterTo]       = useState(() => new Date().toISOString().split("T")[0]);
  const [viewingReport,  setViewingReport]  = useState(null);
  const [rejectModal,    setRejectModal]    = useState(null); // { id } when open
  const [rejectComment,  setRejectComment]  = useState("");

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const totalQty = (items) =>
    (items || []).reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);

  // ── Fetch projects ──
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

  // ── Fetch reports ──
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.append("projectId", filterProject);
      if (filterStatus)  params.append("status",    filterStatus);
      const res  = await fetch(`${QR_API}?${params.toString()}`);
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

  // ── SE Approve ──
  const seApprove = async (id) => {
    try {
      const res  = await fetch(`${QR_API}/approve/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      notify("SE approved ✅ — BOQ finalised and sent to Site Engineer!");
      fetchReports();
      if (viewingReport?.id === id) {
        const r = await fetch(`${QR_API}/${id}`);
        setViewingReport(await r.json());
      }
    } catch (err) { notify(err.message, "error"); }
  };

  // ── SE Reject — opens comment modal ──
  const openRejectModal = (id) => {
    setRejectComment("");
    setRejectModal({ id });
  };

  const submitReject = async () => {
    if (!rejectModal) return;
    const id = rejectModal.id;
    try {
      const res  = await fetch(`${QR_API}/reject/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: rejectComment.trim() || "Please revise the quantities." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      notify("Changes requested ↩️ — BOQ rejected, QS must edit and resubmit");
      setRejectModal(null);
      setRejectComment("");
      fetchReports();
      if (viewingReport?.id === id) {
        const r = await fetch(`${QR_API}/${id}`);
        setViewingReport(await r.json());
      }
    } catch (err) { notify(err.message, "error"); }
  };

  // ── Open detail ──
  const openDetail = async (report) => {
    setTab("detail");
    try {
      const res  = await fetch(`${QR_API}/${report.id}`);
      const data = await res.json();
      setViewingReport(res.ok ? data : report);
    } catch (_) { setViewingReport(report); }
  };

  // ── Export CSV ──
  const exportCSV = (report) => {
    const lines = [
      `Quantity Report — ${report.projectName} · ${report.milestoneName}`,
      `Generated: ${new Date().toLocaleDateString("en-IN")} | BOQ Ref: #${report.boqId}`,
      "",
      ["#", "Material / Item", "Unit", "Quantity"].join(","),
      ...(report.items || []).map((item, i) =>
        [i + 1, item.material, item.unit, item.quantity].join(",")
      ),
      `,,Total Items,${report.items?.length || 0}`,
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `QuantityReport_${report.projectName?.replace(/ /g, "_")}_${report.milestoneName}.csv`;
    a.click();
  };


  // ── Safe date parser — handles "02 May 2026" format ──
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // Handle "DD MMM YYYY" format e.g. "02 May 2026"
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    const parts = dateStr.split(" ");
    if (parts.length === 3 && months[parts[1]] !== undefined) {
      return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
    }
    // Fallback: ISO string
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
    if (filterStatus  && r.status !== filterStatus)                      return false;
    if (filterFrom || filterTo) {
      const d = parseDate(r.createdDate);
      if (d) {
        if (filterFrom) {
          const [fy,fm,fd] = filterFrom.split("-").map(Number);
          if (d < new Date(fy, fm-1, fd, 0,0,0,0)) return false;
        }
        if (filterTo) {
          const [ty,tm,td] = filterTo.split("-").map(Number);
          if (d > new Date(ty, tm-1, td, 23,59,59,999)) return false;
        }
      }
    }
    return true;
  });

  return (
    <div className="qr">
      {toast && <div className={`qr__toast qr__toast--${toast.type}`}>{toast.msg}</div>}

      {/* ── HEADER ── */}
      <div className="qr__header">
        <div className="qr__header-left">
          {tab === "detail" ? (
            <button className="qr__back-btn"
              onClick={() => { setViewingReport(null); setTab("list"); }}>← Back</button>
          ) : (
            <div className="qr__header-icon">📐</div>
          )}
          <div>
            <h1 className="qr__title">
              {tab === "detail" && viewingReport
                ? `${viewingReport.projectName} · ${viewingReport.milestoneName}`
                : "Quantity Report"}
            </h1>
            <p className="qr__subtitle">Quantity Surveyor · Quantity Management</p>
          </div>
        </div>
        {tab !== "detail" && (
          <div className="qr__tabs">
            <button className={`qr__tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}>
              All Reports
              {reports.length > 0 && <span className="qr__badge">{reports.length}</span>}
            </button>
          </div>
        )}
      </div>

      {/* ── FLOW BANNER ── */}
      <div className="qr__flow-bar">
        {["PM Approved Cost Report", "Qty Report Auto-Created", "Sent to SE", "SE Approves / Rejects", "BOQ Finalised"].map(
          (s, i, arr) => (
            <React.Fragment key={i}>
              <div className="qr__flow-step">
                <span className="qr__flow-dot">{i + 1}</span>
                <span className="qr__flow-label">{s}</span>
              </div>
              {i < arr.length - 1 && <span className="qr__flow-arrow">›</span>}
            </React.Fragment>
          )
        )}
      </div>

      {/* ── Info bar ── */}
      <div className="qr__info-bar">
        <span>ℹ️</span>
        <span>
          Quantity Reports contain <strong>quantities only</strong> — no pricing visible to SE.
          BOQ is finalised when SE approves this report.
        </span>
      </div>

      {apiError && <div className="qr__api-error">⚠️ {apiError}</div>}

      <div className="qr__body">

        {/* ══════ LIST TAB ══════ */}
        {tab === "list" && (
          <>
            <div className="qr__view-head">
              <h2 className="qr__view-h">All Quantity Reports</h2>
            </div>
            <div className="qr__filter-bar">
              <div className="qr__range-btns">
                <span className="qr__range-label">📅 Show:</span>
                {[{l:"Today",d:0},{l:"1 Week",d:7},{l:"1 Month",d:30},{l:"3 Months",d:90}].map(({l,d}) => {
                  const from = new Date(); from.setDate(from.getDate()-d);
                  const isActive = filterFrom===from.toISOString().split("T")[0] && filterTo===new Date().toISOString().split("T")[0];
                  return <button key={l} className={`qr__range-btn ${isActive?"active":""}`} onClick={()=>setRange(d)}>{l}</button>;
                })}
                <button className="qr__range-btn" onClick={()=>{setFilterFrom("");setFilterTo("");}}>All Time</button>
              </div>
              <div className="qr__date-range">
                <span className="qr__date-range-label">From</span>
                <input type="date" className="qr__date-input" value={filterFrom} onChange={(e)=>setFilterFrom(e.target.value)} />
                <span className="qr__date-range-label">To</span>
                <input type="date" className="qr__date-input" value={filterTo} onChange={(e)=>setFilterTo(e.target.value)} />
              </div>
              <div className="qr__filters">
                <select className="qr__select qr__select--sm" value={filterProject} onChange={(e)=>setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="qr__select qr__select--sm" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {reportsLoading ? (
              <div className="qr__loading"><div className="qr__spinner" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="qr__empty">
                <span>📐</span>
                <p>No quantity reports yet.</p>
                <p className="qr__empty-hint">
                  Quantity reports are auto-created when you click "Create Qty Report" in the BOQ page after PM approves the Cost Report.
                </p>
              </div>
            ) : (
              <div className="qr__cards-list">
                {filtered.map((r) => {
                  const st = STATUS[r.status] || STATUS.pending_se;
                  return (
                    <div key={r.id} className={`qr__card qr__card--${st.color}`}>
                      <div className="qr__card-top">
                        <div>
                          <div className="qr__card-proj">{r.projectName}</div>
                          <div className="qr__card-meta">
                            🏗️ {r.milestoneName} &nbsp;·&nbsp;
                            BOQ #{r.boqId} &nbsp;·&nbsp;
                            📅 {r.createdDate}
                            {r.updatedDate && <span> · Updated {r.updatedDate}</span>}
                          </div>
                        </div>
                        <div className="qr__card-right">
                          <div className="qr__card-items">
                            {r.totalItems || r.items?.length || 0} items
                          </div>
                          <span className={`qr__status-badge qr__status--${st.color}`}>
                            {st.icon} {st.label}
                          </span>
                        </div>
                      </div>

                      {/* SE comment if rejected */}
                      {r.status === "rejected" && r.seComment && (
                        <div className="qr__card-comment">
                          <strong>💬 SE:</strong> {r.seComment}
                        </div>
                      )}

                      <div className="qr__card-actions">
                        <button className="qr__view-btn" onClick={() => openDetail(r)}>
                          👁 View Report
                        </button>
                        {r.status === "pending_se" && (
                          <>
                            <button className="qr__approve-btn" onClick={() => seApprove(r.id)}>
                              ✔ SE Approve
                            </button>
                            <button className="qr__reject-btn"
                              onClick={() => openRejectModal(r.id)}>
                              ✘ SE Reject
                            </button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <button className="qr__export-btn" onClick={() => exportCSV(r)}>
                            ⬇ Export CSV
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════ DETAIL TAB ══════ */}
        {tab === "detail" && viewingReport && (() => {
          const r     = viewingReport;
          const st    = STATUS[r.status] || STATUS.pending_se;
          const total = totalQty(r.items);

          return (
            <div className="qr__detail">

              {/* Info bar */}
              <div className="qr__detail-infobar">
                {[
                  { label: "Project",   value: r.projectName },
                  { label: "Milestone", value: `🏗️ ${r.milestoneName}` },
                  { label: "BOQ Ref",   value: `#${r.boqId}` },
                  { label: "Created",   value: r.createdDate },
                  ...(r.updatedDate ? [{ label: "Updated", value: r.updatedDate }] : []),
                  { label: "Status",    badge: true },
                ].map((item, i) => (
                  <div key={i} className="qr__detail-infoitem">
                    <span className="qr__detail-infolbl">{item.label}</span>
                    {item.badge
                      ? <span className={`qr__status-badge qr__status--${st.color}`}>{st.icon} {st.label}</span>
                      : <span className="qr__detail-infoval">{item.value}</span>}
                  </div>
                ))}
              </div>

              {/* No price notice */}
              <div className="qr__no-price-notice">
                🔒 This report contains <strong>quantities only</strong> — no pricing is visible to the Site Engineer.
              </div>

              {/* SE rejection note */}
              {r.status === "rejected" && r.seComment && (
                <div className="qr__note">
                  <strong>💬 SE Comment:</strong> {r.seComment}
                  <span className="qr__note-hint">Go to BOQ page → Edit BOQ → Resubmit</span>
                </div>
              )}

              {/* Approved banner */}
              {r.status === "approved" && (
                <div className="qr__approved-banner">
                  <span className="qr__approved-icon">✅</span>
                  <div>
                    <div className="qr__approved-title">Approved by Site Engineer</div>
                    <div className="qr__approved-sub">
                      BOQ is now finalised and sent to Site Engineer.
                    </div>
                  </div>
                  <button className="qr__export-btn qr__export-btn--lg"
                    onClick={() => exportCSV(r)}>⬇ Export CSV</button>
                </div>
              )}

              {/* Approval tracker */}
              <div className="qr__block">
                <div className="qr__block-label">
                  <span className="qr__num">📊</span> Approval Progress
                </div>
                <div className="qr__approval-track">
                  {[
                    { label: "Qty Report Created",  done: true },
                    { label: "Sent to SE",           done: ["pending_se","approved","rejected"].includes(r.status), current: r.status === "pending_se" },
                    { label: "SE Approved",          done: r.status === "approved", current: r.status === "pending_se" },
                    { label: "BOQ Finalised",        done: r.status === "approved" },
                  ].map((step, i, arr) => (
                    <React.Fragment key={i}>
                      <div className={`qr__ap-step ${step.done ? "done" : step.current ? "active" : ""}`}>
                        <span className="qr__ap-dot">{step.done ? "✓" : i + 1}</span>
                        <span className="qr__ap-label">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className="qr__ap-line" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* SE action buttons */}
              {r.status === "pending_se" && (
                <div className="qr__se-actions">
                  <span className="qr__se-actions-label">[ SE Actions ]</span>
                  <button className="qr__approve-btn qr__approve-btn--lg"
                    onClick={() => seApprove(r.id)}>✔ Approve Quantity Report</button>
                  <button className="qr__reject-btn qr__reject-btn--lg"
                    onClick={() => openRejectModal(r.id)}>
                    ✘ Request Changes
                  </button>
                </div>
              )}

              {/* Quantity table — NO prices */}
              <div className="qr__block">
                <div className="qr__block-label">
                  <span className="qr__num">📋</span>
                  Quantity Breakdown
                  <span className="qr__auto-tag">🔗 From BOQ #{r.boqId}</span>
                  <span className="qr__no-price-tag">No Prices</span>
                </div>
                <div className="qr__table-scroll">
                  <table className="qr__table">
                    <colgroup>
                      <col style={{width:"50px"}} /><col />
                      <col style={{width:"100px"}} /><col style={{width:"140px"}} />
                      <col style={{width:"80px"}} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>#</th><th>Material / Item</th><th>Unit</th>
                        <th>Quantity</th><th>% Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(r.items || []).map((item, i) => {
                        const qty   = parseFloat(item.quantity) || 0;
                        const share = total ? ((qty / total) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={i}>
                            <td className="qr-num">{i + 1}</td>
                            <td className="qr-material"><strong>{item.material}</strong></td>
                            <td className="qr-center">{item.unit}</td>
                            <td className="qr-qty">{qty.toLocaleString("en-IN")}</td>
                            <td className="qr-pct">
                              <div className="qr-pct-wrap">
                                <span>{share}%</span>
                                <div className="qr-pct-bar">
                                  <div className="qr-pct-fill" style={{width:`${share}%`}} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="qr-tfoot-lbl">Total Line Items</td>
                        <td className="qr-tfoot-val">{r.items?.length || 0} items</td>
                        <td className="qr-tfoot-pct">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Summary cards */}
              <div className="qr__detail-summary">
                <div className="qr__sum-card">
                  <span className="qr__sum-lbl">Line Items</span>
                  <span className="qr__sum-val">{r.items?.length || 0}</span>
                </div>
                <div className="qr__sum-card qr__sum-card--highlight">
                  <span className="qr__sum-lbl">Total Quantity</span>
                  <span className="qr__sum-val qr__sum-val--big">
                    {totalQty(r.items).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="qr__sum-card qr__sum-card--locked">
                  <span className="qr__sum-lbl">Pricing</span>
                  <span className="qr__sum-val">🔒 Hidden from SE</span>
                </div>
              </div>

              <div className="qr__detail-actions">
                <button className="qr__ghost-btn"
                  onClick={() => { setViewingReport(null); setTab("list"); }}>
                  ← Back to All Reports
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    {/* ── REJECT COMMENT MODAL ── */}
    {rejectModal && (
      <div className="qr__modal-overlay">
        <div className="qr__modal">
          <div className="qr__modal-header">
            <span className="qr__modal-icon">↩️</span>
            <div>
              <div className="qr__modal-title">Request Changes</div>
              <div className="qr__modal-sub">Add a suggestion for the Quantity Surveyor</div>
            </div>
          </div>
          <textarea
            className="qr__modal-textarea"
            placeholder="e.g. Please check the quantities for concrete and steel bars…"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={4}
            autoFocus
          />
          <div className="qr__modal-actions">
            <button className="qr__modal-cancel"
              onClick={() => { setRejectModal(null); setRejectComment(""); }}>
              Cancel
            </button>
            <button className="qr__modal-submit" onClick={submitReject}>
              ✘ Send Rejection &amp; Suggestion
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}