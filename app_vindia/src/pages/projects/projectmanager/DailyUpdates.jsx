import { useState, useEffect, useCallback } from "react";
import "../../../styles/DailyUpdates.css";
import "./PMDailyUpdates.css";
import { API } from "../../../services/authService";

// ─── 7-day default date range ─────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const sevenDaysAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 6);
  return d.toISOString().split("T")[0];
};

// ─── PM Submit Form constants ─────────────────────────────────
const EMPTY_FORM = {
  date: today(), reportNo: "", projectName: "", phase: "",
  weather: "Clear", weatherTemp: "", overallStatus: "on-track",
  workItems:   [{ activity: "", location: "", quantity: "", unit: "", status: "done" }],
  manpower:    [{ trade: "", planned: "", present: "", remark: "" }],
  equipment:   [{ name: "", nos: "", status: "operational", hours: "" }],
  materials:   [{ material: "", quantity: "", supplier: "", challan: "", qc: "passed" }],
  issues:      [{ issue: "", impact: "", action: "", responsible: "", targetDate: "" }],
  progress:    { structural: "", finishing: "", mepElec: "", mepPlumb: "", overall: "" },
  safetyObs: "", tomorrowPlan: [{ activity: "", location: "", target: "" }],
  pmRemarks: "", submittedBy: "", submissionTime: "",
};

