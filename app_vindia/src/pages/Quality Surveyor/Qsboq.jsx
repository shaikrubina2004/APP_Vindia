import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./Qsboq.css";

const API    = "/api/boq";
const CR_API = "/api/cost-report";
const QR_API = "/api/quantity-report";

const STATUS = {
  pending_pm: { label: "Awaiting PM Approval", color: "amber", icon: "⏳" },
  pending_se: { label: "Awaiting SE Approval", color: "blue",  icon: "⏳" },
  finalised:  { label: "Finalised",            color: "green", icon: "✅" },
  rejected:   { label: "Changes Requested",    color: "red",   icon: "↩️" },
};

const UNITS        = ["m³", "m²", "m", "kg", "nos", "ltr", "ton", "bag", "rft"];
const LABOUR_TYPES = [
  "Mason", "Helper / Unskilled", "Carpenter", "Bar Bender",
  "Electrician", "Plumber", "Painter", "Welder",
  "Machine Operator", "Supervisor", "Other",
];

const uid         = () => Math.random().toString(36).substr(2, 9);
const blank       = () => ({ id: uid(), material: "", unit: "m²", quantity: "", unitPrice: "" });
const blankLabour = () => ({ id: uid(), labourType: "", workers: "", workingDays: "", dailyWage: "" });
const fmtN        = (n) => parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const safeArr = (val) => {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch (_) { return []; }
  }
  return [];
};

