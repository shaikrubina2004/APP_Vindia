import React, { useState, useEffect, useCallback } from "react";
import "./Qsquantityreport.css";

// ── API endpoints ──────────────────────────────────────────────
const BOQ_API = "/api/boq";
const QR_API  = "/api/quantity-report";

// ── Status config ──────────────────────────────────────────────
const STATUS = {
  pending_se: { label: "Awaiting SE Approval", color: "blue",  icon: "⏳" },
  approved:   { label: "Approved by SE",        color: "green", icon: "✅" },
  rejected:   { label: "Changes Requested",     color: "red",   icon: "↩️" },
};

// ── Component ──────────────────────────────────────────────────
export default function Qsquantityreport() {

  // ── UI state ──
  const [tab,        setTab]        = useState("create");
  const [toast,      setToast]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState(null);

  // ── Dropdown data ──
  const [projects,   setProjects]   = useState([]);
  const [milestones, setMilestones] = useState([]);

  // ── Form ──
  const [project,    setProject]    = useState("");
  const [milestone,  setMilestone]  = useState("");
  const [sourceBoq,  setSourceBoq]  = useState(null);
  const [boqLoading, setBoqLoading] = useState(false);
  const [editingId,  setEditingId]  = useState(null);

  // ── List ──
  const [reports,        setReports]        = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [filterProject,  setFilterProject]  = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");

  // ── Detail ──
  const [viewingReport, setViewingReport] = useState(null);

  // ── Notify ──
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ═══════════════════════════════════════════════════════════════
  //  FETCH — Projects
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  //  FETCH — Milestones when project changes
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!project) { setMilestones([]); setMilestone(""); setSourceBoq(null); return; }
    (async () => {
      try {
        const res  = await fetch(`${BOQ_API}/milestones/${project}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setMilestones(data);
        setMilestone("");
        setSourceBoq(null);
      } catch (err) {
        notify("Could not load milestones: " + err.message, "error");
        setMilestones([]);
      }
    })();
  }, [project]);

  // ═══════════════════════════════════════════════════════════════
  //  FETCH — BOQ with status=pending_se when milestone changes
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!project || !milestone) { setSourceBoq(null); return; }
    (async () => {
      setBoqLoading(true);
      setSourceBoq(null);
      try {
        const res  = await fetch(
          `${BOQ_API}?projectId=${project}&status=pending_se`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        const matched = data.find(
          (b) => String(b.milestoneId) === String(milestone)
        );
        setSourceBoq(matched || null);
      } catch (err) {
        notify("Could not load BOQ: " + err.message, "error");
      } finally {
        setBoqLoading(false);
      }
    })();
  }, [project, milestone]);

  // ═══════════════════════════════════════════════════════════════
  //  FETCH — Quantity Reports list
  // ═══════════════════════════════════════════════════════════════
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

  useEffect(() => {
    if (tab === "list") fetchReports();
  }, [tab, fetchReports]);

  // ═══════════════════════════════════════════════════════════════
  //  SUBMIT — Create / Resubmit Quantity Report
  // ═══════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    if (!project)   return notify("Please select a project.", "error");
    if (!milestone) return notify("Please select a milestone.", "error");
    if (!sourceBoq) return notify("No BOQ pending SE approval found for this milestone.", "error");

    const milestoneObj = milestones.find((m) => String(m.id) === String(milestone));
    const projectObj   = projects.find((p) => String(p.id) === String(project));

    // Only include material, unit, quantity — NO prices
    const payload = {
      projectId:     parseInt(project),
      projectName:   projectObj?.name,
      milestoneId:   milestoneObj?.id,
      milestoneName: milestoneObj?.name,
      boqId:         sourceBoq.id,
      items: sourceBoq.rows.map((r) => ({
        material: r.material,
        unit:     r.unit,
        quantity: parseFloat(r.quantity),
      })),
      totalItems: sourceBoq.rows?.length || 0,
    };

    setLoading(true);
    try {
      let res, data;
      if (editingId) {
        res  = await fetch(`${QR_API}/${editingId}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update");
        notify("Quantity Report resubmitted to SE ✓");
        setEditingId(null);
      } else {
        res  = await fetch(QR_API, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create");
        notify("Quantity Report created & sent to Site Engineer ✓");
      }
      setProject("");
      setMilestone("");
      setSourceBoq(null);
      setTab("list");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  EDIT
  // ═══════════════════════════════════════════════════════════════
  const handleEdit = (report) => {
    setProject(String(report.projectId));
    setMilestone(String(report.milestoneId));
    setEditingId(report.id);
    setTab("create");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setProject("");
    setMilestone("");
    setSourceBoq(null);
  };

  // ═══════════════════════════════════════════════════════════════
  //  SE ACTIONS
  // ═══════════════════════════════════════════════════════════════
  const seAction = async (id, action, comment = "") => {
    try {
      const res  = await fetch(`${QR_API}/${action}/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      notify(action === "approve" ? "SE approved ✅" : "SE requested changes ↩️");
      fetchReports();
      if (viewingReport?.id === id) {
        const r = await fetch(`${QR_API}/${id}`);
        setViewingReport(await r.json());
      }
    } catch (err) {
      notify(err.message, "error");
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════
  const openDetail = async (report) => {
    setTab("detail");
    try {
      const res  = await fetch(`${QR_API}/${report.id}`);
      const data = await res.json();
      setViewingReport(res.ok ? data : report);
    } catch (_) {
      setViewingReport(report);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  EXPORT CSV
  // ═══════════════════════════════════════════════════════════════
  const exportCSV = (report) => {
    const lines = [
      `Quantity Report — ${report.projectName} · ${report.milestoneName}`,
      `Generated: ${new Date().toLocaleDateString("en-IN")}  |  BOQ Ref: #${report.boqId}`,
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

  // ── Helpers ──
  const totalQty = (items) =>
    (items || []).reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);

  const filtered = reports.filter((r) => {
    if (filterProject && String(r.projectId) !== String(filterProject)) return false;
    if (filterStatus  && r.status !== filterStatus)                      return false;
    return true;
  });

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="qr">
      {toast && (
        <div className={`qr__toast qr__toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── HEADER ── */}
      <div className="qr__header">
        <div className="qr__header-left">
          {tab === "detail" ? (
            <button className="qr__back-btn"
              onClick={() => { setViewingReport(null); setTab("list"); }}>
              ← Back
            </button>
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
            <button
              className={`qr__tab ${tab === "create" ? "active" : ""}`}
              onClick={() => { cancelEdit(); setTab("create"); }}
            >
              {editingId ? "✏️ Editing Report" : "+ New Quantity Report"}
            </button>
            <button
              className={`qr__tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}
            >
              All Reports
              {reports.length > 0 && (
                <span className="qr__badge">{reports.length}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── FLOW BANNER ── */}
      <div className="qr__flow-bar">
        {[
          "Select Milestone",
          "BOQ Auto-Loaded",
          "Review Quantities",
          "Submit to SE",
          "SE Approves",
        ].map((s, i, arr) => (
          <React.Fragment key={i}>
            <div className="qr__flow-step">
              <span className="qr__flow-dot">{i + 1}</span>
              <span className="qr__flow-label">{s}</span>
            </div>
            {i < arr.length - 1 && <span className="qr__flow-arrow">›</span>}
          </React.Fragment>
        ))}
      </div>

      {/* ── BOQ Finalisation info bar ── */}
      <div className="qr__info-bar">
        <span className="qr__info-icon">ℹ️</span>
        <span>
          BOQ is <strong>finalised</strong> only when both
          <span className="qr__info-tag qr__info-tag--pm">PM approves Cost Report</span>
          and
          <span className="qr__info-tag qr__info-tag--se">SE approves Quantity Report</span>
        </span>
      </div>

      {apiError && <div className="qr__api-error">⚠️ {apiError}</div>}

      <div className="qr__body">

        {/* ══════════════════════════════════════
            CREATE TAB
        ══════════════════════════════════════ */}
        {tab === "create" && (
          <>
            {editingId && (
              <div className="qr__edit-banner">
                <span>✏️ Editing Quantity Report — on resubmit it will go to SE for re-approval.</span>
                <button className="qr__cancel-btn"
                  onClick={() => { cancelEdit(); setTab("list"); }}>✕ Cancel</button>
              </div>
            )}

            {/* Step 1 — Project & Milestone */}
            <div className="qr__block">
              <div className="qr__block-label">
                <span className="qr__num">1</span>
                Select Project &amp; Milestone
              </div>
              <div className="qr__selectors">
                <div className="qr__sel-group">
                  <label className="qr__sel-label">Project</label>
                  <select
                    className="qr__select"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    disabled={projects.length === 0}
                  >
                    <option value="">
                      {projects.length === 0 ? "Loading projects…" : "— Choose project —"}
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="qr__sel-group">
                  <label className="qr__sel-label">Milestone (WBS)</label>
                  <select
                    className="qr__select"
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    disabled={!project || milestones.length === 0}
                  >
                    <option value="">
                      {!project
                        ? "— Select project first —"
                        : milestones.length === 0
                        ? "No milestones found"
                        : "— Choose milestone —"}
                    </option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code ? `${m.code} · ` : ""}{m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {project && milestone && (() => {
                const proj = projects.find((p) => String(p.id) === String(project));
                const ms   = milestones.find((m) => String(m.id) === String(milestone));
                return proj && ms ? (
                  <div className="qr__proj-tag">
                    📌 {proj.name} &nbsp;·&nbsp; 🏗️ {ms.name}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Step 2 — Quantity Breakdown */}
            <div className="qr__block">
              <div className="qr__block-label">
                <span className="qr__num">2</span>
                Quantity Breakdown
                <span className="qr__auto-tag">⚡ Auto-loaded from BOQ</span>
              </div>

              {!project || !milestone ? (
                <div className="qr__hint">
                  👆 Select a project and milestone above to load the BOQ quantity data.
                </div>
              ) : boqLoading ? (
                <div className="qr__loading">
                  <div className="qr__spinner" /> Loading BOQ data…
                </div>
              ) : !sourceBoq ? (
                <div className="qr__no-boq">
                  <span>⚠️</span>
                  <div>
                    <strong>No BOQ found awaiting SE approval</strong> for this milestone.
                    <p>Only BOQs that have been approved by the PM (pending SE approval) can be used. Please ensure the PM has approved the Cost Report first.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* BOQ Source card */}
                  <div className="qr__boq-source">
                    <div className="qr__boq-source-left">
                      <span className="qr__boq-source-icon">🔗</span>
                      <div>
                        <div className="qr__boq-source-title">
                          Linked BOQ #{sourceBoq.id}
                        </div>
                        <div className="qr__boq-source-meta">
                          {sourceBoq.projectName} · {sourceBoq.milestoneName}
                          &nbsp;·&nbsp; {sourceBoq.rows?.length || 0} line items
                          &nbsp;·&nbsp; Submitted {sourceBoq.date}
                        </div>
                      </div>
                    </div>
                    <span className="qr__pending-badge">⏳ Awaiting SE Approval</span>
                  </div>

                  {/* Quantity table — NO prices */}
                  <div className="qr__table-scroll">
                    <table className="qr__table">
                      <colgroup>
                        <col style={{width:"50px"}} />
                        <col />
                        <col style={{width:"100px"}} />
                        <col style={{width:"140px"}} />
                        <col style={{width:"80px"}} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Material / Item</th>
                          <th>Unit</th>
                          <th>Quantity</th>
                          <th>% Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceBoq.rows?.map((row, i) => {
                          const qty      = parseFloat(row.quantity) || 0;
                          const total    = totalQty(sourceBoq.rows);
                          const share    = total ? ((qty / total) * 100).toFixed(1) : "0.0";
                          return (
                            <tr key={row.id || i}>
                              <td className="qr-num">{i + 1}</td>
                              <td className="qr-material">{row.material}</td>
                              <td className="qr-center">{row.unit}</td>
                              <td className="qr-qty">
                                {qty.toLocaleString("en-IN")}
                              </td>
                              <td className="qr-pct">
                                <div className="qr-pct-wrap">
                                  <span>{share}%</span>
                                  <div className="qr-pct-bar">
                                    <div className="qr-pct-fill"
                                      style={{width: `${share}%`}} />
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
                          <td className="qr-tfoot-val">
                            {sourceBoq.rows?.length || 0} items
                          </td>
                          <td className="qr-tfoot-pct">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Step 3 — Summary + Submit */}
            {sourceBoq && (
              <div className="qr__footer-row">
                <div className="qr__summary-pills">
                  <div className="qr__pill">
                    <span className="qr__pill-lbl">Line Items</span>
                    <span className="qr__pill-val">{sourceBoq.rows?.length || 0}</span>
                  </div>
                  <div className="qr__pill qr__pill--highlight">
                    <span className="qr__pill-lbl">Total Quantity</span>
                    <span className="qr__pill-val">
                      {totalQty(sourceBoq.rows).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="qr__pill">
                    <span className="qr__pill-lbl">BOQ Ref</span>
                    <span className="qr__pill-val">#{sourceBoq.id}</span>
                  </div>
                  <div className="qr__pill qr__pill--note">
                    <span className="qr__pill-lbl">Note</span>
                    <span className="qr__pill-val qr__pill-val--sm">No prices shown</span>
                  </div>
                </div>
                <button
                  className="qr__submit-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? "Submitting…"
                    : editingId
                    ? "Resubmit to SE →"
                    : "Submit Quantity Report to SE →"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            LIST TAB
        ══════════════════════════════════════ */}
        {tab === "list" && (
          <>
            <div className="qr__view-head">
              <h2 className="qr__view-h">All Quantity Reports</h2>
              <div className="qr__filters">
                <select className="qr__select qr__select--sm"
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select className="qr__select qr__select--sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {reportsLoading ? (
              <div className="qr__loading">
                <div className="qr__spinner" /> Loading reports…
              </div>
            ) : filtered.length === 0 ? (
              <div className="qr__empty">
                <span>📐</span>
                <p>No quantity reports yet.</p>
                <button className="qr__ghost-btn" onClick={() => setTab("create")}>
                  Create your first report →
                </button>
              </div>
            ) : (
              <div className="qr__list-table-wrap">
                <table className="qr__list-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Milestone</th>
                      <th>BOQ Ref</th>
                      <th>Items</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const st      = STATUS[r.status] || STATUS.pending_se;
                      const canEdit = ["rejected", "pending_se"].includes(r.status);
                      return (
                        <tr key={r.id} className="qr__list-row">
                          <td className="qr__list-proj">{r.projectName}</td>
                          <td>
                            <span className="qr__milestone-tag">🏗️ {r.milestoneName}</span>
                          </td>
                          <td className="qr__list-boqref">#{r.boqId}</td>
                          <td className="qr__list-items">
                            {r.totalItems || r.items?.length || 0} items
                          </td>
                          <td className="qr__list-date">
                            {r.createdDate}
                            {r.updatedDate && (
                              <><br />
                                <span className="qr__updated">Updated {r.updatedDate}</span>
                              </>
                            )}
                          </td>
                          <td>
                            <span className={`qr__status-badge qr__status--${st.color}`}>
                              {st.icon} {st.label}
                            </span>
                          </td>
                          <td>
                            <div className="qr__list-actions">
                              <button className="qr__view-btn"
                                onClick={() => openDetail(r)}>👁 View</button>
                              {canEdit && (
                                <button className="qr__edit-btn"
                                  onClick={() => handleEdit(r)}>✏️ Edit</button>
                              )}
                              {r.status === "pending_se" && (
                                <>
                                  <button className="qr__approve-btn"
                                    onClick={() => seAction(r.id, "approve")}>✔ SE OK</button>
                                  <button className="qr__reject-btn"
                                    onClick={() => seAction(r.id, "reject", "Please revise quantities.")}>✘ Reject</button>
                                </>
                              )}
                              {r.status === "approved" && (
                                <button className="qr__export-btn"
                                  onClick={() => exportCSV(r)}>⬇ CSV</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            DETAIL TAB
        ══════════════════════════════════════ */}
        {tab === "detail" && viewingReport && (() => {
          const r  = viewingReport;
          const st = STATUS[r.status] || STATUS.pending_se;
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
                      : <span className="qr__detail-infoval">{item.value}</span>
                    }
                  </div>
                ))}
              </div>

              {/* No-price notice */}
              <div className="qr__no-price-notice">
                🔒 This report contains <strong>quantities only</strong> — no cost or pricing data is visible to the Site Engineer.
              </div>

              {/* SE rejection note */}
              {r.status === "rejected" && r.seComment && (
                <div className="qr__note">
                  <strong>💬 SE Comment:</strong> {r.seComment}
                  <button className="qr__edit-inline"
                    onClick={() => handleEdit(r)}>✏️ Edit &amp; Resubmit</button>
                </div>
              )}

              {/* Approved banner */}
              {r.status === "approved" && (
                <div className="qr__approved-banner">
                  <span className="qr__approved-icon">✅</span>
                  <div>
                    <div className="qr__approved-title">
                      Quantity Report Approved by Site Engineer
                    </div>
                    <div className="qr__approved-sub">
                      Quantities have been verified. Awaiting Cost Report approval by PM to finalise BOQ.
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
                    {
                      label:   "QS Created Report",
                      done:    ["pending_se","approved","rejected"].includes(r.status),
                    },
                    {
                      label:   "Sent to SE",
                      done:    ["pending_se","approved","rejected"].includes(r.status),
                      current: r.status === "pending_se",
                    },
                    {
                      label:   "SE Approved",
                      done:    r.status === "approved",
                      current: r.status === "pending_se",
                    },
                    {
                      label:   "BOQ Finalised\n(with Cost Report)",
                      done:    r.status === "approved",
                    },
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

              {/* SE action buttons in detail */}
              {r.status === "pending_se" && (
                <div className="qr__se-actions">
                  <span className="qr__se-actions-label">[ SE Actions ]</span>
                  <button className="qr__approve-btn qr__approve-btn--lg"
                    onClick={() => seAction(r.id, "approve")}>
                    ✔ Approve Quantity Report
                  </button>
                  <button className="qr__reject-btn qr__reject-btn--lg"
                    onClick={() => seAction(r.id, "reject", "Please revise quantities.")}>
                    ✘ Request Changes
                  </button>
                </div>
              )}

              {/* Quantity table */}
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
                      <col style={{width:"50px"}} />
                      <col />
                      <col style={{width:"100px"}} />
                      <col style={{width:"140px"}} />
                      <col style={{width:"80px"}} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Material / Item</th>
                        <th>Unit</th>
                        <th>Quantity</th>
                        <th>% Share</th>
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
                            <td className="qr-qty">
                              {qty.toLocaleString("en-IN")}
                            </td>
                            <td className="qr-pct">
                              <div className="qr-pct-wrap">
                                <span>{share}%</span>
                                <div className="qr-pct-bar">
                                  <div className="qr-pct-fill" style={{width: `${share}%`}} />
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
                <div className="qr__sum-card">
                  <span className="qr__sum-lbl">Highest Qty Item</span>
                  <span className="qr__sum-val">
                    {(r.items || []).reduce(
                      (a, b) => parseFloat(b.quantity) > parseFloat(a.quantity) ? b : a,
                      r.items?.[0] || {}
                    )?.material || "—"}
                  </span>
                </div>
                <div className="qr__sum-card qr__sum-card--locked">
                  <span className="qr__sum-lbl">Pricing</span>
                  <span className="qr__sum-val">🔒 Hidden</span>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="qr__detail-actions">
                <button className="qr__ghost-btn"
                  onClick={() => { setViewingReport(null); setTab("list"); }}>
                  ← Back to All Reports
                </button>
                {["rejected", "pending_se"].includes(r.status) && (
                  <button className="qr__edit-btn qr__edit-btn--lg"
                    onClick={() => handleEdit(r)}>✏️ Edit Report</button>
                )}
              </div>

            </div>
          );
        })()}

      </div>
    </div>
  );
}