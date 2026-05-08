import React, { useState, useEffect, useCallback } from "react";
import "./Qsmeasurement.css";

const API     = "/api/measurement";
const BOQ_API = "/api/boq";

const uid         = () => Math.random().toString(36).substr(2, 9);
const blankRow    = () => ({ id: uid(), description: "", length: "", width: "", height: "", nos: "1", isDeduction: false });
const fmtN        = (n) => parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const UNITS = ["m²", "m³", "m", "rft", "nos", "kg", "bag"];

const calcQty = (r) => {
  const l = parseFloat(r.length) || 0;
  const w = parseFloat(r.width)  || 0;
  const h = parseFloat(r.height) || 0;
  const n = parseFloat(r.nos)    || 1;
  if (l && w && h) return parseFloat((l * w * h * n).toFixed(4));
  if (l && w)      return parseFloat((l * w * n).toFixed(4));
  if (l)           return parseFloat((l * n).toFixed(4));
  return 0;
};

export default function Qsmeasurement() {
  const [tab,       setTab]      = useState("create");
  const [toast,     setToast]    = useState(null);
  const [loading,   setLoading]  = useState(false);
  const [apiError,  setApiError] = useState(null);

  // Dropdowns
  const [projects,          setProjects]          = useState([]);
  const [milestones,        setMilestones]        = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  // Form
  const [project,     setProject]     = useState("");
  const [milestone,   setMilestone]   = useState("");
  const [sheetTitle,  setSheetTitle]  = useState("");
  const [unit,        setUnit]        = useState("m²");
  const [rows,        setRows]        = useState([blankRow(), blankRow()]);
  const [editingId,   setEditingId]   = useState(null);

  // List
  const [sheets,         setSheets]         = useState([]);
  const [sheetsLoading,  setSheetsLoading]  = useState(false);
  const [filterProject,  setFilterProject]  = useState("");
  const [filterFrom,     setFilterFrom]     = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [filterTo, setFilterTo] = useState(() => new Date().toISOString().split("T")[0]);

  // Detail
  const [viewingSheet, setViewingSheet] = useState(null);
  const [pushModal,    setPushModal]    = useState(false);
  const [existingBoqs, setExistingBoqs] = useState([]);
  const [pushTarget,   setPushTarget]   = useState("new"); // "new" | boqId
  const [pushLoading,  setPushLoading]  = useState(false);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Computed totals ──
  const grossQty = rows
    .filter((r) => !r.isDeduction)
    .reduce((s, r) => s + calcQty(r), 0);
  const deductQty = rows
    .filter((r) => r.isDeduction)
    .reduce((s, r) => s + calcQty(r), 0);
  const netQty = parseFloat((grossQty - deductQty).toFixed(4));

  // ── Row helpers ──
  const changeRow = (id, field, val) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const removeRow = (id) =>
    rows.length > 1 && setRows((p) => p.filter((r) => r.id !== id));
  const addRow = (isDeduction = false) =>
    setRows((p) => [...p, { ...blankRow(), isDeduction }]);

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

  // ── Fetch milestones ──
  useEffect(() => {
    if (!project) { setMilestones([]); setMilestone(""); return; }
    (async () => {
      setMilestonesLoading(true);
      setMilestone("");
      try {
        const res  = await fetch(`${BOQ_API}/milestones/${project}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setMilestones(data);
      } catch (err) {
        notify("Could not load milestones: " + err.message, "error");
        setMilestones([]);
      } finally {
        setMilestonesLoading(false);
      }
    })();
  }, [project]);

  // ── Fetch sheets ──
  const fetchSheets = useCallback(async () => {
    setSheetsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.append("projectId", filterProject);
      const res  = await fetch(`${API}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSheets(data);
    } catch (err) {
      notify("Could not load sheets: " + err.message, "error");
    } finally {
      setSheetsLoading(false);
    }
  }, [filterProject]);

  useEffect(() => {
    if (tab === "list") fetchSheets();
  }, [tab, fetchSheets]);

  // ── Fetch existing BOQs for push modal ──
  const fetchExistingBoqs = async (projectId) => {
    try {
      const res  = await fetch(`${BOQ_API}?projectId=${projectId}&status=pending_pm`);
      const data = await res.json();
      if (res.ok) setExistingBoqs(data);
    } catch (_) { setExistingBoqs([]); }
  };

  // ── Submit / Update sheet ──
  const handleSubmit = async () => {
    if (!project)    return notify("Please select a project.", "error");
    if (!milestone)  return notify("Please select a milestone.", "error");
    if (!sheetTitle.trim()) return notify("Please enter a sheet title.", "error");
    if (rows.filter((r) => !r.isDeduction).some((r) => !r.description))
      return notify("Please fill in all row descriptions.", "error");

    const milestoneObj = milestones.find((m) => String(m.id) === String(milestone));
    if (!milestoneObj) return notify("Invalid milestone.", "error");

    const payload = {
      projectId:     parseInt(project),
      milestoneId:   milestoneObj.id,
      milestoneName: milestoneObj.name,
      sheetTitle:    sheetTitle.trim(),
      unit,
      rows: rows.map((r) => ({ ...r, qty: calcQty(r) })),
      grossQty,
      deductQty,
      netQty,
    };

    setLoading(true);
    try {
      let res, data;
      if (editingId) {
        res  = await fetch(`${API}/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update");
        notify("Measurement sheet updated ✓");
        setEditingId(null);
      } else {
        res  = await fetch(API, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create");
        notify("Measurement sheet saved ✓");
      }
      resetForm();
      setTab("list");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProject(""); setMilestone(""); setSheetTitle("");
    setUnit("m²"); setRows([blankRow(), blankRow()]); setEditingId(null);
  };

  // ── Edit ──
  const handleEdit = (sheet) => {
    setProject(String(sheet.projectId));
    setMilestone(String(sheet.milestoneId));
    setSheetTitle(sheet.sheetTitle || "");
    setUnit(sheet.unit || "m²");
    setRows((sheet.rows || []).map((r) => ({ ...r, id: r.id || uid() })));
    setEditingId(sheet.id);
    setTab("create");
  };

  // ── Open detail ──
  const openDetail = async (sheet) => {
    setTab("detail");
    setViewingSheet(sheet);
    try {
      const res  = await fetch(`${API}/${sheet.id}`);
      const data = await res.json();
      if (res.ok) setViewingSheet(data);
    } catch (_) {}
  };

  // ── Push to BOQ ──
  const openPushModal = async (sheet) => {
    setViewingSheet(sheet);
    await fetchExistingBoqs(sheet.projectId);
    setPushTarget("new");
    setPushModal(true);
  };

  const handlePush = async () => {
    if (!viewingSheet) return;
    setPushLoading(true);
    try {
      const res  = await fetch(`${API}/${viewingSheet.id}/push-to-boq`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetBoqId: pushTarget === "new" ? null : pushTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to push");
      notify(
        pushTarget === "new"
          ? "Pushed to BOQ ✓ — go to BOQ page to complete and submit"
          : "Added to existing BOQ ✓"
      );
      setPushModal(false);
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setPushLoading(false);
    }
  };

  // ── Export CSV ──
  const exportCSV = (sheet) => {
    const lines = [
      `Measurement Sheet — ${sheet.projectName} · ${sheet.milestoneName}`,
      `Sheet: ${sheet.sheetTitle} | Unit: ${sheet.unit} | Date: ${sheet.date}`,
      "",
      ["#", "Description", "L (m)", "W (m)", "H (m)", "Nos", "Qty", "Type"].join(","),
      ...(sheet.rows || []).map((r, i) =>
        [i + 1, r.description, r.length || "", r.width || "", r.height || "",
          r.nos || 1, (r.qty || calcQty(r)).toFixed(4),
          r.isDeduction ? "Deduction" : "Addition"].join(",")
      ),
      "",
      `Gross Qty,,,,,,${parseFloat(sheet.grossQty).toFixed(4)},`,
      `Deductions,,,,,,${parseFloat(sheet.deductQty).toFixed(4)},`,
      `Net Qty,,,,,,${parseFloat(sheet.netQty).toFixed(4)},${sheet.unit}`,
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `Measurement_${sheet.projectName?.replace(/ /g, "_")}_${sheet.sheetTitle?.replace(/ /g, "_")}.csv`;
    a.click();
  };

  // ── Date filter ──
  const setRange = (days) => {
    const to = new Date(), from = new Date();
    from.setDate(from.getDate() - days);
    setFilterFrom(from.toISOString().split("T")[0]);
    setFilterTo(to.toISOString().split("T")[0]);
  };

  const parseDate = (str) => {
    if (!str) return null;
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    const p = String(str).trim().split(/\s+/);
    if (p.length === 3 && months[p[1]] !== undefined)
      return new Date(parseInt(p[2]), months[p[1]], parseInt(p[0]), 12);
    if (String(str).includes("-")) {
      const [y, m, d] = String(str).split("T")[0].split("-").map(Number);
      return new Date(y, m - 1, d, 12);
    }
    return null;
  };

  const filtered = sheets.filter((s) => {
    if (filterProject && String(s.projectId) !== String(filterProject)) return false;
    if (filterFrom || filterTo) {
      const d = parseDate(s.date);
      if (d) {
        if (filterFrom) { const [fy,fm,fd] = filterFrom.split("-").map(Number); if (d < new Date(fy,fm-1,fd)) return false; }
        if (filterTo)   { const [ty,tm,td] = filterTo.split("-").map(Number);   if (d > new Date(ty,tm-1,td,23,59,59)) return false; }
      }
    }
    return true;
  });

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="ms">
      {toast && <div className={`ms__toast ms__toast--${toast.type}`}>{toast.msg}</div>}

      {/* HEADER */}
      <div className="ms__header">
        <div className="ms__header-left">
          {tab === "detail" ? (
            <button className="ms__back-btn"
              onClick={() => { setViewingSheet(null); setTab("list"); }}>← Back</button>
          ) : (
            <div className="ms__header-icon">📐</div>
          )}
          <div>
            <h1 className="ms__title">
              {tab === "detail" && viewingSheet
                ? `${viewingSheet.projectName} · ${viewingSheet.sheetTitle}`
                : "Measurement Sheet"}
            </h1>
            <p className="ms__subtitle">Quantity Surveyor · Site Measurements</p>
          </div>
        </div>
        {tab !== "detail" && (
          <div className="ms__tabs">
            <button className={`ms__tab ${tab === "create" ? "active" : ""}`}
              onClick={() => { resetForm(); setTab("create"); }}>
              {editingId ? "✏️ Editing" : "+ New Sheet"}
            </button>
            <button className={`ms__tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}>
              My Sheets {sheets.length > 0 && <span className="ms__badge">{sheets.length}</span>}
            </button>
          </div>
        )}
      </div>

      {/* FLOW BAR */}
      <div className="ms__flow-bar">
        {["1. Select project & milestone", "2. Enter dimensions", "3. Add deductions", "4. Push to BOQ"].map((s, i, arr) => (
          <React.Fragment key={i}>
            <div className="ms__flow-step"><span className="ms__flow-label">{s}</span></div>
            {i < arr.length - 1 && <span className="ms__flow-arrow">›</span>}
          </React.Fragment>
        ))}
      </div>

      {apiError && <div className="ms__api-error">⚠️ {apiError}</div>}

      <div className="ms__body">

        {/* ══ CREATE TAB ══ */}
        {tab === "create" && (
          <>
            {editingId && (
              <div className="ms__edit-banner">
                <span>✏️ Editing measurement sheet</span>
                <button className="ms__cancel-edit"
                  onClick={() => { resetForm(); setTab("list"); }}>✕ Cancel</button>
              </div>
            )}

            {/* Step 1 — Project, Milestone, Title */}
            <div className="ms__block">
              <div className="ms__block-label">
                <span className="ms__num">1</span> Project, Milestone &amp; Sheet Details
              </div>
              <div className="ms__selectors">
                <div className="ms__sel-group">
                  <label className="ms__sel-label">Project</label>
                  <select className="ms__select" value={project}
                    onChange={(e) => setProject(e.target.value)}
                    disabled={projects.length === 0}>
                    <option value="">{projects.length === 0 ? "Loading…" : "— Choose project —"}</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="ms__sel-group">
                  <label className="ms__sel-label">Milestone (WBS)</label>
                  <select className="ms__select" value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    disabled={!project || milestonesLoading}>
                    <option value="">
                      {milestonesLoading ? "Loading…" : !project ? "— Select project first —"
                        : milestones.length === 0 ? "No milestones" : "— Choose milestone —"}
                    </option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>{m.code ? `${m.code} · ` : ""}{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ms__sel-group">
                  <label className="ms__sel-label">Sheet Title</label>
                  <input className="ms__inp" placeholder="e.g. Floor tiling — Block A"
                    value={sheetTitle} onChange={(e) => setSheetTitle(e.target.value)} />
                </div>
                <div className="ms__sel-group ms__sel-group--sm">
                  <label className="ms__sel-label">Unit</label>
                  <select className="ms__select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2 — Dimension rows */}
            <div className="ms__block">
              <div className="ms__block-label">
                <span className="ms__num">2</span> Dimension Entries
                <span className="ms__formula-hint">Qty = L × W × H × Nos</span>
                <div className="ms__add-btns">
                  <button className="ms__add-btn" onClick={() => addRow(false)}>+ Add Row</button>
                  <button className="ms__add-btn ms__add-btn--deduct" onClick={() => addRow(true)}>
                    − Add Deduction
                  </button>
                </div>
              </div>

              <div className="ms__table-scroll">
                <table className="ms__table">
                  <colgroup>
                    <col style={{width:"36px"}}/><col/>
                    <col style={{width:"80px"}}/><col style={{width:"80px"}}/>
                    <col style={{width:"80px"}}/><col style={{width:"60px"}}/>
                    <col style={{width:"110px"}}/><col style={{width:"36px"}}/>
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th><th>Description</th>
                      <th>L (m)</th><th>W (m)</th><th>H (m)</th><th>Nos</th>
                      <th>Quantity ({unit})</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id} className={row.isDeduction ? "ms__deduct-row" : ""}>
                        <td className="td-num">
                          {row.isDeduction ? <span className="ms__d-badge">D</span> : i + 1}
                        </td>
                        <td>
                          <input
                            className="ms__inp ms__inp--full"
                            placeholder={row.isDeduction ? "e.g. Deduct door opening" : "e.g. Floor tiling — Room A"}
                            value={row.description}
                            onChange={(e) => changeRow(row.id, "description", e.target.value)}
                          />
                        </td>
                        <td>
                          <input className="ms__inp ms__inp--n" type="number" min="0" step="0.01"
                            placeholder="0.00" value={row.length}
                            onChange={(e) => changeRow(row.id, "length", e.target.value)} />
                        </td>
                        <td>
                          <input className="ms__inp ms__inp--n" type="number" min="0" step="0.01"
                            placeholder="0.00" value={row.width}
                            onChange={(e) => changeRow(row.id, "width", e.target.value)} />
                        </td>
                        <td>
                          <input className="ms__inp ms__inp--n" type="number" min="0" step="0.01"
                            placeholder="0.00" value={row.height}
                            onChange={(e) => changeRow(row.id, "height", e.target.value)} />
                        </td>
                        <td>
                          <input className="ms__inp ms__inp--n" type="number" min="1" step="1"
                            placeholder="1" value={row.nos}
                            onChange={(e) => changeRow(row.id, "nos", e.target.value)} />
                        </td>
                        <td className={row.isDeduction ? "td-deduct" : "td-qty"}>
                          {row.isDeduction ? "− " : ""}{fmtN(calcQty(row))}
                        </td>
                        <td>
                          <button className="ms__del" onClick={() => removeRow(row.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary bar */}
              <div className="ms__summary-bar">
                <div className="ms__sum-card">
                  <span className="ms__sum-lbl">Gross ({unit})</span>
                  <span className="ms__sum-val">{fmtN(grossQty)}</span>
                </div>
                <div className="ms__sum-card ms__sum-card--deduct">
                  <span className="ms__sum-lbl">Deductions ({unit})</span>
                  <span className="ms__sum-val">− {fmtN(deductQty)}</span>
                </div>
                <div className="ms__sum-card ms__sum-card--net">
                  <span className="ms__sum-lbl">Net Quantity ({unit})</span>
                  <span className="ms__sum-val ms__sum-val--big">{fmtN(netQty)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="ms__footer-row">
              <div className="ms__net-display">
                <span className="ms__net-lbl">Net Quantity</span>
                <span className="ms__net-val">{fmtN(netQty)} <span className="ms__net-unit">{unit}</span></span>
              </div>
              <button className="ms__submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving…" : editingId ? "Update Sheet →" : "Save Sheet →"}
              </button>
            </div>
          </>
        )}

        {/* ══ LIST TAB ══ */}
        {tab === "list" && (
          <>
            <div className="ms__view-head">
              <h2 className="ms__view-h">My Measurement Sheets</h2>
            </div>

            <div className="ms__filter-bar">
              <div className="ms__range-btns">
                <span className="ms__range-label">📅 Show:</span>
                {[{l:"Today",d:0},{l:"1 Week",d:7},{l:"1 Month",d:30},{l:"3 Months",d:90}].map(({l,d}) => {
                  const from = new Date(); from.setDate(from.getDate()-d);
                  const isActive = filterFrom===from.toISOString().split("T")[0] && filterTo===new Date().toISOString().split("T")[0];
                  return <button key={l} className={`ms__range-btn ${isActive?"active":""}`} onClick={()=>setRange(d)}>{l}</button>;
                })}
                <button className="ms__range-btn" onClick={()=>{setFilterFrom("");setFilterTo("");}}>All Time</button>
              </div>
              <div className="ms__date-range">
                <span className="ms__date-range-label">From</span>
                <input type="date" className="ms__date-input" value={filterFrom} onChange={(e)=>setFilterFrom(e.target.value)}/>
                <span className="ms__date-range-label">To</span>
                <input type="date" className="ms__date-input" value={filterTo} onChange={(e)=>setFilterTo(e.target.value)}/>
              </div>
              <select className="ms__select ms__select--sm" value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}>
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {sheetsLoading ? (
              <div className="ms__loading"><div className="ms__spinner"/>Loading sheets…</div>
            ) : filtered.length === 0 ? (
              <div className="ms__empty">
                <span>📐</span>
                <p>No measurement sheets yet.</p>
                <button className="ms__ghost-btn" onClick={() => setTab("create")}>
                  Create your first sheet →
                </button>
              </div>
            ) : (
              <div className="ms__cards-list">
                {filtered.map((sheet) => (
                  <div key={sheet.id} className="ms__card">
                    <div className="ms__card-top">
                      <div>
                        <div className="ms__card-proj">{sheet.projectName}</div>
                        <div className="ms__card-meta">
                          🏗️ {sheet.milestoneName} &nbsp;·&nbsp;
                          📋 {sheet.sheetTitle} &nbsp;·&nbsp;
                          📅 {sheet.date}
                        </div>
                      </div>
                      <div className="ms__card-right">
                        <div className="ms__card-net">
                          {fmtN(sheet.netQty)} <span className="ms__card-unit">{sheet.unit}</span>
                        </div>
                        <div className="ms__card-breakdown">
                          <span className="ms__bp ms__bp--gross">Gross {fmtN(sheet.grossQty)}</span>
                          {sheet.deductQty > 0 && (
                            <span className="ms__bp ms__bp--deduct">−{fmtN(sheet.deductQty)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ms__card-actions">
                      <button className="ms__view-btn" onClick={() => openDetail(sheet)}>👁 View</button>
                      <button className="ms__edit-btn" onClick={() => handleEdit(sheet)}>✏️ Edit</button>
                      <button className="ms__push-btn" onClick={() => openPushModal(sheet)}>
                        🔗 Push to BOQ
                      </button>
                      <button className="ms__export-btn" onClick={() => exportCSV(sheet)}>⬇ CSV</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ DETAIL TAB ══ */}
        {tab === "detail" && viewingSheet && (
          <div className="ms__detail">
            <div className="ms__detail-infobar">
              {[
                { label: "Project",   value: viewingSheet.projectName },
                { label: "Milestone", value: `🏗️ ${viewingSheet.milestoneName}` },
                { label: "Sheet",     value: viewingSheet.sheetTitle },
                { label: "Unit",      value: viewingSheet.unit },
                { label: "Created",   value: viewingSheet.date },
                ...(viewingSheet.updatedDate ? [{ label: "Updated", value: viewingSheet.updatedDate }] : []),
              ].map((item, i) => (
                <div key={i} className="ms__detail-infoitem">
                  <span className="ms__detail-infolbl">{item.label}</span>
                  <span className="ms__detail-infoval">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Dimension table — read only */}
            <div className="ms__block">
              <div className="ms__block-label">
                <span className="ms__num">📋</span> Measurement Entries
              </div>
              <div className="ms__table-scroll">
                <table className="ms__table">
                  <colgroup>
                    <col style={{width:"36px"}}/><col/>
                    <col style={{width:"80px"}}/><col style={{width:"80px"}}/>
                    <col style={{width:"80px"}}/><col style={{width:"60px"}}/>
                    <col style={{width:"110px"}}/>
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th><th>Description</th>
                      <th>L (m)</th><th>W (m)</th><th>H (m)</th><th>Nos</th>
                      <th>Qty ({viewingSheet.unit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingSheet.rows || []).map((r, i) => (
                      <tr key={i} className={r.isDeduction ? "ms__deduct-row" : ""}>
                        <td className="td-num">
                          {r.isDeduction ? <span className="ms__d-badge">D</span> : i + 1}
                        </td>
                        <td>{r.description}</td>
                        <td className="td-mono">{r.length || "—"}</td>
                        <td className="td-mono">{r.width  || "—"}</td>
                        <td className="td-mono">{r.height || "—"}</td>
                        <td className="td-mono">{r.nos    || 1}</td>
                        <td className={r.isDeduction ? "td-deduct" : "td-qty"}>
                          {r.isDeduction ? "− " : ""}{fmtN(r.qty || calcQty(r))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="tfoot-lbl">Net Quantity</td>
                      <td className="tfoot-val">{fmtN(viewingSheet.netQty)} {viewingSheet.unit}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary cards */}
              <div className="ms__summary-bar">
                <div className="ms__sum-card">
                  <span className="ms__sum-lbl">Gross ({viewingSheet.unit})</span>
                  <span className="ms__sum-val">{fmtN(viewingSheet.grossQty)}</span>
                </div>
                <div className="ms__sum-card ms__sum-card--deduct">
                  <span className="ms__sum-lbl">Deductions</span>
                  <span className="ms__sum-val">− {fmtN(viewingSheet.deductQty)}</span>
                </div>
                <div className="ms__sum-card ms__sum-card--net">
                  <span className="ms__sum-lbl">Net ({viewingSheet.unit})</span>
                  <span className="ms__sum-val ms__sum-val--big">{fmtN(viewingSheet.netQty)}</span>
                </div>
              </div>
            </div>

            <div className="ms__detail-actions">
              <button className="ms__ghost-btn"
                onClick={() => { setViewingSheet(null); setTab("list"); }}>
                ← Back
              </button>
              <div style={{display:"flex", gap:"10px", flexWrap:"wrap"}}>
                <button className="ms__edit-btn ms__edit-btn--lg" onClick={() => handleEdit(viewingSheet)}>
                  ✏️ Edit Sheet
                </button>
                <button className="ms__push-btn ms__push-btn--lg" onClick={() => openPushModal(viewingSheet)}>
                  🔗 Push to BOQ
                </button>
                <button className="ms__export-btn" onClick={() => exportCSV(viewingSheet)}>
                  ⬇ Export CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ PUSH TO BOQ MODAL ══ */}
      {pushModal && viewingSheet && (
        <div className="ms__modal-overlay">
          <div className="ms__modal">
            <div className="ms__modal-header">
              <span className="ms__modal-icon">🔗</span>
              <div>
                <div className="ms__modal-title">Push to BOQ</div>
                <div className="ms__modal-sub">
                  Net qty: <strong>{fmtN(viewingSheet.netQty)} {viewingSheet.unit}</strong> will be added as a BOQ row
                </div>
              </div>
            </div>

            <div className="ms__modal-body">
              <div className="ms__modal-section-label">Where to add?</div>

              <label className="ms__modal-option">
                <input type="radio" name="target" value="new"
                  checked={pushTarget === "new"}
                  onChange={() => setPushTarget("new")} />
                <div>
                  <div className="ms__modal-opt-title">Create new BOQ row</div>
                  <div className="ms__modal-opt-sub">Opens BOQ form pre-filled with this quantity</div>
                </div>
              </label>

              {existingBoqs.length > 0 && (
                <>
                  <div className="ms__modal-divider">or add to existing BOQ</div>
                  {existingBoqs.map((boq) => (
                    <label key={boq.id} className="ms__modal-option">
                      <input type="radio" name="target" value={boq.id}
                        checked={String(pushTarget) === String(boq.id)}
                        onChange={() => setPushTarget(boq.id)} />
                      <div>
                        <div className="ms__modal-opt-title">{boq.projectName} · {boq.milestoneName}</div>
                        <div className="ms__modal-opt-sub">BOQ #{boq.id} · ₹ {fmtN(boq.grandTotal)} · {boq.date}</div>
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>

            <div className="ms__modal-actions">
              <button className="ms__modal-cancel"
                onClick={() => { setPushModal(false); }}>Cancel</button>
              <button className="ms__modal-submit" onClick={handlePush} disabled={pushLoading}>
                {pushLoading ? "Pushing…" : "🔗 Push to BOQ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}