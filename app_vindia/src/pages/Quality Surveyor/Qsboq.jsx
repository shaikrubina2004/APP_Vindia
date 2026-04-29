import React, { useState, useEffect, useCallback } from "react";
import "./Qsboq.css";

// ── API base ──────────────────────────────────────────────────
const API = "/api/boq";

// ── Status config ─────────────────────────────────────────────
const STATUS = {
  pending_pm: { label: "Awaiting PM Approval", color: "amber", icon: "⏳" },
  pending_se: { label: "Awaiting SE Approval", color: "blue",  icon: "⏳" },
  finalised:  { label: "Finalised",            color: "green", icon: "✅" },
  rejected:   { label: "Changes Requested",    color: "red",   icon: "↩️" },
};

const UNITS = ["m³", "m²", "m", "kg", "nos", "ltr", "ton", "bag", "rft"];

const uid   = () => Math.random().toString(36).substr(2, 9);
const blank = () => ({ id: uid(), material: "", unit: "m²", quantity: "", unitPrice: "" });

// ── Component ─────────────────────────────────────────────────
export default function Qsboq() {

  // ── UI state ──
  const [tab,           setTab]           = useState("create");
  const [toast,         setToast]         = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [apiError,      setApiError]      = useState(null);

  // ── Dropdown data from API ──
  const [projects,      setProjects]      = useState([]);
  const [milestones,    setMilestones]    = useState([]); // WBS top-level for selected project

  // ── Create / Edit form ──
  const [project,       setProject]       = useState("");   // project id (number)
  const [milestone,     setMilestone]     = useState("");   // milestone object { id, name }
  const [rows,          setRows]          = useState([blank(), blank()]);
  const [editingId,     setEditingId]     = useState(null);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  // ── BOQ list ──
  const [boqs,          setBoqs]          = useState([]);
  const [boqsLoading,   setBoqsLoading]   = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");

  // ── Detail view ──
  const [viewingBoq,    setViewingBoq]    = useState(null);

  // ── Notify ────────────────────────────────────────────────────
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Row helpers ───────────────────────────────────────────────
  const change     = (id, field, val) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const rowTotal   = (r) => (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0);
  const grandTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  // ═══════════════════════════════════════════════════════════════
  //  API CALLS
  // ═══════════════════════════════════════════════════════════════

  // ── Fetch projects for dropdown ──
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/projects`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load projects");
        setProjects(data); // [{ id, name }]
      } catch (err) {
        setApiError("Could not load projects: " + err.message);
      }
    })();
  }, []);

  // ── Fetch milestones when project changes ──
  useEffect(() => {
    if (!project) { setMilestones([]); setMilestone(""); return; }
    (async () => {
      setMilestonesLoading(true);
      setMilestone("");
      try {
        const res  = await fetch(`${API}/milestones/${project}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load milestones");
        setMilestones(data); // [{ id, name, code, status, progress }]
      } catch (err) {
        notify("Could not load milestones: " + err.message, "error");
        setMilestones([]);
      } finally {
        setMilestonesLoading(false);
      }
    })();
  }, [project]);

  // ── Fetch all BOQs (with optional filters) ──
  const fetchBoqs = useCallback(async () => {
    setBoqsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.append("projectId", filterProject);
      if (filterStatus)  params.append("status",    filterStatus);
      const res  = await fetch(`${API}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load BOQs");
      setBoqs(data);
    } catch (err) {
      notify("Could not load BOQs: " + err.message, "error");
    } finally {
      setBoqsLoading(false);
    }
  }, [filterProject, filterStatus]);

  // Fetch BOQs whenever list tab is active or filters change
  useEffect(() => {
    if (tab === "list") fetchBoqs();
  }, [tab, fetchBoqs]);

  // ── Refresh detail view after approval actions ──
  const refreshDetail = async (id) => {
    try {
      const res  = await fetch(`${API}/${id}`);
      const data = await res.json();
      if (res.ok) setViewingBoq(data);
    } catch (_) {}
  };

  // ═══════════════════════════════════════════════════════════════
  //  SUBMIT / RESUBMIT
  // ═══════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    if (!project)   return notify("Please select a project.", "error");
    if (!milestone) return notify("Please select a milestone.", "error");
    if (rows.some((r) => !r.material || !r.quantity || !r.unitPrice))
      return notify("Please fill in all row fields.", "error");

    // Find selected milestone object
    const milestoneObj = milestones.find((m) => String(m.id) === String(milestone));
    if (!milestoneObj) return notify("Invalid milestone selected.", "error");

    const payload = {
      projectId:     parseInt(project),
      milestoneId:   milestoneObj.id,
      milestoneName: milestoneObj.name,
      rows:          rows.map((r) => ({
        ...r,
        total:     rowTotal(r),
        quantity:  parseFloat(r.quantity),
        unitPrice: parseFloat(r.unitPrice),
      })),
      grandTotal,
    };

    setLoading(true);
    try {
      let res, data;
      if (editingId) {
        // Resubmit — PUT /api/boq/:id
        res  = await fetch(`${API}/${editingId}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update BOQ");
        notify("BOQ resubmitted → sent to PM for re-approval ✓");
        setEditingId(null);
      } else {
        // Create — POST /api/boq
        res  = await fetch(API, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create BOQ");
        notify("BOQ submitted → sent to PM for approval ✓");
      }

      // Reset form and go to list
      setRows([blank(), blank()]);
      setProject("");
      setMilestone("");
      setTab("list");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  EDIT — load a BOQ into the form
  // ═══════════════════════════════════════════════════════════════
  const handleEdit = async (boq) => {
    setProject(String(boq.projectId));
    // Milestones will re-fetch via useEffect when project changes
    // We store the milestone id temporarily; after milestones load we select it
    setMilestone(String(boq.milestoneId));
    setRows(boq.rows.map((r) => ({ ...r, id: r.id || uid() })));
    setEditingId(boq.id);
    setTab("create");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRows([blank(), blank()]);
    setProject("");
    setMilestone("");
  };

  // ═══════════════════════════════════════════════════════════════
  //  APPROVALS — call backend endpoints
  // ═══════════════════════════════════════════════════════════════
  const callApproval = async (url, method = "PUT", body = null) => {
    const res  = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body:    body ? JSON.stringify(body) : null,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Action failed");
    return data;
  };

  const pmApprove = async (id) => {
    try {
      await callApproval(`${API}/approve/pm/${id}`);
      notify("PM approved ✓ — sent to Site Engineer");
      fetchBoqs();
      if (viewingBoq?.id === id) refreshDetail(id);
    } catch (err) { notify(err.message, "error"); }
  };

  const pmReject = async (id) => {
    try {
      await callApproval(`${API}/reject/pm/${id}`, "PUT", { note: "Please review the cost estimates." });
      notify("PM requested changes ↩️");
      fetchBoqs();
      if (viewingBoq?.id === id) refreshDetail(id);
    } catch (err) { notify(err.message, "error"); }
  };

  const seApprove = async (id) => {
    try {
      await callApproval(`${API}/approve/se/${id}`);
      notify("BOQ Finalised ✅ — automatically sent to Site Engineer!");
      fetchBoqs();
      if (viewingBoq?.id === id) refreshDetail(id);
    } catch (err) { notify(err.message, "error"); }
  };

  const seReject = async (id) => {
    try {
      await callApproval(`${API}/reject/se/${id}`, "PUT", { note: "Quantity revision needed." });
      notify("SE requested changes ↩️");
      fetchBoqs();
      if (viewingBoq?.id === id) refreshDetail(id);
    } catch (err) { notify(err.message, "error"); }
  };

  // ═══════════════════════════════════════════════════════════════
  //  DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════
  const openDetail = async (boq) => {
    setTab("detail");
    try {
      const res  = await fetch(`${API}/${boq.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setViewingBoq(data);
    } catch (_) {
      setViewingBoq(boq); // fallback to list data
    }
  };

  const closeDetail = () => {
    setViewingBoq(null);
    setTab("list");
  };

  // ═══════════════════════════════════════════════════════════════
  //  EXPORT CSV
  // ═══════════════════════════════════════════════════════════════
  const exportCSV = (boq) => {
    const lines = [
      ["Material", "Unit", "Quantity", "Unit Price (₹)", "Total (₹)"].join(","),
      ...boq.rows.map((r) =>
        [r.material, r.unit, r.quantity, r.unitPrice,
          parseFloat(r.total || 0).toFixed(2)].join(",")
      ),
      `,,,,Grand Total,${parseFloat(boq.grandTotal).toFixed(2)}`,
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `BOQ_${boq.projectName.replace(/ /g, "_")}_${boq.milestoneName}.csv`;
    a.click();
  };

  // ── Derived ───────────────────────────────────────────────────
  const filtered = boqs.filter((b) => {
    if (filterProject && String(b.projectId) !== String(filterProject)) return false;
    if (filterStatus  && b.status !== filterStatus)                      return false;
    return true;
  });

  // milestone name for detail header
  const detailTitle = viewingBoq
    ? `${viewingBoq.projectName} · ${viewingBoq.milestoneName}`
    : "Bill of Quantities";

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="boq">
      {toast && <div className={`boq__toast boq__toast--${toast.type}`}>{toast.msg}</div>}

      {/* ── HEADER ── */}
      <div className="boq__header">
        <div className="boq__header-left">
          {tab === "detail" ? (
            <button className="boq__back-btn" onClick={closeDetail}>← Back</button>
          ) : (
            <div className="boq__header-icon">📋</div>
          )}
          <div>
            <h1 className="boq__title">
              {tab === "detail" ? detailTitle : "Bill of Quantities"}
            </h1>
            <p className="boq__subtitle">Quantity Surveyor · BOQ Management</p>
          </div>
        </div>

        {tab !== "detail" && (
          <div className="boq__tabs">
            <button
              className={`boq__tab ${tab === "create" ? "active" : ""}`}
              onClick={() => { cancelEdit(); setTab("create"); }}
            >
              {editingId ? "✏️ Editing BOQ" : "+ Create BOQ"}
            </button>
            <button
              className={`boq__tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}
            >
              View BOQs
              {boqs.length > 0 && <span className="boq__badge">{boqs.length}</span>}
            </button>
          </div>
        )}
      </div>

      {/* ── FLOW BANNER ── */}
      <div className="boq__flow-bar">
        {["QS Creates BOQ", "PM Approves (Cost)", "SE Approves (Quantity)", "Finalised → Sent to SE"]
          .map((s, i, arr) => (
            <React.Fragment key={i}>
              <div className="boq__flow-step">
                <span className="boq__flow-dot">{i + 1}</span>
                <span className="boq__flow-label">{s}</span>
              </div>
              {i < arr.length - 1 && <span className="boq__flow-arrow">›</span>}
            </React.Fragment>
          ))}
      </div>

      {/* ── API Error Banner ── */}
      {apiError && (
        <div className="boq__api-error">⚠️ {apiError}</div>
      )}

      <div className="boq__body">

        {/* ════════════════════════════════════════
            CREATE / EDIT TAB
        ════════════════════════════════════════ */}
        {tab === "create" && (
          <>
            {editingId && (
              <div className="boq__edit-banner">
                <span>✏️ Editing submitted BOQ — on resubmit it will go back to PM for re-approval.</span>
                <button className="boq__cancel-edit"
                  onClick={() => { cancelEdit(); setTab("list"); }}>✕ Cancel</button>
              </div>
            )}

            {/* Step 1 — Project & Milestone */}
            <div className="boq__block">
              <div className="boq__block-label">
                <span className="boq__num">1</span>
                Select Project &amp; Milestone
              </div>
              <div className="boq__selectors">

                {/* Project */}
                <div className="boq__sel-group">
                  <label className="boq__sel-label">Project</label>
                  <select
                    className="boq__select"
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

                {/* Milestone — from WBS parent_id IS NULL */}
                <div className="boq__sel-group">
                  <label className="boq__sel-label">Milestone</label>
                  <select
                    className="boq__select"
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    disabled={!project || milestonesLoading}
                  >
                    <option value="">
                      {milestonesLoading
                        ? "Loading milestones…"
                        : !project
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
                  <div className="boq__proj-tag">
                    📌 {proj.name} &nbsp;·&nbsp; 🏗️ {ms.name}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Step 2 — Materials Table */}
            <div className="boq__block">
              <div className="boq__block-label">
                <span className="boq__num">2</span>
                Add Materials
                <button className="boq__add-btn"
                  onClick={() => setRows((p) => [...p, blank()])}>
                  + Add Row
                </button>
              </div>

              <div className="boq__table-scroll">
                <table className="boq__table">
                  <colgroup>
                    <col style={{width:"44px"}} /><col />
                    <col style={{width:"88px"}} /><col style={{width:"110px"}} />
                    <col style={{width:"138px"}} /><col style={{width:"138px"}} />
                    <col style={{width:"44px"}} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th><th>Material Name</th><th>Unit</th>
                      <th>Quantity</th><th>Unit Price (₹)</th><th>Total (₹)</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id}>
                        <td className="td-num">{i + 1}</td>
                        <td>
                          <input className="boq__inp"
                            placeholder="e.g. M25 Concrete, Steel Bar…"
                            value={row.material}
                            onChange={(e) => change(row.id, "material", e.target.value)} />
                        </td>
                        <td>
                          <select className="boq__inp boq__inp--sel" value={row.unit}
                            onChange={(e) => change(row.id, "unit", e.target.value)}>
                            {UNITS.map((u) => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="boq__inp boq__inp--n" type="number" min="0"
                            placeholder="0" value={row.quantity}
                            onChange={(e) => change(row.id, "quantity", e.target.value)} />
                        </td>
                        <td>
                          <input className="boq__inp boq__inp--n" type="number" min="0"
                            placeholder="0.00" value={row.unitPrice}
                            onChange={(e) => change(row.id, "unitPrice", e.target.value)} />
                        </td>
                        <td className="td-total">
                          ₹ {rowTotal(row).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <button className="boq__del"
                            onClick={() =>
                              rows.length > 1 &&
                              setRows((p) => p.filter((r) => r.id !== row.id))}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 3 — Grand Total + Submit */}
            <div className="boq__footer-row">
              <div className="boq__grand">
                <span className="boq__grand-lbl">Grand Total</span>
                <span className="boq__grand-amt">
                  ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button className="boq__submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading
                  ? "Saving…"
                  : editingId
                  ? "Resubmit for Approval →"
                  : "Submit BOQ → PM Approval"}
              </button>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════
            LIST TAB
        ════════════════════════════════════════ */}
        {tab === "list" && (
          <>
            <div className="boq__view-head">
              <h2 className="boq__view-h">All BOQs</h2>
              <div className="boq__filters">
                <select className="boq__select boq__select--sm"
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select className="boq__select boq__select--sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {boqsLoading ? (
              <div className="boq__loading">
                <div className="boq__spinner" />
                Loading BOQs…
              </div>
            ) : filtered.length === 0 ? (
              <div className="boq__empty">
                <span>📋</span>
                <p>No BOQs found.</p>
                <button className="boq__ghost-btn" onClick={() => setTab("create")}>
                  Create your first BOQ →
                </button>
              </div>
            ) : (
              <div className="boq__list-table-wrap">
                <table className="boq__list-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Milestone</th>
                      <th>Date</th>
                      <th>Grand Total</th>
                      <th>Status</th>
                      <th>Sent to SE</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((boq) => {
                      const st      = STATUS[boq.status] || STATUS.pending_pm;
                      const canEdit = ["rejected", "pending_pm", "pending_se"].includes(boq.status);
                      return (
                        <tr key={boq.id} className="boq__list-row">
                          <td className="boq__list-proj">{boq.projectName}</td>
                          <td>
                            <span className="boq__milestone-tag">🏗️ {boq.milestoneName}</span>
                          </td>
                          <td className="boq__list-date">
                            {boq.date}
                            {boq.updatedDate && (
                              <><br /><span className="boq__updated">Updated {boq.updatedDate}</span></>
                            )}
                          </td>
                          <td className="boq__list-total">
                            ₹ {parseFloat(boq.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <span className={`boq__status-badge boq__status--${st.color}`}>
                              {st.icon} {st.label}
                            </span>
                          </td>
                          <td className="boq__list-se">
                            {boq.sentToSE
                              ? <span className="boq__se-sent">✅ Sent</span>
                              : <span className="boq__se-pending">—</span>}
                          </td>
                          <td>
                            <div className="boq__list-actions">
                              <button className="boq__view-btn"
                                onClick={() => openDetail(boq)}>👁 View</button>
                              {canEdit && (
                                <button className="boq__edit-btn"
                                  onClick={() => handleEdit(boq)}>✏️ Edit</button>
                              )}
                              {boq.status === "pending_pm" && (
                                <>
                                  <button className="boq__approve-btn"
                                    onClick={() => pmApprove(boq.id)}>✔ PM OK</button>
                                  <button className="boq__reject-btn"
                                    onClick={() => pmReject(boq.id)}>✘ PM Reject</button>
                                </>
                              )}
                              {boq.status === "pending_se" && (
                                <>
                                  <button className="boq__approve-btn"
                                    onClick={() => seApprove(boq.id)}>✔ SE OK</button>
                                  <button className="boq__reject-btn"
                                    onClick={() => seReject(boq.id)}>✘ SE Reject</button>
                                </>
                              )}
                              {boq.status === "finalised" && (
                                <button className="boq__export-btn"
                                  onClick={() => exportCSV(boq)}>⬇ CSV</button>
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

        {/* ════════════════════════════════════════
            DETAIL TAB
        ════════════════════════════════════════ */}
        {tab === "detail" && viewingBoq && (() => {
          const boq = viewingBoq;
          const st  = STATUS[boq.status] || STATUS.pending_pm;
          return (
            <div className="boq__detail">

              {/* Info Bar */}
              <div className="boq__detail-infobar">
                {[
                  { label: "Project",      value: boq.projectName },
                  { label: "Milestone",    value: `🏗️ ${boq.milestoneName}` },
                  { label: "Created",      value: boq.date },
                  ...(boq.updatedDate ? [{ label: "Last Updated", value: boq.updatedDate }] : []),
                  { label: "Status",       value: null, badge: true },
                  ...(boq.sentToSE ? [{ label: "Sent to SE", value: `✅ Sent on ${boq.finalisedDate}`, green: true }] : []),
                ].map((item, i) => (
                  <div key={i} className="boq__detail-infoitem">
                    <span className="boq__detail-infolbl">{item.label}</span>
                    {item.badge
                      ? <span className={`boq__status-badge boq__status--${st.color}`}>{st.icon} {st.label}</span>
                      : <span className={`boq__detail-infoval${item.green ? " boq__se-sent" : ""}`}>{item.value}</span>
                    }
                  </div>
                ))}
              </div>

              {/* Rejection note */}
              {boq.status === "rejected" && (boq.pmNote || boq.seNote) && (
                <div className="boq__note">
                  <strong>
                    💬 Suggestion from {boq.pmNote ? "Project Manager" : "Site Engineer"}:
                  </strong>
                  &nbsp;{boq.pmNote || boq.seNote}
                  <button className="boq__edit-inline" onClick={() => handleEdit(boq)}>
                    ✏️ Edit &amp; Resubmit
                  </button>
                </div>
              )}

              {/* Approval Tracker */}
              <div className="boq__block">
                <div className="boq__block-label">
                  <span className="boq__num">📊</span> Approval Progress
                </div>
                <div className="boq__approval-track">
                  {[
                    {
                      label:   "Submitted by QS",
                      done:    ["pending_pm","pending_se","finalised","rejected"].includes(boq.status),
                    },
                    {
                      label:   "PM Approved\n(Cost Report)",
                      done:    ["pending_se","finalised"].includes(boq.status),
                      current: boq.status === "pending_pm",
                    },
                    {
                      label:   "SE Approved\n(Qty Report)",
                      done:    boq.status === "finalised",
                      current: boq.status === "pending_se",
                    },
                    {
                      label:   "Finalised &\nSent to SE",
                      done:    boq.status === "finalised",
                    },
                  ].map((step, i, arr) => (
                    <React.Fragment key={i}>
                      <div className={`boq__approval-step ${step.done ? "done" : step.current ? "active" : ""}`}>
                        <span className="boq__ap-dot">{step.done ? "✓" : i + 1}</span>
                        <span className="boq__ap-label">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className="boq__ap-line" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Finalised Banner */}
              {boq.status === "finalised" && (
                <div className="boq__finalised-banner">
                  <span className="boq__finalised-icon">✅</span>
                  <div>
                    <div className="boq__finalised-title">BOQ Finalised &amp; Sent to Site Engineer</div>
                    <div className="boq__finalised-sub">
                      Finalised on {boq.finalisedDate} · Site Engineer has received this BOQ.
                    </div>
                  </div>
                  <button className="boq__export-btn boq__export-btn--lg"
                    onClick={() => exportCSV(boq)}>⬇ Export CSV</button>
                </div>
              )}

              {/* Approval action buttons in detail view */}
              {boq.status === "pending_pm" && (
                <div className="boq__demo-actions">
                  <span className="boq__demo-label">[ PM Actions ]</span>
                  <button className="boq__approve-btn" onClick={() => pmApprove(boq.id)}>✔ PM Approve</button>
                  <button className="boq__reject-btn"  onClick={() => pmReject(boq.id)}>✘ Request Changes</button>
                </div>
              )}
              {boq.status === "pending_se" && (
                <div className="boq__demo-actions">
                  <span className="boq__demo-label">[ SE Actions ]</span>
                  <button className="boq__approve-btn" onClick={() => seApprove(boq.id)}>✔ SE Approve</button>
                  <button className="boq__reject-btn"  onClick={() => seReject(boq.id)}>✘ Request Changes</button>
                </div>
              )}

              {/* Materials Table */}
              <div className="boq__block">
                <div className="boq__block-label">
                  <span className="boq__num">📋</span> Bill of Quantities
                </div>
                <div className="boq__table-scroll">
                  <table className="boq__table">
                    <colgroup>
                      <col style={{width:"44px"}} /><col />
                      <col style={{width:"88px"}} /><col style={{width:"120px"}} />
                      <col style={{width:"150px"}} /><col style={{width:"150px"}} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>#</th><th>Material</th><th>Unit</th>
                        <th>Quantity</th><th>Unit Price (₹)</th><th>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boq.rows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td className="td-num">{i + 1}</td>
                          <td><strong>{r.material}</strong></td>
                          <td>{r.unit}</td>
                          <td className="td-num">
                            {parseFloat(r.quantity).toLocaleString("en-IN")}
                          </td>
                          <td className="td-num">
                            ₹ {parseFloat(r.unitPrice).toLocaleString("en-IN")}
                          </td>
                          <td className="td-total">
                            ₹ {parseFloat(r.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="tfoot-lbl">Grand Total</td>
                        <td className="tfoot-val">
                          ₹ {parseFloat(boq.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="boq__detail-actions">
                <button className="boq__ghost-btn" onClick={closeDetail}>
                  ← Back to All BOQs
                </button>
                {["rejected", "pending_pm", "pending_se"].includes(boq.status) && (
                  <button className="boq__edit-btn boq__edit-btn--lg"
                    onClick={() => handleEdit(boq)}>✏️ Edit BOQ</button>
                )}
              </div>

            </div>
          );
        })()}

      </div>
    </div>
  );
}