export default function Qsboq() {

  const location = useLocation();

  // ── UI ──
  const [tab,        setTab]        = useState("create");
  const [toast,      setToast]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState(null);

  // ── Dropdowns ──
  const [projects,           setProjects]           = useState([]);
  const [milestones,         setMilestones]         = useState([]);
  const [milestonesLoading,  setMilestonesLoading]  = useState(false);

  // ── Create / Edit form ──
  const [project,      setProject]      = useState("");
  const [milestone,    setMilestone]    = useState("");
  const [rows,         setRows]         = useState([blank(), blank()]);
  const [labourRows,   setLabourRows]   = useState([blankLabour(), blankLabour()]);
  const [editingId,    setEditingId]    = useState(null);

  // ── List ──
  const [boqs,          setBoqs]          = useState([]);
  const [boqsLoading,   setBoqsLoading]   = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterFrom,    setFilterFrom]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [filterTo, setFilterTo] = useState(() => new Date().toISOString().split("T")[0]);

  // ── Detail ──
  const [viewingBoq,      setViewingBoq]      = useState(null);
  const [crStatus,        setCrStatus]        = useState(null);
  const [qrStatus,        setQrStatus]        = useState(null);
  const [crComment,       setCrComment]       = useState("");
  const [qrComment,       setQrComment]       = useState("");
  const [reportsLoading,  setReportsLoading]  = useState(false);
  const [creatingReports, setCreatingReports] = useState(false);
  const [sentToSeIds,     setSentToSeIds]     = useState([]);

  // ── Read pre-fill params from Measurement "Push to BOQ" ──
  useEffect(() => {
    const params      = new URLSearchParams(location.search);
    const preProject  = params.get("projectId");
    const preMilestone = params.get("milestoneId");
    const preMaterial = params.get("material");
    const preQty      = params.get("qty");
    const preUnit     = params.get("unit");

    if (preProject && preMaterial) {
      setProject(preProject);
      setTab("create");
      if (preQty && preUnit) {
        setRows([{
          id:        uid(),
          material:  decodeURIComponent(preMaterial),
          unit:      decodeURIComponent(preUnit),
          quantity:  preQty,
          unitPrice: "",
        }, blank()]);
      }
      if (preMilestone) {
        sessionStorage.setItem("boq_prefill_milestone", preMilestone);
      }
    }
  }, [location.search]);

  // ── Set milestone once milestones have loaded from pre-fill ──
  useEffect(() => {
    const stored = sessionStorage.getItem("boq_prefill_milestone");
    if (stored && milestones.length > 0) {
      const found = milestones.find((m) => String(m.id) === String(stored));
      if (found) {
        setMilestone(String(found.id));
        sessionStorage.removeItem("boq_prefill_milestone");
      }
    }
  }, [milestones]);

  const markSentToSe = (boqId) => {
    setSentToSeIds((prev) => [...new Set([...prev, boqId])]);
    notify("🚀 BOQ sent to Site Engineer successfully!");
  };

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Material row helpers ──
  const change        = (id, field, val) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const rowTotal      = (r) => (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0);
  const materialTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  // ── Labour row helpers ──
  const changeLabour   = (id, field, val) => setLabourRows((p) => p.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const labourRowTotal = (r) =>
    (parseInt(r.workers) || 0) * (parseInt(r.workingDays) || 0) * (parseFloat(r.dailyWage) || 0);
  const labourTotal    = labourRows.reduce((s, r) => s + labourRowTotal(r), 0);

  const grandTotal = materialTotal + labourTotal;

  // ═══════════════════════════════════════════════════════════════
  //  FETCH — Projects
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/projects`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setProjects(data);
      } catch (err) {
        setApiError("Could not load projects: " + err.message);
      }
    })();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  FETCH — Milestones
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!project) { setMilestones([]); setMilestone(""); return; }
    (async () => {
      setMilestonesLoading(true);
      setMilestone("");
      try {
        const res  = await fetch(`${API}/milestones/${project}`);
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

  // ═══════════════════════════════════════════════════════════════
  //  FETCH — BOQ list
  // ═══════════════════════════════════════════════════════════════
  const fetchBoqs = useCallback(async () => {
    setBoqsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.append("projectId", filterProject);
      if (filterStatus)  params.append("status",    filterStatus);
      const res  = await fetch(`${API}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setBoqs(data);
    } catch (err) {
      notify("Could not load BOQs: " + err.message, "error");
    } finally {
      setBoqsLoading(false);
    }
  }, [filterProject, filterStatus]);

  useEffect(() => { if (tab === "list") fetchBoqs(); }, [tab, fetchBoqs]);

  // ═══════════════════════════════════════════════════════════════
  //  FETCH — Linked reports for detail view
  // ═══════════════════════════════════════════════════════════════
  const fetchReportStatuses = async (boqId) => {
    setReportsLoading(true);
    setCrStatus(null); setQrStatus(null); setCrComment(""); setQrComment("");
    try {
      const [crRes, qrRes] = await Promise.all([
        fetch(`${CR_API}?boqId=${boqId}`),
        fetch(`${QR_API}?boqId=${boqId}`),
      ]);
      const crData = await crRes.json();
      const qrData = await qrRes.json();
      if (Array.isArray(crData) && crData.length > 0) { setCrStatus(crData[0].status); setCrComment(crData[0].pmComment || ""); }
      if (Array.isArray(qrData) && qrData.length > 0) { setQrStatus(qrData[0].status); setQrComment(qrData[0].seComment || ""); }
    } catch (_) {}
    finally { setReportsLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════
  //  SUBMIT BOQ
  // ═══════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    if (!project)   return notify("Please select a project.", "error");
    if (!milestone) return notify("Please select a milestone.", "error");
    if (rows.some((r) => !r.material || !r.quantity || !r.unitPrice))
      return notify("Please fill in all material row fields.", "error");

    const filledLabour = labourRows.filter((r) => r.labourType || r.workers || r.workingDays || r.dailyWage);
    if (filledLabour.some((r) => !r.labourType || !r.workers || !r.workingDays || !r.dailyWage))
      return notify("Please complete all labour row fields or remove empty ones.", "error");

    const milestoneObj = milestones.find((m) => String(m.id) === String(milestone));
    if (!milestoneObj) return notify("Invalid milestone selected.", "error");

    const payload = {
      projectId:     parseInt(project),
      milestoneId:   milestoneObj.id,
      milestoneName: milestoneObj.name,
      rows: rows.map((r) => ({
        ...r,
        total:     rowTotal(r),
        quantity:  parseFloat(r.quantity),
        unitPrice: parseFloat(r.unitPrice),
      })),
      labourRows: filledLabour.map((r) => ({
        ...r,
        workers:     parseInt(r.workers),
        workingDays: parseInt(r.workingDays),
        dailyWage:   parseFloat(r.dailyWage),
        total:       labourRowTotal(r),
      })),
      materialTotal,
      labourTotal,
      grandTotal,
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
        if (!res.ok) throw new Error(data.error || "Failed to update BOQ");
        notify("BOQ updated ✓ — now create Cost & Quantity Reports");
        setEditingId(null);
      } else {
        res  = await fetch(API, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create BOQ");
        notify("BOQ created ✓ — now create Cost & Quantity Reports");
      }
      setRows([blank(), blank()]);
      setLabourRows([blankLabour(), blankLabour()]);
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
  //  CREATE COST REPORT
  // ═══════════════════════════════════════════════════════════════
  const handleCreateReports = async (boq) => {
    setCreatingReports(true);
    try {
      const projObj        = projects.find((p) => String(p.id) === String(boq.projectId));
      const safeLabourRows = safeArr(boq.labourRows);
      const crPayload = {
        projectId:     boq.projectId,
        projectName:   boq.projectName || projObj?.name,
        milestoneId:   boq.milestoneId,
        milestoneName: boq.milestoneName,
        boqId:         boq.id,
        items: safeArr(boq.rows).map((r) => ({
          material:  r.material, unit: r.unit,
          quantity:  parseFloat(r.quantity), unitPrice: parseFloat(r.unitPrice),
          total:     parseFloat(r.total || 0),
        })),
        labourItems: safeLabourRows.map((r) => ({
          labourType:  r.labourType,
          workers:     parseInt(r.workers),
          workingDays: parseInt(r.workingDays),
          dailyWage:   parseFloat(r.dailyWage),
          total:       parseFloat(r.total || 0),
        })),
        materialTotal: parseFloat(boq.materialTotal || boq.grandTotal),
        labourTotal:   parseFloat(boq.labourTotal || 0),
        totalCost:     parseFloat(boq.grandTotal),
      };

      const crRes  = await fetch(CR_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crPayload),
      });
      const crData = await crRes.json();
      const crOk   = crRes.ok || crRes.status === 409;
      if (!crOk) throw new Error("Cost Report: " + (crData.error || "Failed"));

      notify(crRes.status === 409 ? "Reports already created ✓" : "Cost Report created & sent to PM ✓");
      fetchBoqs();
      if (viewingBoq?.id === boq.id) { fetchReportStatuses(boq.id); refreshDetail(boq.id); }
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setCreatingReports(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  CREATE QUANTITY REPORT
  // ═══════════════════════════════════════════════════════════════
  const handleCreateQtyReport = async (boq) => {
    setCreatingReports(true);
    try {
      const projObj        = projects.find((p) => String(p.id) === String(boq.projectId));
      const safeLabourRows = safeArr(boq.labourRows);
      const qrPayload = {
        projectId:     boq.projectId,
        projectName:   boq.projectName || projObj?.name,
        milestoneId:   boq.milestoneId,
        milestoneName: boq.milestoneName,
        boqId:         boq.id,
        items: safeArr(boq.rows).map((r) => ({
          material: r.material, unit: r.unit, quantity: parseFloat(r.quantity),
        })),
        labourItems: safeLabourRows.map((r) => ({
          labourType: r.labourType, workers: parseInt(r.workers), workingDays: parseInt(r.workingDays),
        })),
        totalItems: safeArr(boq.rows).length,
      };

      const qrRes  = await fetch(QR_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qrPayload),
      });
      const qrData = await qrRes.json();
      if (!qrRes.ok && qrRes.status !== 409) throw new Error("Qty Report: " + (qrData.error || "Failed"));

      notify(qrRes.status === 409 ? "Qty Report already created ✓" : "Qty Report created & sent to SE ✓");
      fetchBoqs();
      if (viewingBoq?.id === boq.id) { fetchReportStatuses(boq.id); refreshDetail(boq.id); }
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setCreatingReports(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  EDIT
  // ═══════════════════════════════════════════════════════════════
  const handleEdit = (boq) => {
    setProject(String(boq.projectId));
    setMilestone(String(boq.milestoneId));
    setRows(safeArr(boq.rows).map((r) => ({ ...r, id: r.id || uid() })));
    const lr = safeArr(boq.labourRows);
    setLabourRows(
      lr.length > 0
        ? lr.map((r) => ({ ...r, id: r.id || uid() }))
        : [blankLabour(), blankLabour()]
    );
    setEditingId(boq.id);
    setTab("create");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRows([blank(), blank()]);
    setLabourRows([blankLabour(), blankLabour()]);
    setProject("");
    setMilestone("");
  };

  // ═══════════════════════════════════════════════════════════════
  //  DETAIL
  // ═══════════════════════════════════════════════════════════════
  const openDetail = async (boq) => {
    setTab("detail");
    setViewingBoq({
      ...boq,
      labourRows:    safeArr(boq.labourRows),
      labourTotal:   boq.labourTotal   || 0,
      materialTotal: boq.materialTotal || boq.grandTotal,
    });
    fetchReportStatuses(boq.id);
    refreshDetail(boq.id);
  };

  const refreshDetail = async (id) => {
    try {
      const res  = await fetch(`${API}/${id}`);
      const data = await res.json();
      if (res.ok) {
        setViewingBoq({
          ...data,
          labourRows:    safeArr(data.labourRows),
          labourTotal:   data.labourTotal   || 0,
          materialTotal: data.materialTotal || data.grandTotal,
        });
      }
    } catch (_) {}
  };

  const closeDetail = () => { setViewingBoq(null); setCrStatus(null); setQrStatus(null); setTab("list"); };

  // ═══════════════════════════════════════════════════════════════
  //  EXPORT CSV
  // ═══════════════════════════════════════════════════════════════
  const exportCSV = (boq) => {
    const safeLabourRows = safeArr(boq.labourRows);
    const matLines = [
      ["--- MATERIALS ---"].join(","),
      ["Material", "Unit", "Quantity", "Unit Price (₹)", "Total (₹)"].join(","),
      ...safeArr(boq.rows).map((r) =>
        [r.material, r.unit, r.quantity, r.unitPrice, parseFloat(r.total || 0).toFixed(2)].join(",")
      ),
      `,,,,Material Total,${parseFloat(boq.materialTotal || boq.grandTotal).toFixed(2)}`,
      "",
    ];
    const labLines = safeLabourRows.length > 0 ? [
      ["--- LABOUR ---"].join(","),
      ["Labour Type", "Workers", "Working Days", "Daily Wage (₹)", "Total Wage (₹)"].join(","),
      ...safeLabourRows.map((r) =>
        [r.labourType, r.workers, r.workingDays, r.dailyWage, parseFloat(r.total || 0).toFixed(2)].join(",")
      ),
      `,,,,Labour Total,${parseFloat(boq.labourTotal || 0).toFixed(2)}`,
      "",
    ] : [];
    const footer = [`,,,,Grand Total,${parseFloat(boq.grandTotal).toFixed(2)}`];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([[...matLines, ...labLines, ...footer].join("\n")], { type: "text/csv" })
    );
    a.download = `BOQ_${boq.projectName.replace(/ /g, "_")}_${boq.milestoneName}.csv`;
    a.click();
  };

  // ── Date helpers ──
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    const parts = String(dateStr).trim().split(/\s+/);
    if (parts.length === 3 && months[parts[1]] !== undefined)
      return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]), 12, 0, 0);
    if (String(dateStr).includes("-")) {
      const [y, m, d] = String(dateStr).split("T")[0].split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    return null;
  };

  const filtered = boqs.filter((b) => {
    if (filterProject && String(b.projectId) !== String(filterProject)) return false;
    if (filterStatus  && b.status !== filterStatus) return false;
    if (filterFrom || filterTo) {
      const boqDate = parseDate(b.date);
      if (boqDate) {
        if (filterFrom) { const [fy,fm,fd] = filterFrom.split("-").map(Number); if (boqDate < new Date(fy,fm-1,fd)) return false; }
        if (filterTo)   { const [ty,tm,td] = filterTo.split("-").map(Number);   if (boqDate > new Date(ty,tm-1,td,23,59,59)) return false; }
      }
    }
    return true;
  });

  const setRange = (days) => {
    const to = new Date(), from = new Date();
    from.setDate(from.getDate() - days);
    setFilterFrom(from.toISOString().split("T")[0]);
    setFilterTo(to.toISOString().split("T")[0]);
  };

  // ── Labour table ──
  const LabourTable = ({ labRows, editable = false }) => {
    const safeRows = safeArr(labRows);
    const tot = safeRows.reduce((s, r) => s + labourRowTotal(r), 0);
    return (
      <div className="boq__table-scroll">
        <table className="boq__table">
          <colgroup>
            <col style={{width:"44px"}} /><col />
            <col style={{width:"88px"}} /><col style={{width:"110px"}} />
            <col style={{width:"138px"}} /><col style={{width:"138px"}} />
            {editable && <col style={{width:"44px"}} />}
          </colgroup>
          <thead>
            <tr>
              <th>#</th><th>Labour Type</th><th>Workers</th>
              <th>Working Days</th><th>Daily Wage (₹)</th><th>Total Wage (₹)</th>
              {editable && <th></th>}
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row, i) => editable ? (
              <tr key={row.id}>
                <td className="td-num">{i + 1}</td>
                <td>
                  <select className="boq__inp boq__inp--sel" value={row.labourType}
                    onChange={(e) => changeLabour(row.id, "labourType", e.target.value)}>
                    <option value="">— Select labour type —</option>
                    {LABOUR_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td>
                  <input className="boq__inp boq__inp--n" type="number" min="1"
                    placeholder="0" value={row.workers}
                    onChange={(e) => changeLabour(row.id, "workers", e.target.value)} />
                </td>
                <td>
                  <input className="boq__inp boq__inp--n" type="number" min="1"
                    placeholder="0" value={row.workingDays}
                    onChange={(e) => changeLabour(row.id, "workingDays", e.target.value)} />
                </td>
                <td>
                  <input className="boq__inp boq__inp--n" type="number" min="0"
                    placeholder="0.00" value={row.dailyWage}
                    onChange={(e) => changeLabour(row.id, "dailyWage", e.target.value)} />
                </td>
                <td className="td-labour-total">₹ {fmtN(labourRowTotal(row))}</td>
                <td>
                  <button className="boq__del"
                    onClick={() => labourRows.length > 1 && setLabourRows((p) => p.filter((r) => r.id !== row.id))}>✕</button>
                </td>
              </tr>
            ) : (
              <tr key={row.id || i}>
                <td className="td-num">{i + 1}</td>
                <td><strong>{row.labourType}</strong></td>
                <td className="td-num">{parseInt(row.workers || 0).toLocaleString("en-IN")}</td>
                <td className="td-num">{parseInt(row.workingDays || 0).toLocaleString("en-IN")}</td>
                <td className="td-num">₹ {parseFloat(row.dailyWage || 0).toLocaleString("en-IN")}</td>
                <td className="td-labour-total">₹ {fmtN(row.total || labourRowTotal(row))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="tfoot-lbl">Total Labour Cost</td>
              <td className="tfoot-val">₹ {fmtN(tot)}</td>
              {editable && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="boq">
      {toast && <div className={`boq__toast boq__toast--${toast.type}`}>{toast.msg}</div>}

      {/* HEADER */}
      <div className="boq__header">
        <div className="boq__header-left">
          {tab === "detail" ? (
            <button className="boq__back-btn" onClick={closeDetail}>← Back</button>
          ) : (
            <div className="boq__header-icon">📋</div>
          )}
          <div>
            <h1 className="boq__title">
              {tab === "detail" && viewingBoq
                ? `${viewingBoq.projectName} · ${viewingBoq.milestoneName}`
                : "Bill of Quantities"}
            </h1>
            <p className="boq__subtitle">Quantity Surveyor · BOQ Management</p>
          </div>
        </div>
        {tab !== "detail" && (
          <div className="boq__tabs">
            <button className={`boq__tab ${tab === "create" ? "active" : ""}`}
              onClick={() => { cancelEdit(); setTab("create"); }}>
              {editingId ? "✏️ Editing BOQ" : "+ Create BOQ"}
            </button>
            <button className={`boq__tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}>
              My BOQs {boqs.length > 0 && <span className="boq__badge">{boqs.length}</span>}
            </button>
          </div>
        )}
      </div>

      {/* FLOW STEPS */}
      <div className="boq__flow-bar">
        {["1. Create BOQ", "2. Create Reports", "3. PM Approves Cost", "4. SE Approves Qty", "5. BOQ Finalised"]
          .map((s, i, arr) => (
            <React.Fragment key={i}>
              <div className="boq__flow-step"><span className="boq__flow-label">{s}</span></div>
              {i < arr.length - 1 && <span className="boq__flow-arrow">›</span>}
            </React.Fragment>
          ))}
      </div>

      {apiError && <div className="boq__api-error">⚠️ {apiError}</div>}

      <div className="boq__body">

        {/* ══ CREATE / EDIT TAB ══ */}
        {tab === "create" && (
          <>
            {editingId && (
              <div className="boq__edit-banner">
                <span>✏️ Editing rejected BOQ — make changes based on the suggestion and resubmit.</span>
                <button className="boq__cancel-edit" onClick={() => { cancelEdit(); setTab("list"); }}>✕ Cancel</button>
              </div>
            )}

            {/* Pre-fill banner from Measurement */}
            {new URLSearchParams(location.search).get("material") && !editingId && (
              <div className="boq__prefill-banner">
                <span>📐</span>
                <span>Pre-filled from Measurement Sheet — add unit price to complete the BOQ row.</span>
              </div>
            )}

            {/* Step 1 */}
            <div className="boq__block">
              <div className="boq__block-label">
                <span className="boq__num">1</span> Select Project &amp; Milestone
              </div>
              <div className="boq__selectors">
                <div className="boq__sel-group">
                  <label className="boq__sel-label">Project</label>
                  <select className="boq__select" value={project}
                    onChange={(e) => setProject(e.target.value)} disabled={projects.length === 0}>
                    <option value="">{projects.length === 0 ? "Loading projects…" : "— Choose project —"}</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="boq__sel-group">
                  <label className="boq__sel-label">Milestone (WBS)</label>
                  <select className="boq__select" value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    disabled={!project || milestonesLoading}>
                    <option value="">
                      {milestonesLoading ? "Loading…" : !project ? "— Select project first —"
                        : milestones.length === 0 ? "No milestones found" : "— Choose milestone —"}
                    </option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>{m.code ? `${m.code} · ` : ""}{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {project && milestone && (() => {
                const proj = projects.find((p) => String(p.id) === String(project));
                const ms   = milestones.find((m) => String(m.id) === String(milestone));
                return proj && ms ? (
                  <div className="boq__proj-tag">📌 {proj.name} &nbsp;·&nbsp; 🏗️ {ms.name}</div>
                ) : null;
              })()}
            </div>

            {/* Step 2 — Materials */}
            <div className="boq__block">
              <div className="boq__block-label">
                <span className="boq__num">2</span> Material Cost
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
                          <input className="boq__inp" placeholder="e.g. M25 Concrete, Steel Bar…"
                            value={row.material} onChange={(e) => change(row.id, "material", e.target.value)} />
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
                        <td className="td-total">₹ {fmtN(rowTotal(row))}</td>
                        <td>
                          <button className="boq__del"
                            onClick={() => rows.length > 1 && setRows((p) => p.filter((r) => r.id !== row.id))}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="tfoot-lbl">Material Total</td>
                      <td className="tfoot-val">₹ {fmtN(materialTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Step 3 — Labour */}
            <div className="boq__block">
              <div className="boq__block-label">
                <span className="boq__num boq__num--blue">3</span> Labour Cost
                <button className="boq__add-btn boq__add-btn--blue"
                  onClick={() => setLabourRows((p) => [...p, blankLabour()])}>
                  + Add Labour
                </button>
              </div>
              <div className="boq__labour-hint">
                Total Wage = No. of Workers × Working Days × Daily Wage
              </div>
              <LabourTable labRows={labourRows} editable={true} />
            </div>

            {/* Grand Total + Submit */}
            <div className="boq__footer-row">
              <div className="boq__grand-breakdown">
                <div className="boq__grand-line">
                  <span className="boq__grand-lbl">Materials</span>
                  <span className="boq__grand-amt boq__grand-amt--mat">₹ {fmtN(materialTotal)}</span>
                </div>
                <div className="boq__grand-line">
                  <span className="boq__grand-lbl">Labour</span>
                  <span className="boq__grand-amt boq__grand-amt--lab">₹ {fmtN(labourTotal)}</span>
                </div>
                <div className="boq__grand-divider" />
                <div className="boq__grand-line">
                  <span className="boq__grand-lbl boq__grand-lbl--main">Grand Total</span>
                  <span className="boq__grand-amt">₹ {fmtN(grandTotal)}</span>
                </div>
              </div>
              <button className="boq__submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving…" : editingId ? "Update BOQ →" : "Save BOQ →"}
              </button>
            </div>
          </>
        )}

        {/* ══ LIST TAB ══ */}
        {tab === "list" && (
          <>
            <div className="boq__view-head">
              <h2 className="boq__view-h">My BOQs</h2>
            </div>

            <div className="boq__filter-bar">
              <div className="boq__range-btns">
                <span className="boq__range-label">📅 Show:</span>
                {[{label:"Today",days:0},{label:"1 Week",days:7},{label:"1 Month",days:30},{label:"3 Months",days:90}]
                  .map(({ label, days }) => {
                    const from = new Date(); from.setDate(from.getDate() - days);
                    const isActive = filterFrom === from.toISOString().split("T")[0] &&
                                     filterTo   === new Date().toISOString().split("T")[0];
                    return (
                      <button key={label} className={`boq__range-btn ${isActive ? "active" : ""}`}
                        onClick={() => setRange(days)}>{label}</button>
                    );
                  })}
                <button className="boq__range-btn" onClick={() => { setFilterFrom(""); setFilterTo(""); }}>All Time</button>
              </div>
              <div className="boq__date-range">
                <span className="boq__date-range-label">From</span>
                <input type="date" className="boq__date-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                <span className="boq__date-range-label">To</span>
                <input type="date" className="boq__date-input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
              </div>
              <div className="boq__filters">
                <select className="boq__select boq__select--sm" value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="boq__select boq__select--sm" value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {boqsLoading ? (
              <div className="boq__loading"><div className="boq__spinner" /> Loading BOQs…</div>
            ) : filtered.length === 0 ? (
              <div className="boq__empty">
                <span>📋</span>
                <p>No BOQs found.</p>
                <button className="boq__ghost-btn" onClick={() => setTab("create")}>Create your first BOQ →</button>
              </div>
            ) : (
              <div className="boq__cards-list">
                {filtered.map((boq) => {
                  const st = STATUS[boq.status] || STATUS.pending_pm;
                  return (
                    <div key={boq.id} className={`boq__card boq__card--${st.color}`}>
                      <div className="boq__card-top">
                        <div className="boq__card-info">
                          <div className="boq__card-proj">{boq.projectName}</div>
                          <div className="boq__card-meta">
                            🏗️ {boq.milestoneName} &nbsp;·&nbsp; 📅 {boq.date}
                            {boq.updatedDate && <span className="boq__updated"> · Updated {boq.updatedDate}</span>}
                          </div>
                        </div>
                        <div className="boq__card-right">
                          <div className="boq__card-total">₹ {fmtN(boq.grandTotal)}</div>
                          {boq.labourTotal > 0 && (
                            <div className="boq__card-cost-split">
                              <span className="boq__cost-pill boq__cost-pill--mat">Mat ₹{fmtN(boq.materialTotal || 0)}</span>
                              <span className="boq__cost-pill boq__cost-pill--lab">Lab ₹{fmtN(boq.labourTotal || 0)}</span>
                            </div>
                          )}
                          <span className={`boq__status-badge boq__status--${st.color}`}>{st.icon} {st.label}</span>
                        </div>
                      </div>

                      <div className="boq__card-reports">
                        <div className="boq__report-pill">
                          <span className="boq__report-pill-lbl">💰 Cost Report (PM)</span>
                          <span className={`boq__report-pill-val ${
                            boq.costReportStatus === "approved" ? "green"
                            : boq.costReportStatus === "rejected" ? "red"
                            : boq.costReportStatus ? "amber" : "grey"}`}>
                            {boq.costReportStatus === "approved" ? "✅ Approved"
                              : boq.costReportStatus === "rejected" ? "↩️ Rejected"
                              : boq.costReportStatus === "pending_pm" ? "⏳ Pending PM" : "— Not Created"}
                          </span>
                        </div>
                        <div className="boq__report-pill">
                          <span className="boq__report-pill-lbl">📐 Qty Report (SE)</span>
                          <span className={`boq__report-pill-val ${
                            boq.qtyReportStatus === "approved" ? "green"
                            : boq.qtyReportStatus === "rejected" ? "red"
                            : boq.qtyReportStatus ? "blue" : "grey"}`}>
                            {boq.qtyReportStatus === "approved" ? "✅ Approved"
                              : boq.qtyReportStatus === "rejected" ? "↩️ Rejected"
                              : boq.qtyReportStatus === "pending_se" ? "⏳ Pending SE" : "— Not Created"}
                          </span>
                        </div>
                      </div>

                      <div className="boq__card-actions">
                        <button className="boq__view-btn" onClick={() => openDetail(boq)}>👁 View BOQ</button>
                        {boq.status === "pending_pm" && !boq.costReportStatus && (
                          <button className="boq__create-reports-btn" onClick={() => handleCreateReports(boq)} disabled={creatingReports}>
                            {creatingReports ? "Creating…" : "📄 Create Cost Report"}
                          </button>
                        )}
                        {boq.status === "pending_se" && !boq.qtyReportStatus && (
                          <button className="boq__create-qty-btn" onClick={() => handleCreateQtyReport(boq)} disabled={creatingReports}>
                            {creatingReports ? "Creating…" : "📐 Create Qty Report"}
                          </button>
                        )}
                        {boq.status === "rejected" && (
                          <button className="boq__edit-btn" onClick={() => handleEdit(boq)}>✏️ Edit BOQ</button>
                        )}
                        {boq.status === "finalised" && (
                          <>
                            {sentToSeIds.includes(boq.id) || boq.sentToSE ? (
                              <div className="boq__card-sent-confirm">
                                <span className="boq__card-sent-icon">✅</span>
                                <span className="boq__card-sent-title">✅ Submitted to SE</span>
                              </div>
                            ) : (
                              <button className="boq__send-se-btn" onClick={() => markSentToSe(boq.id)}>🚀 Submit to SE</button>
                            )}
                            <button className="boq__export-btn" onClick={() => exportCSV(boq)}>⬇ Export CSV</button>
                          </>
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
        {tab === "detail" && viewingBoq && (() => {
          const boq              = viewingBoq;
          const st               = STATUS[boq.status] || STATUS.pending_pm;
          const detailLabourRows = safeArr(boq.labourRows);
          const hasLabour        = detailLabourRows.length > 0;

          return (
            <div className="boq__detail">
              <div className="boq__detail-infobar">
                <div className="boq__detail-infoitem"><span className="boq__detail-infolbl">Project</span><span className="boq__detail-infoval">{boq.projectName}</span></div>
                <div className="boq__detail-infoitem"><span className="boq__detail-infolbl">Milestone</span><span className="boq__detail-infoval">🏗️ {boq.milestoneName}</span></div>
                <div className="boq__detail-infoitem"><span className="boq__detail-infolbl">Created</span><span className="boq__detail-infoval">{boq.date}</span></div>
                {boq.updatedDate && <div className="boq__detail-infoitem"><span className="boq__detail-infolbl">Updated</span><span className="boq__detail-infoval">{boq.updatedDate}</span></div>}
                <div className="boq__detail-infoitem"><span className="boq__detail-infolbl">Status</span><span className={`boq__status-badge boq__status--${st.color}`}>{st.icon} {st.label}</span></div>
                {hasLabour && <div className="boq__detail-infoitem"><span className="boq__detail-infolbl">Materials</span><span className="boq__detail-infoval" style={{color:"#0b6e72"}}>₹ {fmtN(boq.materialTotal || 0)}</span></div>}
                {hasLabour && <div className="boq__detail-infoitem"><span className="boq__detail-infolbl">Labour</span><span className="boq__detail-infoval" style={{color:"#1d4ed8"}}>₹ {fmtN(boq.labourTotal || 0)}</span></div>}
              </div>

              {boq.status === "rejected" && (
                <div className="boq__rejection-box">
                  <div className="boq__rejection-box-title">↩️ Changes Requested — Please review the suggestions below and edit your BOQ</div>
                  <div className="boq__rejection-comments">
                    {(boq.pmNote || crComment) && (
                      <div className="boq__rejection-comment boq__rejection-comment--pm">
                        <div className="boq__rejection-comment-from">
                          <span className="boq__rejection-avatar boq__rejection-avatar--pm">PM</span>
                          <span>Project Manager — Cost Report</span>
                        </div>
                        <div className="boq__rejection-comment-text">{crComment || boq.pmNote}</div>
                      </div>
                    )}
                    {(boq.seNote || qrComment) && (
                      <div className="boq__rejection-comment boq__rejection-comment--se">
                        <div className="boq__rejection-comment-from">
                          <span className="boq__rejection-avatar boq__rejection-avatar--se">SE</span>
                          <span>Site Engineer — Quantity Report</span>
                        </div>
                        <div className="boq__rejection-comment-text">{qrComment || boq.seNote}</div>
                      </div>
                    )}
                    {!boq.pmNote && !crComment && !boq.seNote && !qrComment && (
                      <div className="boq__rejection-no-comment">No specific comments provided. Please review and resubmit.</div>
                    )}
                  </div>
                  <button className="boq__edit-inline" onClick={() => handleEdit(boq)}>✏️ Edit BOQ &amp; Resubmit</button>
                </div>
              )}

              {/* Approval tracker */}
              <div className="boq__block">
                <div className="boq__block-label"><span className="boq__num">📊</span> Approval Status</div>
                <div className="boq__approval-track">
                  {[
                    { label: "BOQ Created", done: true },
                    { label: "Cost Report → PM", done: crStatus === "approved", current: crStatus === "pending_pm", rejected: crStatus === "rejected",
                      sub: crStatus === "approved" ? "✅ PM Approved" : crStatus === "rejected" ? "↩️ PM Rejected" : crStatus === "pending_pm" ? "⏳ Waiting for PM" : "Not created yet" },
                    { label: "Qty Report → SE", done: qrStatus === "approved", current: qrStatus === "pending_se", rejected: qrStatus === "rejected",
                      sub: qrStatus === "approved" ? "✅ SE Approved" : qrStatus === "rejected" ? "↩️ SE Rejected" : qrStatus === "pending_se" ? "⏳ Waiting for SE" : "Not created yet" },
                    { label: "BOQ Finalised", done: boq.status === "finalised",
                      sub: boq.status === "finalised" ? `Sent to SE on ${boq.finalisedDate}` : "Pending both approvals" },
                  ].map((step, i, arr) => (
                    <React.Fragment key={i}>
                      <div className={`boq__ap-step ${step.done ? "done" : step.rejected ? "rejected" : step.current ? "active" : ""}`}>
                        <span className="boq__ap-dot">{step.done ? "✓" : step.rejected ? "✘" : i + 1}</span>
                        <span className="boq__ap-label">{step.label}</span>
                        {step.sub && <span className="boq__ap-sub">{step.sub}</span>}
                      </div>
                      {i < arr.length - 1 && <div className="boq__ap-line" />}
                    </React.Fragment>
                  ))}
                </div>
                {(crStatus === "rejected" || qrStatus === "rejected") && (
                  <div className="boq__approval-comments">
                    {crStatus === "rejected" && crComment && <div className="boq__approval-comment boq__approval-comment--pm"><strong>💬 PM Comment:</strong> {crComment}</div>}
                    {qrStatus === "rejected" && qrComment && <div className="boq__approval-comment boq__approval-comment--se"><strong>💬 SE Comment:</strong> {qrComment}</div>}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="boq__detail-action-bar">
                {boq.status === "pending_pm" && !crStatus && (
                  <button className="boq__create-reports-btn boq__create-reports-btn--lg" onClick={() => handleCreateReports(boq)} disabled={creatingReports}>
                    {creatingReports ? "Creating…" : "📄 Create Cost Report & Send to PM"}
                  </button>
                )}
                {boq.status === "pending_se" && !qrStatus && (
                  <button className="boq__create-qty-btn boq__create-qty-btn--lg" onClick={() => handleCreateQtyReport(boq)} disabled={creatingReports}>
                    {creatingReports ? "Creating…" : "📐 Create Quantity Report & Send to SE"}
                  </button>
                )}
                {boq.status === "rejected" && (
                  <button className="boq__edit-btn boq__edit-btn--lg" onClick={() => handleEdit(boq)}>✏️ Edit BOQ</button>
                )}
              </div>

              {/* Finalised */}
              {boq.status === "finalised" && (
                <>
                  <div className="boq__finalised-banner">
                    <span className="boq__finalised-icon">✅</span>
                    <div>
                      <div className="boq__finalised-title">BOQ Finalised</div>
                      <div className="boq__finalised-sub">Both Cost Report (PM) and Quantity Report (SE) approved. Finalised on {boq.finalisedDate}.</div>
                    </div>
                    <div className="boq__finalised-btns">
                      {sentToSeIds.includes(boq.id) || boq.sentToSE ? (
                        <div className="boq__sent-confirmation">
                          <span className="boq__sent-check">✅</span>
                          <div><div className="boq__sent-title">Submitted to Site Engineer</div><div className="boq__sent-sub">Site Engineer has received this BOQ for execution.</div></div>
                        </div>
                      ) : (
                        <button className="boq__send-se-btn" onClick={() => markSentToSe(boq.id)}>🚀 Submit to Site Engineer</button>
                      )}
                      <button className="boq__export-btn boq__export-btn--lg" onClick={() => exportCSV(boq)}>⬇ Export CSV</button>
                    </div>
                  </div>

                  <div className="boq__block">
                    <div className="boq__block-label"><span className="boq__num">📋</span> Final Bill of Quantities — Materials</div>
                    <div className="boq__table-scroll">
                      <table className="boq__table">
                        <colgroup><col style={{width:"44px"}}/><col/><col style={{width:"88px"}}/><col style={{width:"120px"}}/><col style={{width:"150px"}}/><col style={{width:"155px"}}/></colgroup>
                        <thead><tr><th>#</th><th>Material</th><th>Unit</th><th>Quantity</th><th>Unit Price (₹)</th><th>Total (₹)</th></tr></thead>
                        <tbody>
                          {safeArr(boq.rows).map((r, i) => (
                            <tr key={r.id || i}>
                              <td className="td-num">{i + 1}</td>
                              <td><strong>{r.material}</strong></td>
                              <td>{r.unit}</td>
                              <td className="td-num">{parseFloat(r.quantity).toLocaleString("en-IN")}</td>
                              <td className="td-num">₹ {parseFloat(r.unitPrice).toLocaleString("en-IN")}</td>
                              <td className="td-total">₹ {fmtN(r.total || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr><td colSpan={5} className="tfoot-lbl">Material Total</td><td className="tfoot-val">₹ {fmtN(boq.materialTotal || boq.grandTotal)}</td></tr></tfoot>
                      </table>
                    </div>
                  </div>

                  {hasLabour && (
                    <div className="boq__block">
                      <div className="boq__block-label"><span className="boq__num boq__num--blue">👷</span> Final Bill of Quantities — Labour</div>
                      <LabourTable labRows={detailLabourRows} editable={false} />
                    </div>
                  )}

                  <div className="boq__grand-summary">
                    <div className="boq__grand-summary-row"><span>Material Total</span><span className="boq__grand-summary-mat">₹ {fmtN(boq.materialTotal || boq.grandTotal)}</span></div>
                    {hasLabour && <div className="boq__grand-summary-row"><span>Labour Total</span><span className="boq__grand-summary-lab">₹ {fmtN(boq.labourTotal)}</span></div>}
                    <div className="boq__grand-summary-total"><span>Grand Total</span><span>₹ {fmtN(boq.grandTotal)}</span></div>
                  </div>
                </>
              )}

              {/* Pending tables */}
              {boq.status !== "finalised" && (
                <>
                  <div className="boq__block">
                    <div className="boq__block-label">
                      <span className="boq__num">📋</span> BOQ Items — Materials
                      <span className="boq__pending-note">Waiting for approvals</span>
                    </div>
                    <div className="boq__table-scroll">
                      <table className="boq__table">
                        <colgroup><col style={{width:"44px"}}/><col/><col style={{width:"88px"}}/><col style={{width:"120px"}}/><col style={{width:"150px"}}/><col style={{width:"155px"}}/></colgroup>
                        <thead><tr><th>#</th><th>Material</th><th>Unit</th><th>Quantity</th><th>Unit Price (₹)</th><th>Total (₹)</th></tr></thead>
                        <tbody>
                          {safeArr(boq.rows).map((r, i) => (
                            <tr key={r.id || i}>
                              <td className="td-num">{i + 1}</td>
                              <td>{r.material}</td><td>{r.unit}</td>
                              <td className="td-num">{parseFloat(r.quantity).toLocaleString("en-IN")}</td>
                              <td className="td-num">₹ {parseFloat(r.unitPrice).toLocaleString("en-IN")}</td>
                              <td className="td-total">₹ {fmtN(r.total || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr><td colSpan={5} className="tfoot-lbl">Material Total</td><td className="tfoot-val">₹ {fmtN(boq.materialTotal || boq.grandTotal)}</td></tr></tfoot>
                      </table>
                    </div>
                  </div>

                  {hasLabour && (
                    <div className="boq__block">
                      <div className="boq__block-label">
                        <span className="boq__num boq__num--blue">👷</span> BOQ Items — Labour
                        <span className="boq__pending-note">Waiting for approvals</span>
                      </div>
                      <LabourTable labRows={detailLabourRows} editable={false} />
                    </div>
                  )}

                  {hasLabour && (
                    <div className="boq__grand-summary">
                      <div className="boq__grand-summary-row"><span>Material Total</span><span className="boq__grand-summary-mat">₹ {fmtN(boq.materialTotal || 0)}</span></div>
                      <div className="boq__grand-summary-row"><span>Labour Total</span><span className="boq__grand-summary-lab">₹ {fmtN(boq.labourTotal || 0)}</span></div>
                      <div className="boq__grand-summary-total"><span>Grand Total</span><span>₹ {fmtN(boq.grandTotal)}</span></div>
                    </div>
                  )}
                </>
              )}

              <div className="boq__detail-actions">
                <button className="boq__ghost-btn" onClick={closeDetail}>← Back to My BOQs</button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}