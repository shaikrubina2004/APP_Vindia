import React, { useState } from "react";
import "./Qsboq.css";

// ── Static data ───────────────────────────────────────────────
const PROJECTS = [
  { id: "P001", name: "IT Office Complex — Tower A" },
  { id: "P002", name: "Green Valley Residences" },
  { id: "P003", name: "Metro Commercial Complex" },
];

const MILESTONES = {
  P001: ["Foundation", "Structure", "MEP", "Finishing"],
  P002: ["Site Clearance", "Foundation", "Structure", "Finishing"],
  P003: ["Foundation", "Basement", "Structure", "MEP", "Finishing"],
};

const UNITS = ["m³", "m²", "m", "kg", "nos", "ltr", "ton", "bag", "rft"];

// Status flow: pending_pm → pending_se → finalised
// rejection at any step → rejected (QS edits & resubmits)
const STATUS = {
  pending_pm: { label: "Awaiting PM Approval",  color: "amber", icon: "⏳" },
  pending_se: { label: "Awaiting SE Approval",  color: "blue",  icon: "⏳" },
  finalised:  { label: "Finalised",              color: "green", icon: "✅" },
  rejected:   { label: "Changes Requested",      color: "red",   icon: "↩️" },
};

const uid   = () => Math.random().toString(36).substr(2, 9);
const blank = () => ({ id: uid(), material: "", unit: "m²", quantity: "", unitPrice: "" });
const today = () =>
  new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── Component ─────────────────────────────────────────────────