// ─── Role Source Config ───────────────────────────────────────
const ROLE_SOURCES = [
  {
    key: "pm", label: "Project Manager", icon: "🏗", color: "#1d4ed8", bgColor: "#eff6ff",
    endpoint: "/daily-reports",
    approveEndpoint: (id) => `/daily-reports/approve/${id}`,
    transform: (item) => ({
      id: item.id, roleKey: "pm", roleLabel: "Project Manager",
      projectName: item.data?.projectName || item.project_name || "—",
      date: item.data?.date || item.date || "—",
      phase: item.data?.phase || item.phase || "",
      overallStatus: item.data?.overallStatus || item.overall_status || "on-track",
      submittedBy: item.data?.submittedBy || item.submitted_by || "Project Manager",
      submissionTime: item.data?.submissionTime || item.submission_time || "",
      approved: item.approved || false,
      workItems: item.data?.workItems || [], manpower: item.data?.manpower || [],
      issues: item.data?.issues || [], progress: item.data?.progress || {},
      safetyObs: item.data?.safetyObs || "", pmRemarks: item.data?.pmRemarks || "",
      tomorrowPlan: item.data?.tomorrowPlan || [], equipment: item.data?.equipment || [],
      materials: item.data?.materials || [], weather: item.data?.weather || "", raw: item,
    }),
  },
  {
    key: "se", label: "Site Engineer", icon: "🦺", color: "#0891b2", bgColor: "#ecfeff",
    endpoint: "/se-daily-reports",
    approveEndpoint: (id) => `/se-daily-reports/approve/${id}`,
    transform: (item) => ({
      id: item.id, roleKey: "se", roleLabel: "Site Engineer",
      projectName: item.data?.projectName || item.project_name || "—",
      date: item.data?.date || (item.date ? String(item.date).split("T")[0] : "—"),
      phase: item.data?.phase || "",
      overallStatus: item.data?.overallStatus || item.overall_status || "on-track",
      submittedBy: item.data?.submittedBy || item.submitted_by || "Site Engineer",
      submissionTime: item.data?.submissionTime || item.submission_time || "",
      approved: item.approved || false,
      workItems: item.data?.workItems || [], manpower: item.data?.manpower || [],
      issues: item.data?.issues || [], progress: item.data?.progress || {},
      safetyObs: item.data?.safetyObs || "", pmRemarks: item.data?.notes || item.data?.pmRemarks || "",
      tomorrowPlan: item.data?.tomorrowPlan || [], equipment: item.data?.equipment || [],
      materials: item.data?.materials || [], weather: item.data?.weather || "", raw: item,
    }),
  },
  {
    key: "pc", label: "Project Coordinator", icon: "📋", color: "#7c3aed", bgColor: "#f5f3ff",
    endpoint: "/pc-daily-updates/project/all", approveEndpoint: null,
    transform: (item) => ({
      id: item.id, roleKey: "pc", roleLabel: "Project Coordinator",
      projectName: item.project_name || `Project #${item.project_id}`,
      date: item.date ? String(item.date).split("T")[0] : "—",
      phase: item.day ? `Day ${item.day}` : "",
      overallStatus: (item.severity === "high" || item.severity === "critical") ? "critical"
        : item.severity === "medium" ? "delayed" : "on-track",
      submittedBy: item.submitted_by || `Coordinator #${item.coordinator_id}`,
      submissionTime: item.created_at ? new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
      approved: item.status === "approved",
      workItems: item.work ? [{ activity: item.work, location: "", quantity: `${item.progress || 0}%`, unit: "progress", status: "in-progress" }] : [],
      manpower: item.workers ? [{ trade: "Workers", planned: item.workers, present: item.workers - (item.absent || 0), remark: item.absent ? `${item.absent} absent` : "" }] : [],
      issues: item.issues ? [{ issue: item.issues, impact: item.delay_impact || "", action: "", responsible: "", targetDate: "" }] : [],
      progress: { overall: item.progress || 0 }, safetyObs: item.safety || "",
      pmRemarks: item.coord_notes || "",
      tomorrowPlan: item.next ? [{ activity: item.next, location: "", target: "" }] : [],
      equipment: [],
      materials: [
        ...(item.cement_used ? [{ material: "Cement", quantity: item.cement_used, supplier: "", challan: "", qc: "passed" }] : []),
        ...(item.steel_used  ? [{ material: "Steel",  quantity: item.steel_used,  supplier: "", challan: "", qc: "passed" }] : []),
      ],
      weather: "", raw: item,
    }),
  },
  {
    key: "architect", label: "Architect", icon: "📐", color: "#d97706", bgColor: "#fffbeb",
    endpoint: "/architect-daily-log/all", approveEndpoint: null,
    transform: (item) => {
      const tasks = item.tasks || [];
      const issues = item.issues || [];
      return {
        id: item.id, roleKey: "architect", roleLabel: "Architect",
        projectName: item.project_name || `Project #${item.project_id}`,
        date: item.date ? String(item.date).split("T")[0] : "—",
        phase: "Architecture",
        overallStatus: issues.length > 0 ? "delayed" : "on-track",
        submittedBy: item.architect_name || item.submitted_by || "Architect",
        submissionTime: item.created_at ? new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
        approved: item.approved || false,
        workItems: tasks.filter(t => t.description || t.activity).map(t => ({
          activity: t.description || t.activity || "",
          location: t.zone || t.location || "",
          quantity: t.qty ? String(t.qty) : "",
          unit: t.unit || "",
          status: t.status || "done",
        })),
        manpower: [],
        issues: issues.map(i => ({ issue: i.description || i.issue || "", impact: i.impact || "", action: i.action || "", responsible: "", targetDate: "" })),
        progress: {},
        safetyObs: item.safety_notes || "",
        pmRemarks: item.remarks || item.notes || "",
        tomorrowPlan: item.next_day_plan ? [{ activity: item.next_day_plan, location: "", target: "" }] : [],
        equipment: [], materials: [],
        weather: item.weather_am || item.weather || "",
        raw: item,
      };
    },
  },
  {
    key: "structural", label: "Structural Engineer", icon: "🔩", color: "#0f766e", bgColor: "#f0fdfa",
    endpoint: "/se-daily-reports",
    approveEndpoint: (id) => `/se-daily-reports/approve/${id}`,
    transform: (item) => ({
      id: item.id, roleKey: "structural", roleLabel: "Structural Engineer",
      projectName: item.data?.projectName || item.project_name || "—",
      date: item.data?.date || (item.date ? String(item.date).split("T")[0] : "—"),
      phase: item.data?.phase || "Structural",
      overallStatus: item.data?.overallStatus || item.overall_status || "on-track",
      submittedBy: item.data?.submittedBy || item.submitted_by || "Structural Engineer",
      submissionTime: item.data?.submissionTime || item.submission_time || "",
      approved: item.approved || false,
      workItems: item.data?.workItems || [], manpower: item.data?.manpower || [],
      issues: item.data?.issues || [], progress: item.data?.progress || {},
      safetyObs: item.data?.safetyObs || "", pmRemarks: item.data?.pmRemarks || item.data?.notes || "",
      tomorrowPlan: item.data?.tomorrowPlan || [], equipment: item.data?.equipment || [],
      materials: item.data?.materials || [], weather: item.data?.weather || "", raw: item,
    }),
  },
  {
    key: "mep", label: "MEP Engineer", icon: "⚡", color: "#6d28d9", bgColor: "#faf5ff",
    endpoint: "/drawings/daily-logs/all", approveEndpoint: null,
    transform: (item) => ({
      id: item.id, roleKey: "mep", roleLabel: "MEP Engineer",
      projectName: item.project_name || `Project #${item.project_id}`,
      date: item.log_date ? String(item.log_date).split("T")[0] : (item.created_at ? String(item.created_at).split("T")[0] : "—"),
      phase: item.discipline || "MEP",
      overallStatus: "on-track",
      submittedBy: item.submitted_by_name || `MEP Engineer #${item.submitted_by}`,
      submissionTime: item.created_at ? new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
      approved: item.approved || false,
      workItems: (item.activities || []).map(a =>
        typeof a === "string" ? { activity: a, location: item.floor_name || "", quantity: "", unit: "", status: "done" }
          : { activity: a.description || a.activity || JSON.stringify(a), location: item.floor_name || "", quantity: "", unit: "", status: a.status || "done" }
      ),
      manpower: item.workers_deployed ? [{ trade: "MEP Workers", planned: item.workers_deployed, present: item.workers_deployed, remark: "" }] : [],
      issues: (item.blockers || []).map(b =>
        typeof b === "string" ? { issue: b, impact: "", action: "", responsible: "", targetDate: "" }
          : { issue: b.description || JSON.stringify(b), impact: "", action: "", responsible: "", targetDate: "" }
      ),
      progress: item.completion_pct ? { overall: item.completion_pct } : {},
      safetyObs: "", pmRemarks: "",
      tomorrowPlan: (item.plan_tomorrow || []).map(p =>
        typeof p === "string" ? { activity: p, location: "", target: "" }
          : { activity: p.description || JSON.stringify(p), location: "", target: "" }
      ),
      equipment: [],
      materials: Array.isArray(item.materials_used)
        ? item.materials_used.map(m =>
            typeof m === "string" ? { material: m, quantity: "", supplier: "", challan: "", qc: "passed" }
              : { material: m.name || JSON.stringify(m), quantity: m.quantity || "", supplier: "", challan: "", qc: "passed" }
          ) : [],
      weather: item.shift ? `Shift: ${item.shift}` : "", raw: item,
    }),
  },
  {
    key: "qs", label: "Quantity Surveyor", icon: "📊", color: "#b45309", bgColor: "#fefce8",
    endpoint: "/qs/daily-updates",
    approveEndpoint: (id) => `/qs/daily-updates/approve/${id}`,
    transform: (item) => ({
      id: item.id, roleKey: "qs", roleLabel: "Quantity Surveyor",
      projectName: item.project_name || `Project #${item.project_id}`,
      date: item.created_at ? String(item.created_at).split("T")[0] : "—",
      phase: item.phase || "",
      overallStatus: item.status || "on-track",
      submittedBy: item.submitted_by || "Quantity Surveyor",
      submissionTime: item.created_at ? new Date(item.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
      approved: item.approved || false,
      workItems: item.activity ? [{ activity: item.activity, location: item.location || "", quantity: String(item.quantity || ""), unit: item.unit || "", status: "done" }] : [],
      manpower: item.manpower ? [{ trade: "QS Team", planned: item.manpower, present: item.manpower, remark: "" }] : [],
      issues: [], progress: item.progress ? { overall: item.progress } : {},
      safetyObs: "", pmRemarks: item.remarks || "",
      tomorrowPlan: [], equipment: [],
      materials: item.boq_item ? [{ material: item.boq_item, quantity: String(item.quantity || ""), supplier: "", challan: "", qc: "passed" }] : [],
      weather: "", raw: item,
    }),
  },
];

const STATUS_COLORS = {
  "on-track": { bg: "#d1fae5", text: "#065f46", label: "On Track", dot: "#10b981" },
  "delayed":  { bg: "#fef3c7", text: "#92400e", label: "Delayed",  dot: "#f59e0b" },
  "critical": { bg: "#fee2e2", text: "#991b1b", label: "Critical", dot: "#ef4444" },
  "ahead":    { bg: "#dbeafe", text: "#1e40af", label: "Ahead",    dot: "#3b82f6" },
};
const WORK_STATUS  = { done: "Done", "in-progress": "In Progress", pending: "Pending" };
const EQUIP_STATUS = { operational: "Operational", maintenance: "Maintenance", idle: "Idle" };
const QC_STATUS    = { passed: "Passed", failed: "Failed", pending: "Pending" };

// ═══════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function DailyUpdates() {
  // ── Main tab: "approval" | "myreport" ──
  const [mainTab, setMainTab]               = useState("approval");

  // ── Approval list state ──
  const [allReports, setAllReports]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [errors, setErrors]                 = useState({});
  const [filterRole, setFilterRole]         = useState("all");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");
  const [searchQuery, setSearchQuery]       = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [toast, setToast]                   = useState(null);
  const [approvingId, setApprovingId]       = useState(null);
  const [msgModal, setMsgModal]             = useState(null);
  const [msgText, setMsgText]               = useState("");

  // ── PM My Report state ──
  const [pmPage, setPmPage]                 = useState("list"); // list | new | edit | view
  const [pmUpdates, setPmUpdates]           = useState([]);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [activeTab, setActiveTab]           = useState("work");
  const [editingId, setEditingId]           = useState(null);
  const [pmLoading, setPmLoading]           = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch all roles ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const errMap = {};
    const results = [];
    await Promise.allSettled(
      ROLE_SOURCES.map(async (source) => {
        try {
          const res = await API.get(source.endpoint);
          const raw = res.data;
          // QS returns { success, data: [...] }, others return array directly
          const rows = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
          rows.forEach(row => {
            try { results.push(source.transform(row)); } catch (_) {}
          });
        } catch (err) {
          errMap[source.key] = err?.response?.data?.message || err.message || "Failed";
        }
      })
    );
    results.sort((a, b) => {
      const d = (b.date || "").localeCompare(a.date || "");
      return d !== 0 ? d : (b.submissionTime || "").localeCompare(a.submissionTime || "");
    });
    setAllReports(results);
    setErrors(errMap);
    setLoading(false);
  }, []);

  // ── Fetch PM's own reports ──
  const fetchPmReports = useCallback(async () => {
    setPmLoading(true);
    try {
      const res = await API.get("/daily-reports");
      const formatted = res.data.map(item => ({ ...item.data, id: item.id, approved: item.approved }));
      setPmUpdates(formatted);
    } catch (err) {
      console.error("PM fetch error", err);
    } finally {
      setPmLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (mainTab === "myreport") fetchPmReports(); }, [mainTab, fetchPmReports]);

  // ── Approve ──
  const handleApprove = async (report) => {
    const source = ROLE_SOURCES.find(s => s.key === report.roleKey);
    if (!source?.approveEndpoint) { showToast(`Approval for ${source?.label} not yet configured`, "info"); return; }
    const key = `${report.roleKey}-${report.id}`;
    setApprovingId(key);
    try {
      await API.put(source.approveEndpoint(report.id));
      setAllReports(prev => prev.map(r =>
        r.roleKey === report.roleKey && r.id === report.id ? { ...r, approved: true } : r
      ));
      if (selectedReport?.id === report.id && selectedReport?.roleKey === report.roleKey)
        setSelectedReport(p => ({ ...p, approved: true }));
      showToast("Report approved ✓");
    } catch { showToast("Approval failed", "error"); }
    finally { setApprovingId(null); }
  };

  // ── PM Submit ──
  const pmSetField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const pmSetArrayRow = (key, idx, field, val) => {
    const arr = [...form[key]]; arr[idx] = { ...arr[idx], [field]: val }; pmSetField(key, arr);
  };
  const pmAddRow = (key, template) => pmSetField(key, [...form[key], { ...template }]);
  const pmRemoveRow = (key, idx) => {
    const arr = form[key].filter((_, i) => i !== idx);
    pmSetField(key, arr.length ? arr : form[key]);
  };

  const handlePmSave = async () => {
    try {
      const payload = { project_name: form.projectName, date: form.date, phase: form.phase, overall_status: form.overallStatus, submitted_by: form.submittedBy, submission_time: form.submissionTime, data: form };
      if (editingId) { await API.put(`/daily-reports/${editingId}`, payload); showToast("Report updated!"); }
      else { await API.post("/daily-reports", payload); showToast("Report saved!"); }
      fetchPmReports(); setPmPage("list");
    } catch (err) { showToast("Save failed", "error"); }
  };

  const handleSendMessage = () => {
    if (!msgText.trim()) return;
    showToast(`Message sent to ${msgModal.report.submittedBy}!`);
    setMsgModal(null); setMsgText("");
  };

  // ── Date filter: default last 7 days ──
  const inDateRange = (dateStr) => {
    if (!dateStr || dateStr === "—") return true;
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo   && dateStr > dateTo)   return false;
    return true;
  };

  const filtered = allReports.filter(r => {
    if (filterRole !== "all" && r.roleKey !== filterRole) return false;
    if (filterStatus !== "all" && r.overallStatus !== filterStatus) return false;
    if (filterApproval === "pending" && r.approved) return false;
    if (filterApproval === "approved" && !r.approved) return false;
    if (!inDateRange(r.date)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.projectName?.toLowerCase().includes(q) || r.submittedBy?.toLowerCase().includes(q) || r.phase?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = [
    { label: "Total Reports",    val: allReports.length,                                        icon: "📋", color: "#1d4ed8" },
    { label: "Pending Approval", val: allReports.filter(r => !r.approved).length,               icon: "⏳", color: "#d97706" },
    { label: "Approved",         val: allReports.filter(r => r.approved).length,                icon: "✅", color: "#059669" },
    { label: "Critical Issues",  val: allReports.filter(r => r.overallStatus === "critical").length, icon: "🚨", color: "#dc2626" },
  ];

  const roleBreakdown = ROLE_SOURCES.map(s => ({
    ...s,
    count:   allReports.filter(r => r.roleKey === s.key).length,
    pending: allReports.filter(r => r.roleKey === s.key && !r.approved).length,
    hasError: !!errors[s.key],
  }));

  const formTabs = [
    { id: "work", label: "Work" }, { id: "manpower", label: "Manpower" },
    { id: "equipment", label: "Equipment" }, { id: "materials", label: "Materials" },
    { id: "issues", label: "Issues" }, { id: "progress", label: "Progress" },
    { id: "safety", label: "Safety" }, { id: "tomorrow", label: "Tomorrow" },
  ];

  // ══════════════════════════════════════════════
  //  DETAIL VIEW (Approval)
  // ══════════════════════════════════════════════
  if (mainTab === "approval" && selectedReport) {
    const r = selectedReport;
    const sc = STATUS_COLORS[r.overallStatus] || STATUS_COLORS["on-track"];
    const source = ROLE_SOURCES.find(s => s.key === r.roleKey);
    const isApproving = approvingId === `${r.roleKey}-${r.id}`;
    return (
      <div className="du-view-page">
        {toast && <div className={`du-toast du-toast--${toast.type}`}>{toast.msg}</div>}
        <div className="du-view-topbar">
          <button className="btn-back" onClick={() => setSelectedReport(null)}>← Back to Reports</button>
          <div className="du-view-topbar-actions">
            <button className="btn-msg" onClick={() => setMsgModal({ report: r })}>💬 Message</button>
            {!r.approved
              ? <button className="btn-approve-big" onClick={() => handleApprove(r)} disabled={isApproving}>{isApproving ? "Approving…" : "✓ Approve Report"}</button>
              : <span className="du-approved-tag">✓ Approved</span>}
          </div>
        </div>
        <div className="du-view-body">
          <div className="pmd-role-badge-bar">
            <span className="pmd-role-pill" style={{ background: source.bgColor, color: source.color, border: `1px solid ${source.color}40` }}>
              {source.icon} {source.label}
            </span>
            <span className="pmd-submitted-info">Submitted by <strong>{r.submittedBy}</strong>{r.submissionTime && <> at <strong>{r.submissionTime}</strong></>}</span>
          </div>
          <div className="du-view-header">
            <div>
              <div className="du-view-project">{r.projectName}</div>
              {r.phase && <div className="du-view-phase">{r.phase}</div>}
            </div>
            <div className="du-view-header-right">
              <span className="du-status-badge" data-status={r.overallStatus}><span className="du-status-dot" style={{ background: sc.dot }} />{sc.label}</span>
              <div className="du-view-date">{r.date}</div>
              {r.weather && <div className="du-view-weather">🌤 {r.weather}</div>}
            </div>
          </div>
          {(r.workItems||[]).filter(w=>w.activity).length>0&&<ViewSection title="1. Work Completed Today">{r.workItems.filter(w=>w.activity).map((w,i)=><div key={i} className="du-rv-row"><span className="du-rv-col-3">{w.activity}</span><span className="du-rv-col-2 du-muted">{w.location}</span><span className="du-rv-col-1 du-muted">{w.quantity} {w.unit}</span><span className="du-rv-col-1"><StatusPill status={w.status} map={WORK_STATUS}/></span></div>)}</ViewSection>}
          {(r.manpower||[]).filter(m=>m.trade).length>0&&<ViewSection title="2. Manpower">{r.manpower.filter(m=>m.trade).map((m,i)=><div key={i} className="du-rv-row"><span className="du-rv-col-3">{m.trade}</span><span className="du-rv-col-1 du-muted">Planned: {m.planned}</span><span className={`du-rv-col-1 ${m.present<m.planned?"du-danger":"du-success"}`}>Present: {m.present}</span><span className="du-rv-col-2 du-muted">{m.remark}</span></div>)}</ViewSection>}
          {(r.equipment||[]).filter(e=>e.name).length>0&&<ViewSection title="3. Equipment">{r.equipment.filter(e=>e.name).map((e,i)=><div key={i} className="du-rv-row"><span className="du-rv-col-3">{e.name}</span><span className="du-rv-col-1 du-muted">{e.nos} unit(s)</span><span className="du-rv-col-2"><StatusPill status={e.status} map={EQUIP_STATUS}/></span><span className="du-rv-col-1 du-muted">{e.hours} hrs</span></div>)}</ViewSection>}
          {(r.materials||[]).filter(m=>m.material).length>0&&<ViewSection title="4. Materials">{r.materials.filter(m=>m.material).map((m,i)=><div key={i} className="du-rv-row"><span className="du-rv-col-3">{m.material}</span><span className="du-rv-col-1 du-muted">{m.quantity}</span><span className="du-rv-col-2 du-muted">{m.supplier}</span><span className="du-rv-col-1"><StatusPill status={m.qc} map={QC_STATUS}/></span></div>)}</ViewSection>}
          <ViewSection title="5. Issues / Problems">{(r.issues||[]).filter(i=>i.issue).length===0?<div className="du-rv-nil">No issues logged ✓</div>:r.issues.filter(i=>i.issue).map((issue,i)=><div key={i} className="du-issue-card"><div className="du-issue-card-title">⚠ {issue.issue}</div>{issue.impact&&<div className="du-issue-impact">Impact: {issue.impact}</div>}{issue.action&&<div className="du-issue-action">Action: {issue.action}</div>}</div>)}</ViewSection>
          {r.progress&&Object.keys(r.progress).length>0&&<ViewSection title="6. Progress">{Object.entries(r.progress).map(([k,v])=>{if(!v)return null;const labels={structural:"Structural",finishing:"Finishing",mepElec:"MEP Electrical",mepPlumb:"MEP Plumbing",overall:"Overall Project"};return(<div key={k} className="du-rv-progress-row"><div className="du-rv-prog-label">{labels[k]||k}</div><div className="du-prog-track du-rv-prog-track"><div className="du-prog-bar" style={{width:`${Math.min(100,v)}%`}}/></div><span className="du-prog-pct">{v}%</span></div>);})}</ViewSection>}
          {r.safetyObs&&<ViewSection title="7. Safety Observations">{r.safetyObs.split("\n").filter(Boolean).map((l,i)=><div key={i} className="du-safety-line">🦺 {l}</div>)}</ViewSection>}
          {(r.tomorrowPlan||[]).filter(t=>t.activity).length>0&&<ViewSection title="8. Tomorrow's Plan">{r.tomorrowPlan.filter(t=>t.activity).map((t,i)=><div key={i} className="du-rv-row"><span className="du-rv-col-3">{t.activity}</span><span className="du-rv-col-2 du-muted">{t.location}</span><span className="du-rv-col-1 du-accent">{t.target}</span></div>)}</ViewSection>}
          {r.pmRemarks&&<ViewSection title="9. Notes / Remarks"><div className="du-rv-remarks">{r.pmRemarks}</div></ViewSection>}
          <div className="du-rv-footer"><span>Submitted by: <strong>{r.submittedBy}</strong></span>{r.submissionTime&&<span> · {r.submissionTime}</span>}</div>
        </div>
        {msgModal&&<MsgModal report={msgModal.report} msgText={msgText} setMsgText={setMsgText} onClose={()=>setMsgModal(null)} onSend={handleSendMessage}/>}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  PM MY REPORT — FORM (new/edit)
  // ══════════════════════════════════════════════
  if (mainTab === "myreport" && (pmPage === "new" || pmPage === "edit")) {
    return (
      <div className="du-page">
        {toast && <div className={`du-toast du-toast--${toast.type}`}>{toast.msg}</div>}
        <div className="pmd-maintab-bar">
          <button className={`pmd-maintab${mainTab==="approval"?" active":""}`} onClick={()=>{setMainTab("approval");setPmPage("list");}}>📋 All Roles Approval</button>
          <button className={`pmd-maintab${mainTab==="myreport"?" active":""}`} onClick={()=>setMainTab("myreport")}>✏️ My Daily Report</button>
        </div>
        <div className="du-view-topbar" style={{marginBottom:16}}>
          <button className="btn-back" onClick={()=>setPmPage("list")}>← Back to My Reports</button>
          <button className="btn-primary" onClick={handlePmSave}>{editingId?"Update Report":"Save Report"}</button>
        </div>
        <div className="du-form-section du-form-meta-section">
          <div className="du-form-section-title">📋 Report Details</div>
          <div className="du-form-grid-3">
            <label>Date<input type="date" className="du-input" value={form.date} onChange={e=>pmSetField("date",e.target.value)}/></label>
            <label>Project Name<input type="text" className="du-input" placeholder="Project name" value={form.projectName} onChange={e=>pmSetField("projectName",e.target.value)}/></label>
            <label>Phase<input type="text" className="du-input" placeholder="e.g. Structure" value={form.phase} onChange={e=>pmSetField("phase",e.target.value)}/></label>
            <label>Weather<input type="text" className="du-input" value={form.weather} onChange={e=>pmSetField("weather",e.target.value)}/></label>
            <label>Overall Status
              <select className="du-input" value={form.overallStatus} onChange={e=>pmSetField("overallStatus",e.target.value)}>
                <option value="on-track">On Track</option><option value="delayed">Delayed</option>
                <option value="critical">Critical</option><option value="ahead">Ahead</option>
              </select>
            </label>
            <label>Submitted By<input type="text" className="du-input" value={form.submittedBy} onChange={e=>pmSetField("submittedBy",e.target.value)}/></label>
          </div>
        </div>
        <div className="du-form-section">
          <div className="du-tab-bar">{formTabs.map(t=><button key={t.id} className={`du-tab${activeTab===t.id?" active":""}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>)}</div>
          <div className="du-tab-body">
            {activeTab==="work"&&(<div>
              <div className="du-table-head"><span>Activity</span><span>Location</span><span>Qty</span><span>Unit</span><span>Status</span><span></span></div>
              {form.workItems.map((w,i)=><div key={i} className="du-table-row">
                <input className="du-input" placeholder="Activity" value={w.activity} onChange={e=>pmSetArrayRow("workItems",i,"activity",e.target.value)}/>
                <input className="du-input" placeholder="Location" value={w.location} onChange={e=>pmSetArrayRow("workItems",i,"location",e.target.value)}/>
                <input className="du-input" placeholder="Qty" value={w.quantity} onChange={e=>pmSetArrayRow("workItems",i,"quantity",e.target.value)}/>
                <input className="du-input" placeholder="Unit" value={w.unit} onChange={e=>pmSetArrayRow("workItems",i,"unit",e.target.value)}/>
                <select className="du-input" value={w.status} onChange={e=>pmSetArrayRow("workItems",i,"status",e.target.value)}><option value="done">Done</option><option value="in-progress">In Progress</option><option value="pending">Pending</option></select>
                <button className="du-rm-btn" onClick={()=>pmRemoveRow("workItems",i)}>✕</button>
              </div>)}
              <button className="du-add-row" onClick={()=>pmAddRow("workItems",{activity:"",location:"",quantity:"",unit:"",status:"done"})}>+ Add Row</button>
            </div>)}
            {activeTab==="manpower"&&(<div>
              <div className="du-table-head"><span>Trade</span><span>Planned</span><span>Present</span><span>Remark</span><span></span></div>
              {form.manpower.map((m,i)=><div key={i} className="du-table-row">
                <input className="du-input" placeholder="Trade" value={m.trade} onChange={e=>pmSetArrayRow("manpower",i,"trade",e.target.value)}/>
                <input className="du-input" type="number" placeholder="0" value={m.planned} onChange={e=>pmSetArrayRow("manpower",i,"planned",e.target.value)}/>
                <input className="du-input" type="number" placeholder="0" value={m.present} onChange={e=>pmSetArrayRow("manpower",i,"present",e.target.value)}/>
                <input className="du-input" placeholder="Remark" value={m.remark} onChange={e=>pmSetArrayRow("manpower",i,"remark",e.target.value)}/>
                <button className="du-rm-btn" onClick={()=>pmRemoveRow("manpower",i)}>✕</button>
              </div>)}
              <button className="du-add-row" onClick={()=>pmAddRow("manpower",{trade:"",planned:"",present:"",remark:""})}>+ Add Row</button>
            </div>)}
            {activeTab==="equipment"&&(<div>
              <div className="du-table-head"><span>Equipment</span><span>Nos</span><span>Status</span><span>Hours</span><span></span></div>
              {form.equipment.map((e,i)=><div key={i} className="du-table-row">
                <input className="du-input" placeholder="Equipment" value={e.name} onChange={ev=>pmSetArrayRow("equipment",i,"name",ev.target.value)}/>
                <input className="du-input" type="number" value={e.nos} onChange={ev=>pmSetArrayRow("equipment",i,"nos",ev.target.value)}/>
                <select className="du-input" value={e.status} onChange={ev=>pmSetArrayRow("equipment",i,"status",ev.target.value)}><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="idle">Idle</option></select>
                <input className="du-input" type="number" placeholder="hrs" value={e.hours} onChange={ev=>pmSetArrayRow("equipment",i,"hours",ev.target.value)}/>
                <button className="du-rm-btn" onClick={()=>pmRemoveRow("equipment",i)}>✕</button>
              </div>)}
              <button className="du-add-row" onClick={()=>pmAddRow("equipment",{name:"",nos:"",status:"operational",hours:""})}>+ Add Row</button>
            </div>)}
            {activeTab==="materials"&&(<div>
              <div className="du-table-head"><span>Material</span><span>Quantity</span><span>Supplier</span><span>Challan</span><span>QC</span><span></span></div>
              {form.materials.map((m,i)=><div key={i} className="du-table-row">
                <input className="du-input" placeholder="Material" value={m.material} onChange={e=>pmSetArrayRow("materials",i,"material",e.target.value)}/>
                <input className="du-input" placeholder="Qty" value={m.quantity} onChange={e=>pmSetArrayRow("materials",i,"quantity",e.target.value)}/>
                <input className="du-input" placeholder="Supplier" value={m.supplier} onChange={e=>pmSetArrayRow("materials",i,"supplier",e.target.value)}/>
                <input className="du-input" placeholder="Challan#" value={m.challan} onChange={e=>pmSetArrayRow("materials",i,"challan",e.target.value)}/>
                <select className="du-input" value={m.qc} onChange={e=>pmSetArrayRow("materials",i,"qc",e.target.value)}><option value="passed">Passed</option><option value="failed">Failed</option><option value="pending">Pending</option></select>
                <button className="du-rm-btn" onClick={()=>pmRemoveRow("materials",i)}>✕</button>
              </div>)}
              <button className="du-add-row" onClick={()=>pmAddRow("materials",{material:"",quantity:"",supplier:"",challan:"",qc:"passed"})}>+ Add Row</button>
            </div>)}
            {activeTab==="issues"&&(<div>
              <div className="du-table-head"><span>Issue</span><span>Impact</span><span>Action</span><span>Responsible</span><span>Target Date</span><span></span></div>
              {form.issues.map((iss,i)=><div key={i} className="du-table-row">
                <input className="du-input" placeholder="Issue" value={iss.issue} onChange={e=>pmSetArrayRow("issues",i,"issue",e.target.value)}/>
                <input className="du-input" placeholder="Impact" value={iss.impact} onChange={e=>pmSetArrayRow("issues",i,"impact",e.target.value)}/>
                <input className="du-input" placeholder="Action" value={iss.action} onChange={e=>pmSetArrayRow("issues",i,"action",e.target.value)}/>
                <input className="du-input" placeholder="Responsible" value={iss.responsible} onChange={e=>pmSetArrayRow("issues",i,"responsible",e.target.value)}/>
                <input className="du-input" type="date" value={iss.targetDate} onChange={e=>pmSetArrayRow("issues",i,"targetDate",e.target.value)}/>
                <button className="du-rm-btn" onClick={()=>pmRemoveRow("issues",i)}>✕</button>
              </div>)}
              <button className="du-add-row" onClick={()=>pmAddRow("issues",{issue:"",impact:"",action:"",responsible:"",targetDate:""})}>+ Add Row</button>
            </div>)}
            {activeTab==="progress"&&(<div className="du-progress-form">
              {[["structural","Structural"],["finishing","Finishing"],["mepElec","MEP Electrical"],["mepPlumb","MEP Plumbing"],["overall","Overall Project"]].map(([key,label])=>(
                <div key={key} className="du-prog-row">
                  <label className="du-prog-lbl">{label}</label>
                  <input type="range" min="0" max="100" className="du-prog-slider" value={form.progress[key]||0} onChange={e=>pmSetField("progress",{...form.progress,[key]:Number(e.target.value)})}/>
                  <span className="du-prog-pct">{form.progress[key]||0}%</span>
                </div>
              ))}
            </div>)}
            {activeTab==="safety"&&(<div><textarea className="du-textarea" rows={5} placeholder="Safety observations, incidents, toolbox talks..." value={form.safetyObs} onChange={e=>pmSetField("safetyObs",e.target.value)}/><textarea className="du-textarea" rows={3} placeholder="PM Remarks" value={form.pmRemarks} onChange={e=>pmSetField("pmRemarks",e.target.value)}/></div>)}
            {activeTab==="tomorrow"&&(<div>
              <div className="du-table-head"><span>Activity</span><span>Location</span><span>Target</span><span></span></div>
              {form.tomorrowPlan.map((t,i)=><div key={i} className="du-table-row">
                <input className="du-input" placeholder="Activity" value={t.activity} onChange={e=>pmSetArrayRow("tomorrowPlan",i,"activity",e.target.value)}/>
                <input className="du-input" placeholder="Location" value={t.location} onChange={e=>pmSetArrayRow("tomorrowPlan",i,"location",e.target.value)}/>
                <input className="du-input" placeholder="Target" value={t.target} onChange={e=>pmSetArrayRow("tomorrowPlan",i,"target",e.target.value)}/>
                <button className="du-rm-btn" onClick={()=>pmRemoveRow("tomorrowPlan",i)}>✕</button>
              </div>)}
              <button className="du-add-row" onClick={()=>pmAddRow("tomorrowPlan",{activity:"",location:"",target:""})}>+ Add Row</button>
            </div>)}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  PM MY REPORT — LIST
  // ══════════════════════════════════════════════
  if (mainTab === "myreport") {
    return (
      <div className="du-page">
        {toast && <div className={`du-toast du-toast--${toast.type}`}>{toast.msg}</div>}
        <div className="pmd-maintab-bar">
          <button className={`pmd-maintab${mainTab==="approval"?" active":""}`} onClick={()=>setMainTab("approval")}>📋 All Roles Approval</button>
          <button className={`pmd-maintab${mainTab==="myreport"?" active":""}`} onClick={()=>setMainTab("myreport")}>✏️ My Daily Report</button>
        </div>
        <div className="du-header">
          <div><div className="pmd-eyebrow">Project Manager</div><h1 className="du-title">My Daily Reports</h1></div>
          <button className="btn-primary" onClick={()=>{setForm({...EMPTY_FORM,date:today()});setEditingId(null);setActiveTab("work");setPmPage("new");}}>+ New Report</button>
        </div>
        {pmLoading && <div className="pmd-loading"><div className="pmd-spinner"/><span>Loading…</span></div>}
        {!pmLoading && pmUpdates.length === 0 && (
          <div className="du-empty"><div className="du-empty-icon">📝</div><div className="du-empty-msg">No reports yet</div><div className="du-empty-sub">Click "+ New Report" to submit your first daily report</div></div>
        )}
        {!pmLoading && pmUpdates.length > 0 && (
          <div className="du-report-list">
            {pmUpdates.map(u => {
              const sc = STATUS_COLORS[u.overallStatus] || STATUS_COLORS["on-track"];
              return (
                <div key={u.id} className="du-report-card pmd-report-card" data-status={u.overallStatus}>
                  <div className="pmd-role-tag" style={{background:"#eff6ff",color:"#1d4ed8"}}>🏗 Project Manager</div>
                  <div className="du-rc-top">
                    <div><div className="du-rc-project">{u.projectName || "—"}</div><div className="du-rc-meta">{u.phase&&<span>{u.phase} · </span>}<span>📅 {u.date}</span></div></div>
                    <div className="du-rc-top-right">
                      {u.approved&&<span className="du-approved-badge">✓ Approved</span>}
                      <span className="du-status-badge" data-status={u.overallStatus}><span className="du-status-dot" style={{background:sc.dot}}/>{sc.label}</span>
                    </div>
                  </div>
                  <div className="du-rc-footer">
                    <span className="du-rc-by">👤 {u.submittedBy||"Project Manager"}</span>
                    <div className="du-rc-actions">
                      <button className="btn-view" onClick={()=>{setForm({...EMPTY_FORM,...u});setEditingId(u.id);setActiveTab("work");setPmPage("edit");}}>✏ Edit</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  APPROVAL LIST (default view)
  // ══════════════════════════════════════════════
  return (
    <div className="du-page">
      {toast && <div className={`du-toast du-toast--${toast.type}`}>{toast.msg}</div>}

      {/* Main tabs */}
      <div className="pmd-maintab-bar">
        <button className={`pmd-maintab${mainTab==="approval"?" active":""}`} onClick={()=>setMainTab("approval")}>📋 All Roles Approval</button>
        <button className={`pmd-maintab${mainTab==="myreport"?" active":""}`} onClick={()=>setMainTab("myreport")}>✏️ My Daily Report</button>
      </div>

      <div className="du-header">
        <div><div className="pmd-eyebrow">Project Manager · Approval Centre</div><h1 className="du-title">Daily Reports — All Roles</h1></div>
        <button className="btn-primary" onClick={fetchAll} disabled={loading}>{loading?"Loading…":"⟳ Refresh"}</button>
      </div>

      {/* Stats */}
      <div className="du-stats-grid">
        {stats.map(s=>(
          <div key={s.label} className="du-stat-card">
            <div className="du-stat-icon">{s.icon}</div>
            <div className="du-stat-info"><div className="du-stat-val" style={{color:s.color}}>{s.val}</div><div className="du-stat-lbl">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Role chips */}
      <div className="pmd-role-bar">
        {roleBreakdown.map(s=>(
          <button key={s.key} className={`pmd-role-chip${filterRole===s.key?" active":""}`}
            style={filterRole===s.key?{background:s.bgColor,borderColor:s.color,color:s.color}:{}}
            onClick={()=>setFilterRole(filterRole===s.key?"all":s.key)}>
            <span>{s.icon}</span><span className="pmd-role-name">{s.label}</span>
            <span className="pmd-role-count" style={{background:s.color}}>{s.hasError?"!":s.count}</span>
            {s.pending>0&&<span className="pmd-role-pending">{s.pending} pending</span>}
          </button>
        ))}
        {filterRole!=="all"&&<button className="pmd-clear-role" onClick={()=>setFilterRole("all")}>✕ All</button>}
      </div>

      {/* Errors */}
      {Object.keys(errors).length>0&&(
        <div className="pmd-errors-bar">
          {Object.entries(errors).map(([key,msg])=>{const s=ROLE_SOURCES.find(r=>r.key===key);return<div key={key} className="pmd-error-chip">⚠ {s?.label}: {msg}</div>;})}
        </div>
      )}

      {/* Filters */}
      <div className="pmd-filter-bar">
        <input className="pmd-search" type="text" placeholder="🔍  Search project, name, phase…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
        <select className="pmd-select" value={filterApproval} onChange={e=>setFilterApproval(e.target.value)}>
          <option value="all">All Status</option><option value="pending">⏳ Pending</option><option value="approved">✅ Approved</option>
        </select>
        <select className="pmd-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="all">All Conditions</option><option value="on-track">On Track</option><option value="delayed">Delayed</option><option value="critical">Critical</option><option value="ahead">Ahead</option>
        </select>
        <div className="pmd-date-range">
          <label className="pmd-date-lbl">From</label>
          <input className="pmd-date-filter" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
          <label className="pmd-date-lbl">To</label>
          <input className="pmd-date-filter" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
          <button className="pmd-week-btn" onClick={()=>{setDateFrom(sevenDaysAgo());setDateTo(today());}}>Last 7d</button>
          {(dateFrom||dateTo)&&<button className="pmd-week-btn pmd-clear-date-btn" onClick={()=>{setDateFrom("");setDateTo("");}}>All Dates</button>}
        </div>
        {(filterApproval!=="all"||filterStatus!=="all"||searchQuery)&&<button className="pmd-clear-filters" onClick={()=>{setFilterApproval("all");setFilterStatus("all");setSearchQuery("");}}>✕ Clear</button>}
        <span className="pmd-result-count">{filtered.length} report{filtered.length!==1?"s":""}</span>
      </div>

      {loading&&<div className="pmd-loading"><div className="pmd-spinner"/><span>Fetching all role reports…</span></div>}
      {!loading&&filtered.length===0&&(
        <div className="du-empty">
          <div className="du-empty-icon">📭</div>
          <div className="du-empty-msg">No reports found</div>
          <div className="du-empty-sub">
            {allReports.length===0
              ? "No reports have been submitted yet"
              : (dateFrom||dateTo)
                ? <span>No reports in the selected date range. <button className="pmd-link-btn" onClick={()=>{setDateFrom("");setDateTo("");}}>Clear dates to see all {allReports.length} reports</button></span>
                : "Try adjusting the role or status filters"}
          </div>
        </div>
      )}

      {/* Report cards */}
      {!loading&&filtered.length>0&&(
        <div className="du-report-list">
          {filtered.map(r=>{
            const sc=STATUS_COLORS[r.overallStatus]||STATUS_COLORS["on-track"];
            const source=ROLE_SOURCES.find(s=>s.key===r.roleKey);
            const issueCount=(r.issues||[]).filter(i=>i.issue).length;
            const isApproving=approvingId===`${r.roleKey}-${r.id}`;
            return(
              <div key={`${r.roleKey}-${r.id}`} className="du-report-card pmd-report-card" data-status={r.overallStatus}>
                <div className="pmd-role-tag" style={{background:source.bgColor,color:source.color}}>{source.icon} {source.label}</div>
                <div className="du-rc-top">
                  <div>
                    <div className="du-rc-project">{r.projectName}</div>
                    <div className="du-rc-meta">{r.phase&&<span>{r.phase} · </span>}<span>📅 {r.date}</span>{r.submissionTime&&<span> · 🕐 {r.submissionTime}</span>}</div>
                  </div>
                  <div className="du-rc-top-right">
                    {r.approved&&<span className="du-approved-badge">✓ Approved</span>}
                    <span className="du-status-badge" data-status={r.overallStatus}><span className="du-status-dot" style={{background:sc.dot}}/>{sc.label}</span>
                  </div>
                </div>
                <div className="du-rc-stats">
                  {(r.workItems||[]).filter(w=>w.activity).length>0&&<span className="du-rc-stat">🏗 {r.workItems.filter(w=>w.activity).length} work items</span>}
                  {(r.manpower||[]).filter(m=>m.trade).length>0&&<span className="du-rc-stat">👷 {r.manpower.filter(m=>m.trade).length} trade(s)</span>}
                  {issueCount>0&&<span className="du-rc-stat du-rc-stat--issue">⚠️ {issueCount} issue{issueCount>1?"s":""}</span>}
                  {r.progress?.overall>0&&<span className="du-rc-stat">📊 {r.progress.overall}% overall</span>}
                </div>
                {r.pmRemarks&&<div className="du-rc-remarks">"{r.pmRemarks.slice(0,120)}{r.pmRemarks.length>120?"…":""}"</div>}
                <div className="du-rc-footer">
                  <span className="du-rc-by">👤 {r.submittedBy}</span>
                  <div className="du-rc-actions">
                    {!r.approved&&<button className="btn-approve" onClick={()=>handleApprove(r)} disabled={isApproving}>{isApproving?"…":"✓ Approve"}</button>}
                    <button className="btn-msg" onClick={()=>setMsgModal({report:r})}>💬</button>
                    <button className="btn-view" onClick={()=>setSelectedReport(r)}>View Report →</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {msgModal&&<MsgModal report={msgModal.report} msgText={msgText} setMsgText={setMsgText} onClose={()=>setMsgModal(null)} onSend={handleSendMessage}/>}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function ViewSection({title,children}){return<div className="du-rv-section"><div className="du-rv-section-title">{title}</div>{children}</div>;}
function StatusPill({status,map}){const m={"done":"#d1fae5|#065f46","in-progress":"#fef3c7|#92400e","pending":"#f1f5f9|#64748b","operational":"#d1fae5|#065f46","maintenance":"#fef3c7|#92400e","idle":"#f1f5f9|#64748b","passed":"#d1fae5|#065f46","failed":"#fee2e2|#991b1b"};const[bg,color]=(m[status]||"#f1f5f9|#64748b").split("|");return<span style={{background:bg,color,fontSize:11,padding:"2px 8px",borderRadius:3,fontWeight:600}}>{map[status]||status}</span>;}
function MsgModal({report,msgText,setMsgText,onClose,onSend}){return<div className="du-overlay" onClick={onClose}><div className="du-msg-modal" onClick={e=>e.stopPropagation()}><div className="du-msg-header"><div className="du-msg-title">💬 Send Message</div><button className="du-close-btn" onClick={onClose}>✕</button></div><div className="du-msg-body"><div className="du-msg-to">To: <strong>{report.submittedBy}</strong></div><div className="du-msg-project">Re: {report.projectName} — {report.date}</div><textarea className="du-msg-textarea" placeholder="Type your message here..." value={msgText} onChange={e=>setMsgText(e.target.value)} rows={5}/></div><div className="du-msg-footer"><button className="btn-cancel" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={onSend}>Send Message</button></div></div></div>;}