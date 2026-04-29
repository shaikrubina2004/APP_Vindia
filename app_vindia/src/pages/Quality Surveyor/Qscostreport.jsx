import React, { useState, useEffect, useCallback } from "react";
import "./Qscostreport.css";

// ── API endpoints ─────────────────────────────────────────────
const BOQ_API = "/api/boq";
const CR_API  = "/api/cost-report";

// ── Status config ─────────────────────────────────────────────
const STATUS = {
  pending_pm: { label: "Awaiting PM Approval", color: "amber", icon: "⏳" },
  approved:   { label: "Approved by PM",        color: "green", icon: "✅" },
  rejected:   { label: "Changes Requested",     color: "red",   icon: "↩️" },
};

const fmt = (n) =>
  "₹ " + (parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

// ── Component ─────────────────────────────────────────────────
export default function Qscostreport() {
  // ── UI state ──
  const [tab,         setTab]         = useState("create"); // create | list | detail
  const [toast,       setToast]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState(null);

  // ── Dropdown data ──
  const [projects,    setProjects]    = useState([]);
  const [milestones,  setMilestones]  = useState([]);   // WBS parent_id IS NULL for project
  const [pendingBoqs, setPendingBoqs] = useState([]);   // BOQs with status=pending_pm

  // ── Form ──
  const [project,     setProject]     = useState("");
  const [milestone,   setMilestone]   = useState("");   // milestone id
  const [sourceBoq,   setSourceBoq]   = useState(null); // matched BOQ object
  const [boqLoading,  setBoqLoading]  = useState(false);
  const [editingId,   setEditingId]   = useState(null);

  // ── List ──
  const [reports,         setReports]         = useState([]);
  const [reportsLoading,  setReportsLoading]  = useState(false);
  const [filterProject,   setFilterProject]   = useState("");
  const [filterStatus,    setFilterStatus]    = useState("");

  // ── Detail ──
  const [viewingReport, setViewingReport] = useState(null);

  // ── Notify ──
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ═══════════════════════════════════════════════════════════
  //  FETCH — Projects
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  //  FETCH — Milestones when project changes
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  //  FETCH — BOQ when milestone changes
  //  Only picks BOQs with status = pending_pm
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!project || !milestone) { setSourceBoq(null); return; }
    (async () => {
      setBoqLoading(true);
      setSourceBoq(null);
      try {
        const res  = await fetch(
          `${BOQ_API}?projectId=${project}&status=pending_pm`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        // Find BOQ matching selected milestone
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

  // ═══════════════════════════════════════════════════════════
  //  FETCH — Cost Reports list
  // ═══════════════════════════════════════════════════════════
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

  useEffect(() => {
    if (tab === "list") fetchReports();
  }, [tab, fetchReports]);

  // ═══════════════════════════════════════════════════════════
  //  SUBMIT — Create / Resubmit Cost Report
  // ═══════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    if (!project)   return notify("Please select a project.", "error");
    if (!milestone) return notify("Please select a milestone.", "error");
    if (!sourceBoq) return notify("No pending BOQ found for this milestone.", "error");

    const milestoneObj = milestones.find((m) => String(m.id) === String(milestone));
    const projectObj   = projects.find((p) => String(p.id) === String(project));

    const payload = {
      projectId:     parseInt(project),
      projectName:   projectObj?.name,
      milestoneId:   milestoneObj?.id,
      milestoneName: milestoneObj?.name,
      boqId:         sourceBoq.id,
      items:         sourceBoq.rows.map((r) => ({
        material:  r.material,
        unit:      r.unit,
        quantity:  parseFloat(r.quantity),
        unitPrice: parseFloat(r.unitPrice),
        total:     parseFloat(r.total || 0),
      })),
      totalCost: parseBoq(sourceBoq),
    };

    setLoading(true);
    try {
      let res, data;
      if (editingId) {
        res  = await fetch(`${CR_API}/${editingId}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update");
        notify("Cost Report resubmitted to PM ✓");
        setEditingId(null);
      } else {
        res  = await fetch(CR_API, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create");
        notify("Cost Report created & sent to PM for approval ✓");
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

  // ═══════════════════════════════════════════════════════════
  //  EDIT
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  //  PM ACTIONS (demo — replace with role-based auth)
  // ═══════════════════════════════════════════════════════════
  const pmAction = async (id, action, comment = "") => {
    try {
      const res  = await fetch(`${CR_API}/${action}/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      notify(action === "approve" ? "PM approved ✅" : "PM requested changes ↩️");
      fetchReports();
      if (viewingReport?.id === id) {
        const r = await fetch(`${CR_API}/${id}`);
        setViewingReport(await r.json());
      }
    } catch (err) {
      notify(err.message, "error");
    }
  };

  // ═══════════════════════════════════════════════════════════
  //  DETAIL VIEW
  // ═══════════════════════════════════════════════════════════
  const openDetail = async (report) => {
    setTab("detail");
    try {
      const res  = await fetch(`${CR_API}/${report.id}`);
      const data = await res.json();
      setViewingReport(res.ok ? data : report);
    } catch (_) {
      setViewingReport(report);
    }
  };

  // ═══════════════════════════════════════════════════════════
  //  EXPORT CSV
  // ═══════════════════════════════════════════════════════════
  const exportCSV = (report) => {
    const lines = [
      `Cost Report — ${report.projectName} · ${report.milestoneName}`,
      `Generated: ${new Date().toLocaleDateString("en-IN")}  |  BOQ Ref: #${report.boqId}`,
      "",
      ["#", "Material", "Unit", "Quantity", "Unit Price (₹)", "Total (₹)"].join(","),
      ...(report.items || []).map((item, i) =>
        [i + 1, item.material, item.unit, item.quantity,
          parseFloat(item.unitPrice).toFixed(2),
          parseFloat(item.total).toFixed(2)].join(",")
      ),
      `,,,,,Total Cost,${parseFloat(report.totalCost).toFixed(2)}`,
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `CostReport_${report.projectName?.replace(/ /g, "_")}_${report.milestoneName}.csv`;
    a.click();
  };

  // ── Helpers ──
  const parseBoq  = (boq) => boq?.rows?.reduce((s, r) => s + parseFloat(r.total || 0), 0) || 0;
  const pct       = (part, total) => total ? ((part / total) * 100).toFixed(1) : "0.0";

  const filtered  = reports.filter((r) => {
    if (filterProject && String(r.projectId) !== String(filterProject)) return false;
    if (filterStatus  && r.status !== filterStatus)                      return false;
    return true;
  });

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="cr">
      {toast && (
        <div className={`cr__toast cr__toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── HEADER ── */}
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
            <button
              className={`cr__tab ${tab === "create" ? "active" : ""}`}
              onClick={() => { cancelEdit(); setTab("create"); }}
            >
              {editingId ? "✏️ Editing Report" : "+ New Cost Report"}
            </button>
            <button
              className={`cr__tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}
            >
              All Reports
              {reports.length > 0 && (
                <span className="cr__badge">{reports.length}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── FLOW BANNER ── */}
      <div className="cr__flow-bar">
        {["Select Milestone", "BOQ Auto-Loaded", "Review Cost", "Submit to PM", "PM Approves"].map(
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

        {/* ══════════════════════════════════════
            CREATE TAB
        ══════════════════════════════════════ */}
        {tab === "create" && (
          <>
            {editingId && (
              <div className="cr__edit-banner">
                <span>✏️ Editing Cost Report — on resubmit it will go to PM for re-approval.</span>
                <button className="cr__cancel-btn"
                  onClick={() => { cancelEdit(); setTab("list"); }}>✕ Cancel</button>
              </div>
            )}

            {/* ── Step 1: Select Project & Milestone ── */}
            <div className="cr__block">
              <div className="cr__block-label">
                <span className="cr__num">1</span>
                Select Project &amp; Milestone
              </div>
              <div className="cr__selectors">
                <div className="cr__sel-group">
                  <label className="cr__sel-label">Project</label>
                  <select
                    className="cr__select"
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

                <div className="cr__sel-group">
                  <label className="cr__sel-label">Milestone (WBS)</label>
                  <select
                    className="cr__select"
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

              {/* Selected tag */}
              {project && milestone && (() => {
                const proj = projects.find((p) => String(p.id) === String(project));
                const ms   = milestones.find((m) => String(m.id) === String(milestone));
                return proj && ms ? (
                  <div className="cr__proj-tag">
                    📌 {proj.name} &nbsp;·&nbsp; 🏗️ {ms.name}
                  </div>
                ) : null;
              })()}
            </div>

            {/* ── Step 2: BOQ Auto-Load ── */}
            <div className="cr__block">
              <div className="cr__block-label">
                <span className="cr__num">2</span>
                BOQ Cost Breakdown
                <span className="cr__auto-tag">⚡ Auto-loaded from BOQ</span>
              </div>

              {/* States */}
              {!project || !milestone ? (
                <div className="cr__hint">
                  👆 Select a project and milestone above to load the BOQ cost data.
                </div>
              ) : boqLoading ? (
                <div className="cr__loading">
                  <div className="cr__spinner" /> Loading BOQ data…
                </div>
              ) : !sourceBoq ? (
                <div className="cr__no-boq">
                  <span>⚠️</span>
                  <div>
                    <strong>No pending BOQ found</strong> for this milestone.
                    <p>Only BOQs awaiting PM approval can be used to create a Cost Report. Please submit a BOQ for this milestone first.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* BOQ source info card */}
                  <div className="cr__boq-source">
                    <div className="cr__boq-source-left">
                      <span className="cr__boq-source-icon">🔗</span>
                      <div>
                        <div className="cr__boq-source-title">
                          Linked BOQ #{sourceBoq.id}
                        </div>
                        <div className="cr__boq-source-meta">
                          {sourceBoq.projectName} · {sourceBoq.milestoneName}
                          &nbsp;·&nbsp; {sourceBoq.rows?.length || 0} line items
                          &nbsp;·&nbsp; Submitted {sourceBoq.date}
                        </div>
                      </div>
                    </div>
                    <span className="cr__pending-badge">⏳ Pending PM Approval</span>
                  </div>

                  {/* Cost table */}
                  <div className="cr__table-scroll">
                    <table className="cr__table">
                      <colgroup>
                        <col style={{width:"44px"}} />
                        <col />
                        <col style={{width:"80px"}} />
                        <col style={{width:"110px"}} />
                        <col style={{width:"145px"}} />
                        <col style={{width:"155px"}} />
                        <col style={{width:"90px"}} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Material / Item</th>
                          <th>Unit</th>
                          <th>Quantity</th>
                          <th>Unit Price (₹)</th>
                          <th>Total Cost (₹)</th>
                          <th>% Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceBoq.rows?.map((row, i) => {
                          const total    = parseFloat(row.total || 0);
                          const boqTotal = parseBoq(sourceBoq);
                          const share    = pct(total, boqTotal);
                          return (
                            <tr key={row.id || i}>
                              <td className="cr-num">{i + 1}</td>
                              <td className="cr-material">{row.material}</td>
                              <td className="cr-center">{row.unit}</td>
                              <td className="cr-center">
                                {parseFloat(row.quantity).toLocaleString("en-IN")}
                              </td>
                              <td className="cr-mono">
                                ₹ {parseFloat(row.unitPrice).toLocaleString("en-IN")}
                              </td>
                              <td className="cr-total">{fmt(total)}</td>
                              <td className="cr-pct">
                                <div className="cr-pct-wrap">
                                  <span>{share}%</span>
                                  <div className="cr-pct-bar">
                                    <div className="cr-pct-fill"
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
                          <td colSpan={5} className="cr-tfoot-lbl">Total BOQ Cost</td>
                          <td className="cr-tfoot-val">{fmt(parseBoq(sourceBoq))}</td>
                          <td className="cr-tfoot-pct">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* ── Step 3: Summary + Submit ── */}
            {sourceBoq && (
              <div className="cr__footer-row">
                <div className="cr__summary-pills">
                  <div className="cr__pill">
                    <span className="cr__pill-lbl">Line Items</span>
                    <span className="cr__pill-val">{sourceBoq.rows?.length || 0}</span>
                  </div>
                  <div className="cr__pill cr__pill--highlight">
                    <span className="cr__pill-lbl">Total Cost</span>
                    <span className="cr__pill-val">{fmt(parseBoq(sourceBoq))}</span>
                  </div>
                  <div className="cr__pill">
                    <span className="cr__pill-lbl">BOQ Ref</span>
                    <span className="cr__pill-val">#{sourceBoq.id}</span>
                  </div>
                </div>
                <button
                  className="cr__submit-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? "Submitting…"
                    : editingId
                    ? "Resubmit to PM →"
                    : "Submit Cost Report to PM →"}
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
            <div className="cr__view-head">
              <h2 className="cr__view-h">All Cost Reports</h2>
              <div className="cr__filters">
                <select className="cr__select cr__select--sm"
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select className="cr__select cr__select--sm"
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
              <div className="cr__loading">
                <div className="cr__spinner" /> Loading reports…
              </div>
            ) : filtered.length === 0 ? (
              <div className="cr__empty">
                <span>💰</span>
                <p>No cost reports yet.</p>
                <button className="cr__ghost-btn" onClick={() => setTab("create")}>
                  Create your first report →
                </button>
              </div>
            ) : (
              <div className="cr__list-table-wrap">
                <table className="cr__list-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Milestone</th>
                      <th>BOQ Ref</th>
                      <th>Total Cost</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const st      = STATUS[r.status] || STATUS.pending_pm;
                      const canEdit = ["rejected", "pending_pm"].includes(r.status);
                      return (
                        <tr key={r.id} className="cr__list-row">
                          <td className="cr__list-proj">{r.projectName}</td>
                          <td>
                            <span className="cr__milestone-tag">🏗️ {r.milestoneName}</span>
                          </td>
                          <td className="cr__list-boqref">#{r.boqId}</td>
                          <td className="cr__list-total">{fmt(r.totalCost)}</td>
                          <td className="cr__list-date">
                            {r.createdDate}
                            {r.updatedDate && (
                              <><br />
                                <span className="cr__updated">Updated {r.updatedDate}</span>
                              </>
                            )}
                          </td>
                          <td>
                            <span className={`cr__status-badge cr__status--${st.color}`}>
                              {st.icon} {st.label}
                            </span>
                          </td>
                          <td>
                            <div className="cr__list-actions">
                              <button className="cr__view-btn"
                                onClick={() => openDetail(r)}>👁 View</button>
                              {canEdit && (
                                <button className="cr__edit-btn"
                                  onClick={() => handleEdit(r)}>✏️ Edit</button>
                              )}
                              {/* Demo PM actions */}
                              {r.status === "pending_pm" && (
                                <>
                                  <button className="cr__approve-btn"
                                    onClick={() => pmAction(r.id, "approve")}>✔ Approve</button>
                                  <button className="cr__reject-btn"
                                    onClick={() => pmAction(r.id, "reject", "Please review.")}>✘ Reject</button>
                                </>
                              )}
                              {r.status === "approved" && (
                                <button className="cr__export-btn"
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
          const st = STATUS[r.status] || STATUS.pending_pm;
          const boqTotal = (r.items || []).reduce((s, i) => s + parseFloat(i.total || 0), 0);

          return (
            <div className="cr__detail">

              {/* Info bar */}
              <div className="cr__detail-infobar">
                {[
                  { label: "Project",    value: r.projectName },
                  { label: "Milestone",  value: `🏗️ ${r.milestoneName}` },
                  { label: "BOQ Ref",    value: `#${r.boqId}` },
                  { label: "Created",    value: r.createdDate },
                  ...(r.updatedDate ? [{ label: "Updated", value: r.updatedDate }] : []),
                  { label: "Status",     badge: true },
                ].map((item, i) => (
                  <div key={i} className="cr__detail-infoitem">
                    <span className="cr__detail-infolbl">{item.label}</span>
                    {item.badge
                      ? <span className={`cr__status-badge cr__status--${st.color}`}>{st.icon} {st.label}</span>
                      : <span className="cr__detail-infoval">{item.value}</span>
                    }
                  </div>
                ))}
              </div>

              {/* PM Comment / Rejection note */}
              {r.status === "rejected" && r.pmComment && (
                <div className="cr__note">
                  <strong>💬 PM Comment:</strong> {r.pmComment}
                  <button className="cr__edit-inline"
                    onClick={() => handleEdit(r)}>✏️ Edit &amp; Resubmit</button>
                </div>
              )}

              {/* Approved banner */}
              {r.status === "approved" && (
                <div className="cr__approved-banner">
                  <span className="cr__approved-icon">✅</span>
                  <div>
                    <div className="cr__approved-title">
                      Cost Report Approved by Project Manager
                    </div>
                    <div className="cr__approved-sub">
                      This cost report has been reviewed and approved for budget allocation.
                    </div>
                  </div>
                  <button className="cr__export-btn cr__export-btn--lg"
                    onClick={() => exportCSV(r)}>⬇ Export CSV</button>
                </div>
              )}

              {/* Approval tracker */}
              <div className="cr__block">
                <div className="cr__block-label">
                  <span className="cr__num">📊</span> Approval Progress
                </div>
                <div className="cr__approval-track">
                  {[
                    {
                      label:   "QS Created Report",
                      done:    ["pending_pm","approved","rejected"].includes(r.status),
                    },
                    {
                      label:   "Sent to PM",
                      done:    ["pending_pm","approved","rejected"].includes(r.status),
                      current: r.status === "pending_pm",
                    },
                    {
                      label:   "PM Approved",
                      done:    r.status === "approved",
                      current: r.status === "pending_pm",
                    },
                    {
                      label:   "Cost Finalised",
                      done:    r.status === "approved",
                    },
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

              {/* PM action buttons in detail */}
              {r.status === "pending_pm" && (
                <div className="cr__pm-actions">
                  <span className="cr__pm-actions-label">[ PM Actions ]</span>
                  <button className="cr__approve-btn cr__approve-btn--lg"
                    onClick={() => pmAction(r.id, "approve")}>
                    ✔ Approve Cost Report
                  </button>
                  <button className="cr__reject-btn cr__reject-btn--lg"
                    onClick={() => pmAction(r.id, "reject", "Please review the cost figures.")}>
                    ✘ Request Changes
                  </button>
                </div>
              )}

              {/* Cost breakdown table */}
              <div className="cr__block">
                <div className="cr__block-label">
                  <span className="cr__num">📋</span>
                  Cost Breakdown
                  <span className="cr__auto-tag">🔗 From BOQ #{r.boqId}</span>
                </div>
                <div className="cr__table-scroll">
                  <table className="cr__table">
                    <colgroup>
                      <col style={{width:"44px"}} />
                      <col />
                      <col style={{width:"80px"}} />
                      <col style={{width:"110px"}} />
                      <col style={{width:"145px"}} />
                      <col style={{width:"155px"}} />
                      <col style={{width:"90px"}} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Material / Item</th>
                        <th>Unit</th>
                        <th>Quantity</th>
                        <th>Unit Price (₹)</th>
                        <th>Total Cost (₹)</th>
                        <th>% Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(r.items || []).map((item, i) => {
                        const share = pct(parseFloat(item.total), boqTotal);
                        return (
                          <tr key={i}>
                            <td className="cr-num">{i + 1}</td>
                            <td className="cr-material"><strong>{item.material}</strong></td>
                            <td className="cr-center">{item.unit}</td>
                            <td className="cr-center">
                              {parseFloat(item.quantity).toLocaleString("en-IN")}
                            </td>
                            <td className="cr-mono">
                              ₹ {parseFloat(item.unitPrice).toLocaleString("en-IN")}
                            </td>
                            <td className="cr-total">{fmt(item.total)}</td>
                            <td className="cr-pct">
                              <div className="cr-pct-wrap">
                                <span>{share}%</span>
                                <div className="cr-pct-bar">
                                  <div className="cr-pct-fill" style={{width: `${share}%`}} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="cr-tfoot-lbl">Total Cost</td>
                        <td className="cr-tfoot-val">{fmt(boqTotal)}</td>
                        <td className="cr-tfoot-pct">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Summary cards */}
              <div className="cr__detail-summary">
                <div className="cr__sum-card">
                  <span className="cr__sum-lbl">Line Items</span>
                  <span className="cr__sum-val">{r.items?.length || 0}</span>
                </div>
                <div className="cr__sum-card cr__sum-card--highlight">
                  <span className="cr__sum-lbl">Total Cost</span>
                  <span className="cr__sum-val cr__sum-val--big">{fmt(boqTotal)}</span>
                </div>
                <div className="cr__sum-card">
                  <span className="cr__sum-lbl">Highest Cost Item</span>
                  <span className="cr__sum-val">
                    {(r.items || []).reduce(
                      (a, b) => parseFloat(b.total) > parseFloat(a.total) ? b : a,
                      r.items?.[0] || {}
                    )?.material || "—"}
                  </span>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="cr__detail-actions">
                <button className="cr__ghost-btn"
                  onClick={() => { setViewingReport(null); setTab("list"); }}>
                  ← Back to All Reports
                </button>
                {["rejected", "pending_pm"].includes(r.status) && (
                  <button className="cr__edit-btn cr__edit-btn--lg"
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