export default function Qsboq() {
  const [tab,           setTab]           = useState("create"); // 'create' | 'list' | 'detail'
  const [project,       setProject]       = useState("");
  const [milestone,     setMilestone]     = useState("");
  const [rows,          setRows]          = useState([blank(), blank()]);
  const [boqs,          setBoqs]          = useState([]);
  const [toast,         setToast]         = useState(null);
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [editingId,     setEditingId]     = useState(null);
  const [viewingBoq,    setViewingBoq]    = useState(null); // full detail view

  // ── Helpers ──
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const change    = (id, field, val) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const rowTotal  = (r) => (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0);
  const grandTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  // ── Submit / Resubmit ──
  const handleSubmit = () => {
    if (!project)   return notify("Please select a project.", "error");
    if (!milestone) return notify("Please select a milestone.", "error");
    if (rows.some((r) => !r.material || !r.quantity || !r.unitPrice))
      return notify("Please fill in all row fields.", "error");

    const proj = PROJECTS.find((p) => p.id === project);

    if (editingId) {
      setBoqs((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? { ...b, projectId: project, projectName: proj.name, milestone,
                rows: rows.map((r) => ({ ...r, total: rowTotal(r) })), grandTotal,
                status: "pending_pm", updatedDate: today(), pmNote: "", seNote: "" }
            : b
        )
      );
      notify("BOQ resubmitted → sent to PM for re-approval ✓");
      setEditingId(null);
    } else {
      const newBoq = {
        id: uid(), projectId: project, projectName: proj.name, milestone,
        date: today(), updatedDate: null,
        rows: rows.map((r) => ({ ...r, total: rowTotal(r) })), grandTotal,
        status: "pending_pm", pmNote: "", seNote: "",
        sentToSE: false,
      };
      setBoqs((prev) => [...prev, newBoq]);
      notify("BOQ submitted → sent to PM for approval ✓");
    }

    setRows([blank(), blank()]);
    setProject("");
    setMilestone("");
    setTab("list");
  };

  // ── Edit ──
  const handleEdit = (boq) => {
    setProject(boq.projectId);
    setMilestone(boq.milestone);
    setRows(boq.rows.map((r) => ({ ...r })));
    setEditingId(boq.id);
    setTab("create");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRows([blank(), blank()]);
    setProject("");
    setMilestone("");
  };

  // ── Approvals (demo — replace with real role checks in production) ──
  const pmApprove = (id) =>
    setBoqs((p) => p.map((b) => b.id === id ? { ...b, status: "pending_se" } : b));
  const pmReject  = (id) =>
    setBoqs((p) => p.map((b) => b.id === id ? { ...b, status: "rejected",  pmNote: "Please review the cost estimates." } : b));

  // When SE approves → finalised + mark sentToSE = true
  const seApprove = (id) => {
    setBoqs((p) =>
      p.map((b) => b.id === id ? { ...b, status: "finalised", sentToSE: true, finalisedDate: today() } : b)
    );
    notify("BOQ Finalised ✅ — automatically sent to Site Engineer!");
  };
  const seReject = (id) =>
    setBoqs((p) => p.map((b) => b.id === id ? { ...b, status: "rejected", seNote: "Quantity revision needed." } : b));

  // ── View detail ──
  const openDetail = (boq) => {
    setViewingBoq(boq);
    setTab("detail");
  };
  const closeDetail = () => {
    setViewingBoq(null);
    setTab("list");
  };

  // ── Export CSV ──
  const exportCSV = (boq) => {
    const lines = [
      ["Material", "Unit", "Quantity", "Unit Price (₹)", "Total (₹)"].join(","),
      ...boq.rows.map((r) => [r.material, r.unit, r.quantity, r.unitPrice, r.total.toFixed(2)].join(",")),
      `,,,,Grand Total,${boq.grandTotal.toFixed(2)}`,
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `BOQ_${boq.projectName.replace(/ /g, "_")}_${boq.milestone}.csv`;
    a.click();
  };

  const filtered = boqs.filter((b) => {
    if (filterProject && b.projectId !== filterProject) return false;
    if (filterStatus  && b.status    !== filterStatus)  return false;
    return true;
  });

  const milestoneOptions = project ? (MILESTONES[project] || []) : [];

  // live version of viewing boq (to reflect state updates)
  const liveViewingBoq = viewingBoq ? boqs.find((b) => b.id === viewingBoq.id) : null;

  // ── Render ────────────────────────────────────────────────────
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
              {tab === "detail" && liveViewingBoq
                ? `${liveViewingBoq.projectName} · ${liveViewingBoq.milestone}`
                : "Bill of Quantities"}
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
              View BOQs {boqs.length > 0 && <span className="boq__badge">{boqs.length}</span>}
            </button>
          </div>
        )}
      </div>

      {/* ── APPROVAL FLOW BANNER ── */}
      <div className="boq__flow-bar">
        {[
          { label: "QS Creates BOQ"         },
          { label: "PM Approves (Cost)"      },
          { label: "SE Approves (Quantity)"  },
          { label: "Finalised → Sent to SE"  },
        ].map((s, i, arr) => (
          <React.Fragment key={i}>
            <div className="boq__flow-step">
              <span className="boq__flow-dot">{i + 1}</span>
              <span className="boq__flow-label">{s.label}</span>
            </div>
            {i < arr.length - 1 && <span className="boq__flow-arrow">›</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="boq__body">

        {/* ══════════ CREATE / EDIT TAB ══════════ */}
        {tab === "create" && (
          <>
            {editingId && (
              <div className="boq__edit-banner">
                <span>✏️ Editing submitted BOQ — on resubmit it will go back to PM for re-approval.</span>
                <button className="boq__cancel-edit" onClick={() => { cancelEdit(); setTab("list"); }}>✕ Cancel</button>
              </div>
            )}

            {/* Step 1 */}
            <div className="boq__block">
              <div className="boq__block-label"><span className="boq__num">1</span> Select Project &amp; Milestone</div>
              <div className="boq__selectors">
                <div className="boq__sel-group">
                  <label className="boq__sel-label">Project</label>
                  <select className="boq__select" value={project}
                    onChange={(e) => { setProject(e.target.value); setMilestone(""); }}>
                    <option value="">— Choose project —</option>
                    {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="boq__sel-group">
                  <label className="boq__sel-label">Milestone</label>
                  <select className="boq__select" value={milestone}
                    onChange={(e) => setMilestone(e.target.value)} disabled={!project}>
                    <option value="">— Choose milestone —</option>
                    {milestoneOptions.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              {project && milestone && (
                <div className="boq__proj-tag">
                  📌 {PROJECTS.find((p) => p.id === project)?.name} &nbsp;·&nbsp; 🏗️ {milestone}
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div className="boq__block">
              <div className="boq__block-label">
                <span className="boq__num">2</span> Add Materials
                <button className="boq__add-btn" onClick={() => setRows((p) => [...p, blank()])}>+ Add Row</button>
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
                    <tr><th>#</th><th>Material Name</th><th>Unit</th><th>Quantity</th><th>Unit Price (₹)</th><th>Total (₹)</th><th></th></tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id}>
                        <td className="td-num">{i + 1}</td>
                        <td><input className="boq__inp" placeholder="e.g. M25 Concrete, Steel Bar…"
                          value={row.material} onChange={(e) => change(row.id, "material", e.target.value)} /></td>
                        <td><select className="boq__inp boq__inp--sel" value={row.unit}
                          onChange={(e) => change(row.id, "unit", e.target.value)}>
                          {UNITS.map((u) => <option key={u}>{u}</option>)}</select></td>
                        <td><input className="boq__inp boq__inp--n" type="number" min="0" placeholder="0"
                          value={row.quantity} onChange={(e) => change(row.id, "quantity", e.target.value)} /></td>
                        <td><input className="boq__inp boq__inp--n" type="number" min="0" placeholder="0.00"
                          value={row.unitPrice} onChange={(e) => change(row.id, "unitPrice", e.target.value)} /></td>
                        <td className="td-total">₹ {rowTotal(row).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td><button className="boq__del"
                          onClick={() => rows.length > 1 && setRows((p) => p.filter((r) => r.id !== row.id))}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 3 */}
            <div className="boq__footer-row">
              <div className="boq__grand">
                <span className="boq__grand-lbl">Grand Total</span>
                <span className="boq__grand-amt">₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <button className="boq__submit-btn" onClick={handleSubmit}>
                {editingId ? "Resubmit for Approval →" : "Submit BOQ → PM Approval"}
              </button>
            </div>
          </>
        )}

        {/* ══════════ LIST TAB ══════════ */}
        {tab === "list" && (
          <>
            <div className="boq__view-head">
              <h2 className="boq__view-h">All BOQs</h2>
              <div className="boq__filters">
                <select className="boq__select boq__select--sm" value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="boq__select boq__select--sm" value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="boq__empty">
                <span>📋</span>
                <p>No BOQs found.</p>
                <button className="boq__ghost-btn" onClick={() => setTab("create")}>Create your first BOQ →</button>
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
                      const st     = STATUS[boq.status];
                      const canEdit = ["rejected", "pending_pm", "pending_se"].includes(boq.status);
                      return (
                        <tr key={boq.id} className="boq__list-row">
                          <td className="boq__list-proj">
                            <div>{boq.projectName}</div>
                          </td>
                          <td><span className="boq__milestone-tag">🏗️ {boq.milestone}</span></td>
                          <td className="boq__list-date">{boq.date}{boq.updatedDate && <><br/><span className="boq__updated">Updated {boq.updatedDate}</span></>}</td>
                          <td className="boq__list-total">₹ {boq.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
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
                              <button className="boq__view-btn" onClick={() => openDetail(boq)}>👁 View</button>
                              {canEdit && (
                                <button className="boq__edit-btn" onClick={() => handleEdit(boq)}>✏️ Edit</button>
                              )}
                              {/* Demo approvals */}
                              {boq.status === "pending_pm" && (
                                <>
                                  <button className="boq__approve-btn" onClick={() => pmApprove(boq.id)}>✔ PM OK</button>
                                  <button className="boq__reject-btn"  onClick={() => pmReject(boq.id)}>✘ PM Reject</button>
                                </>
                              )}
                              {boq.status === "pending_se" && (
                                <>
                                  <button className="boq__approve-btn" onClick={() => seApprove(boq.id)}>✔ SE OK</button>
                                  <button className="boq__reject-btn"  onClick={() => seReject(boq.id)}>✘ SE Reject</button>
                                </>
                              )}
                              {boq.status === "finalised" && (
                                <button className="boq__export-btn" onClick={() => exportCSV(boq)}>⬇ CSV</button>
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

        {/* ══════════ DETAIL / VIEW BOQ TAB ══════════ */}
        {tab === "detail" && liveViewingBoq && (() => {
          const boq = liveViewingBoq;
          const st  = STATUS[boq.status];
          return (
            <div className="boq__detail">

              {/* Info Bar */}
              <div className="boq__detail-infobar">
                <div className="boq__detail-infoitem">
                  <span className="boq__detail-infolbl">Project</span>
                  <span className="boq__detail-infoval">{boq.projectName}</span>
                </div>
                <div className="boq__detail-infoitem">
                  <span className="boq__detail-infolbl">Milestone</span>
                  <span className="boq__detail-infoval">🏗️ {boq.milestone}</span>
                </div>
                <div className="boq__detail-infoitem">
                  <span className="boq__detail-infolbl">Created</span>
                  <span className="boq__detail-infoval">{boq.date}</span>
                </div>
                {boq.updatedDate && (
                  <div className="boq__detail-infoitem">
                    <span className="boq__detail-infolbl">Last Updated</span>
                    <span className="boq__detail-infoval">{boq.updatedDate}</span>
                  </div>
                )}
                <div className="boq__detail-infoitem">
                  <span className="boq__detail-infolbl">Status</span>
                  <span className={`boq__status-badge boq__status--${st.color}`}>{st.icon} {st.label}</span>
                </div>
                {boq.sentToSE && (
                  <div className="boq__detail-infoitem">
                    <span className="boq__detail-infolbl">Sent to SE</span>
                    <span className="boq__se-sent">✅ Sent on {boq.finalisedDate}</span>
                  </div>
                )}
              </div>

              {/* Rejection note */}
              {boq.status === "rejected" && (boq.pmNote || boq.seNote) && (
                <div className="boq__note">
                  <strong>💬 Suggestion from {boq.pmNote ? "Project Manager" : "Site Engineer"}:</strong>
                  &nbsp;{boq.pmNote || boq.seNote}
                  <button className="boq__edit-inline" onClick={() => handleEdit(boq)}>✏️ Edit &amp; Resubmit</button>
                </div>
              )}

              {/* Approval Tracker */}
              <div className="boq__block">
                <div className="boq__block-label"><span className="boq__num">📊</span> Approval Progress</div>
                <div className="boq__approval-track">
                  {[
                    { label: "Submitted by QS",          active: ["pending_pm","pending_se","finalised","rejected"].includes(boq.status) },
                    { label: "PM Approved\n(Cost Report)", active: ["pending_se","finalised"].includes(boq.status), current: boq.status === "pending_pm" },
                    { label: "SE Approved\n(Qty Report)", active: boq.status === "finalised", current: boq.status === "pending_se" },
                    { label: "Finalised &\nSent to SE",   active: boq.status === "finalised" },
                  ].map((step, i, arr) => (
                    <React.Fragment key={i}>
                      <div className={`boq__approval-step ${step.active ? "done" : step.current ? "active" : ""}`}>
                        <span className="boq__ap-dot">{step.active ? "✓" : i + 1}</span>
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
                      Finalised on {boq.finalisedDate} · Site Engineer has received this BOQ for execution reference.
                    </div>
                  </div>
                  <button className="boq__export-btn boq__export-btn--lg" onClick={() => exportCSV(boq)}>
                    ⬇ Export CSV
                  </button>
                </div>
              )}

              {/* Materials Table */}
              <div className="boq__block">
                <div className="boq__block-label"><span className="boq__num">📋</span> Bill of Quantities</div>
                <div className="boq__table-scroll">
                  <table className="boq__table">
                    <colgroup>
                      <col style={{width:"44px"}} /><col />
                      <col style={{width:"88px"}} /><col style={{width:"120px"}} />
                      <col style={{width:"150px"}} /><col style={{width:"150px"}} />
                    </colgroup>
                    <thead>
                      <tr><th>#</th><th>Material</th><th>Unit</th><th>Quantity</th><th>Unit Price (₹)</th><th>Total (₹)</th></tr>
                    </thead>
                    <tbody>
                      {boq.rows.map((r, i) => (
                        <tr key={r.id}>
                          <td className="td-num">{i + 1}</td>
                          <td><strong>{r.material}</strong></td>
                          <td>{r.unit}</td>
                          <td className="td-num">{r.quantity}</td>
                          <td className="td-num">₹ {parseFloat(r.unitPrice).toLocaleString("en-IN")}</td>
                          <td className="td-total">₹ {r.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="tfoot-lbl">Grand Total</td>
                        <td className="tfoot-val">₹ {boq.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="boq__detail-actions">
                <button className="boq__ghost-btn" onClick={closeDetail}>← Back to All BOQs</button>
                {["rejected","pending_pm","pending_se"].includes(boq.status) && (
                  <button className="boq__edit-btn boq__edit-btn--lg" onClick={() => handleEdit(boq)}>✏️ Edit BOQ</button>
                )}
              </div>

            </div>
          );
        })()}

      </div>
    </div>
  );
}