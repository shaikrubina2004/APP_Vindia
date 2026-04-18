import { useState } from "react";
import "../../../styles/DailyUpdates.css";
import { API } from "../../../services/authService";
import { useEffect } from "react";
// ─── Constants ───────────────────────────────────────────────
const STATUS_COLORS = {
  "on-track": { bg: "#d1fae5", text: "#065f46", label: "On Track", dot: "#10b981" },
  "delayed":  { bg: "#fef3c7", text: "#92400e", label: "Delayed",  dot: "#f59e0b" },
  "critical": { bg: "#fee2e2", text: "#991b1b", label: "Critical", dot: "#ef4444" },
  "ahead":    { bg: "#dbeafe", text: "#1e40af", label: "Ahead",    dot: "#3b82f6" },
};
const WORK_STATUS  = { done: "Done", "in-progress": "In Progress", pending: "Pending" };
const EQUIP_STATUS = { operational: "Operational", maintenance: "Maintenance", idle: "Idle" };
const QC_STATUS    = { passed: "Passed", failed: "Failed", pending: "Pending" };

const EMPTY_FORM = {
  date: "", reportNo: "", projectName: "", phase: "",
  weather: "Clear", weatherTemp: "", overallStatus: "on-track",
  workItems:    [{ activity: "", location: "", quantity: "", unit: "", status: "done" }],
  manpower:     [{ trade: "", planned: "", present: "", remark: "" }],
  equipment:    [{ name: "", nos: "", status: "operational", hours: "" }],
  materials:    [{ material: "", quantity: "", supplier: "", challan: "", qc: "passed" }],
  issues:       [{ issue: "", impact: "", action: "", responsible: "", targetDate: "" }],
  progress:     { structural: "", finishing: "", mepElec: "", mepPlumb: "", overall: "" },
  safetyObs: "", tomorrowPlan: [{ activity: "", location: "", target: "" }],
  pmRemarks: "", submittedBy: "", submissionTime: "",
  photoNames: [], videoNames: [], approved: false,
};

const SEED_UPDATES = [
  { id: 1, projectName: "Tower A", date: "2026-04-08", phase: "Structure", overallStatus: "on-track",
    workItems: [{ activity: "Column casting", location: "Level 3", quantity: "6", unit: "Nos", status: "done" }],
    manpower:  [{ trade: "Mason", planned: 10, present: 9, remark: "1 absent" }],
    equipment: [{ name: "Tower Crane", nos: "1", status: "operational", hours: "8" }],
    materials: [{ material: "TMT Steel", quantity: "8 MT", supplier: "SteelCo", challan: "CH-201", qc: "passed" }],
    issues: [], progress: { structural: 45, finishing: 10, mepElec: 20, mepPlumb: 15, overall: 35 },
    safetyObs: "Toolbox talk at 8AM\nAll workers wearing PPE",
    tomorrowPlan: [{ activity: "Slab shuttering", location: "Level 4", target: "200 Sqm" }],
    pmRemarks: "Work going smooth", submittedBy: "Rahul (Site Engineer)", submissionTime: "18:00",
    photoNames: [], videoNames: [], approved: false },
  { id: 2, projectName: "Mall Project", date: "2026-04-08", phase: "MEP", overallStatus: "delayed",
    workItems: [{ activity: "Cable laying", location: "Basement", quantity: "300", unit: "m", status: "in-progress" }],
    manpower:  [{ trade: "Electrician", planned: 8, present: 6, remark: "2 absent" }],
    equipment: [{ name: "Cable Drum", nos: "2", status: "operational", hours: "6" }],
    materials: [{ material: "Conduit Pipe", quantity: "200m", supplier: "PipeCo", challan: "CH-344", qc: "passed" }],
    issues: [{ issue: "Material shortage", impact: "Delay by 2 days", action: "Urgent PO raised", responsible: "Procurement", targetDate: "2026-04-10" }],
    progress: { structural: 100, finishing: 40, mepElec: 30, mepPlumb: 55, overall: 60 },
    safetyObs: "Safety harness check done",
    tomorrowPlan: [{ activity: "Continue cable laying", location: "Basement B1", target: "200m" }],
    pmRemarks: "Need urgent supply", submittedBy: "Anil (MEP Engineer)", submissionTime: "17:30",
    photoNames: [], videoNames: [], approved: false },
  { id: 3, projectName: "Hospital Block", date: "2026-04-08", phase: "Planning", overallStatus: "ahead",
    workItems: [{ activity: "Schedule planning", location: "Office", quantity: "", unit: "", status: "done" }],
    manpower:  [{ trade: "Planner", planned: 3, present: 3, remark: "" }],
    equipment: [], materials: [], issues: [],
    progress: { structural: 0, finishing: 0, mepElec: 0, mepPlumb: 0, overall: 5 },
    safetyObs: "", tomorrowPlan: [{ activity: "Finalize BOQ", location: "Office", target: "Complete" }],
    pmRemarks: "Ahead of schedule", submittedBy: "Priya (Planning Engineer)", submissionTime: "16:45",
    photoNames: [], videoNames: [], approved: true },
  { id: 4, projectName: "Residential Villa", date: "2026-04-08", phase: "Architecture", overallStatus: "on-track",
    workItems: [{ activity: "Elevation design", location: "Studio", quantity: "", unit: "", status: "done" }],
    manpower:  [{ trade: "Architect", planned: 2, present: 2, remark: "" }],
    equipment: [], materials: [], issues: [],
    progress: { structural: 0, finishing: 0, mepElec: 0, mepPlumb: 0, overall: 8 },
    safetyObs: "", tomorrowPlan: [{ activity: "Interior layout", location: "Studio", target: "Draft" }],
    pmRemarks: "Design finalized", submittedBy: "Arjun (Architect)", submissionTime: "15:20",
    photoNames: [], videoNames: [], approved: false },
  { id: 5, projectName: "Bridge Project", date: "2026-04-08", phase: "Safety", overallStatus: "critical",
    workItems: [{ activity: "Safety inspection", location: "Site", quantity: "", unit: "", status: "in-progress" }],
    manpower:  [{ trade: "Safety Officer", planned: 2, present: 1, remark: "1 absent" }],
    equipment: [], materials: [],
    issues: [{ issue: "Unsafe scaffolding", impact: "Work halted", action: "Scaffolding team called", responsible: "Site Engineer", targetDate: "2026-04-09" }],
    progress: { structural: 70, finishing: 0, mepElec: 0, mepPlumb: 0, overall: 50 },
    safetyObs: "STOP WORK order issued for Zone C",
    tomorrowPlan: [{ activity: "Re-inspect scaffolding", location: "Zone C", target: "Clear by 10AM" }],
    pmRemarks: "Immediate correction required", submittedBy: "Kiran (Safety Officer)", submissionTime: "14:30",
    photoNames: [], videoNames: [], approved: false },
];

// ─── Main Component ───────────────────────────────────────────
export default function DailyUpdates() {
  const [page, setPage] = useState("list"); // list | new | view | edit
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState("work");
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [msgModal, setMsgModal] = useState(null); // { to, report }
  const [msgText, setMsgText] = useState("");
  const [toast, setToast] = useState(null);
  useEffect(() => {
  fetchReports();
}, []);

const fetchReports = async () => {
  try {
    const res = await API.get("/daily-reports");

    const formatted = res.data.map(item => ({
      ...item.data,
      id: item.id,
      approved: item.approved
    }));

    setUpdates(formatted);

  } catch (error) {
    console.error("FETCH ERROR:", error);
  }
};

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Form helpers ──
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setArrayRow = (key, idx, field, val) => {
    const arr = [...form[key]];
    arr[idx] = { ...arr[idx], [field]: val };
    setField(key, arr);
  };
  const addRow = (key, template) => setField(key, [...form[key], { ...template }]);
  const removeRow = (key, idx) => {
    const arr = form[key].filter((_, i) => i !== idx);
    setField(key, arr.length ? arr : form[key]);
  };

  // ─── Navigation ──
  const goNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setActiveTab("work");
    setPage("new");
  };
  const goEdit = (u) => {
    setForm({ ...EMPTY_FORM, ...u });
    setEditingId(u.id);
    setActiveTab("work");
    setPage("edit");
  };
  const goView = (u) => {
    setSelectedReport(u);
    setPage("view");
  };
  const goList = () => setPage("list");

  // ─── Save ──
 const handleSave = async () => {
  try {
    await API.post("/daily-reports", {
      project_name: form.projectName,
      date: form.date,
      phase: form.phase,
      overall_status: form.overallStatus,
      submitted_by: form.submittedBy,
      submission_time: form.submissionTime,
      data: form,
    });

    showToast("Saved to backend!");
    fetchReports();
    setPage("list");

  } catch (error) {
    console.error("SAVE ERROR:", error);
    alert("Failed to save");
  }
};

  // ─── Approve ──
  const handleApprove = async (id) => {
  try {
    await API.put(`/daily-reports/approve/${id}`);
    fetchReports();
    showToast("Report approved!");
  } catch (err) {
    console.error(err);
  }
};

  // ─── Send Message ──
  const handleSendMessage = () => {
    if (!msgText.trim()) return;
    showToast(`Message sent to ${msgModal.to}!`);
    setMsgModal(null);
    setMsgText("");
  };

  const tabs = [
    { id: "work", label: "Work" },
    { id: "manpower", label: "Manpower" },
    { id: "equipment", label: "Equipment" },
    { id: "material", label: "Material" },
    { id: "issues", label: "Issues" },
    { id: "progress", label: "Progress" },
    { id: "safety", label: "Safety" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "media", label: "Media" },
    { id: "remarks", label: "Remarks" },
  ];

  // ════════════════════════════════════
  //  PAGE: LIST
  // ════════════════════════════════════
  if (page === "list") {
    const stats = [
      { label: "Total Reports", val: updates.length, icon: "📋" },
      { label: "Projects", val: new Set(updates.map(u => u.projectName)).size, icon: "🏗" },
      { label: "Issues Logged", val: updates.reduce((a, u) => a + (u.issues||[]).filter(i => i.issue).length, 0), icon: "⚠️" },
      { label: "On Track", val: updates.filter(u => u.overallStatus === "on-track").length, icon: "✅" },
    ];
    return (
      <div className="du-page">
        {toast && <div className={`du-toast du-toast--${toast.type}`}>{toast.msg}</div>}

        <div className="du-header">
          <div>
            <div className="du-eyebrow">Construction Management</div>
            <h1 className="du-title">Daily Site Reports</h1>
          </div>
          <button className="btn-primary" onClick={goNew}>+ New Report</button>
        </div>

        <div className="du-stats-grid">
          {stats.map(s => (
            <div key={s.label} className="du-stat-card">
              <div className="du-stat-icon">{s.icon}</div>
              <div className="du-stat-info">
                <div className="du-stat-val">{s.val}</div>
                <div className="du-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {updates.length === 0 ? (
          <div className="du-empty">
            <div className="du-empty-icon">📋</div>
            <div className="du-empty-msg">No reports yet</div>
            <div className="du-empty-sub">Create your first daily site report</div>
          </div>
        ) : (
          <div className="du-report-list">
            {updates.map(u => {
              const sc = STATUS_COLORS[u.overallStatus] || STATUS_COLORS["on-track"];
              const issueCount = (u.issues||[]).filter(i => i.issue).length;
              const isPM = u.submittedBy?.toLowerCase().includes("project manager") ||
                           u.submittedBy?.toLowerCase().includes("pm");
              return (
                <div key={u.id} className="du-report-card" data-status={u.overallStatus}>
                  <div className="du-rc-top">
                    <div>
                      <div className="du-rc-project">{u.projectName}</div>
                      <div className="du-rc-meta">
                        {u.phase && <span>{u.phase} · </span>}
                        <span>{u.date}</span>
                        {u.reportNo && <span> · #{u.reportNo}</span>}
                      </div>
                    </div>
                    <div className="du-rc-top-right">
                      {u.approved && <span className="du-approved-badge">✓ Approved</span>}
                      <span className="du-status-badge" data-status={u.overallStatus}>
                        <span className="du-status-dot" style={{ background: sc.dot }} />
                        {sc.label}
                      </span>
                    </div>
                  </div>

                  <div className="du-rc-stats">
                    <span className="du-rc-stat">🏗 {(u.workItems||[]).filter(w => w.activity).length} work items</span>
                    <span className="du-rc-stat">👷 {(u.manpower||[]).filter(m => m.trade).length} trades</span>
                    {issueCount > 0 && <span className="du-rc-stat du-rc-stat--issue">⚠️ {issueCount} issues</span>}
                    {((u.photoNames?.length||0) + (u.videoNames?.length||0)) > 0 &&
                      <span className="du-rc-stat">📸 {(u.photoNames?.length||0)+(u.videoNames?.length||0)} media</span>}
                  </div>

                  {u.pmRemarks && (
                    <div className="du-rc-remarks">
                      "{u.pmRemarks.slice(0, 120)}{u.pmRemarks.length > 120 ? "…" : ""}"
                    </div>
                  )}

                  <div className="du-rc-footer">
                    <span className="du-rc-by">{u.submittedBy || "Project Manager"} · {u.submissionTime || u.date}</span>
                    <div className="du-rc-actions">
                      {isPM && (
                        <button className="btn-edit" onClick={() => goEdit(u)}>✏ Edit</button>
                      )}
                      {!u.approved && (
                        <button className="btn-approve" onClick={() => handleApprove(u.id)}>✓ Approve</button>
                      )}
                      <button className="btn-msg" onClick={() => { setMsgModal({ to: u.submittedBy || "Site Team", report: u }); }}>
                        💬 Message
                      </button>
                      <button className="btn-view" onClick={() => goView(u)}>View Report →</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message Modal */}
        {msgModal && (
          <div className="du-overlay" onClick={() => setMsgModal(null)}>
            <div className="du-msg-modal" onClick={e => e.stopPropagation()}>
              <div className="du-msg-header">
                <div className="du-msg-title">💬 Send Message</div>
                <button className="du-close-btn" onClick={() => setMsgModal(null)}>✕</button>
              </div>
              <div className="du-msg-body">
                <div className="du-msg-to">To: <strong>{msgModal.to}</strong></div>
                <div className="du-msg-project">Re: {msgModal.report.projectName} — {msgModal.report.date}</div>
                <textarea
                  className="du-msg-textarea"
                  placeholder="Type your message here..."
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="du-msg-footer">
                <button className="btn-cancel" onClick={() => setMsgModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleSendMessage}>Send Message</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════
  //  PAGE: NEW / EDIT REPORT
  // ════════════════════════════════════
  if (page === "new" || page === "edit") {
    return (
      <div className="du-form-page">
        {toast && <div className={`du-toast du-toast--${toast.type}`}>{toast.msg}</div>}

        {/* Page Header */}
        <div className="du-form-topbar">
          <button className="btn-back" onClick={goList}>← Back to Reports</button>
          <div className="du-form-topbar-title">
            {editingId ? "✏ Edit Report" : "New Daily Site Report"}
          </div>
          <div className="du-form-topbar-actions">
            <button className="btn-cancel" onClick={goList}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>
              {editingId ? "Update Report" : "Save Report"}
            </button>
          </div>
        </div>

        <div className="du-form-body">
          {/* Meta Section */}
          <div className="du-form-section du-form-meta-section">
            <div className="du-form-section-title">📋 Report Details</div>
            <div className="du-meta-grid">
              <FormField label="Date *">
                <input className="du-input" type="date" value={form.date} onChange={e => setField("date", e.target.value)} />
              </FormField>
              <FormField label="Report No.">
                <input className="du-input" placeholder="DSR-2025-001" value={form.reportNo} onChange={e => setField("reportNo", e.target.value)} />
              </FormField>
              <FormField label="Project Name *">
                <input className="du-input" placeholder="e.g. Greenfield Tower" value={form.projectName} onChange={e => setField("projectName", e.target.value)} />
              </FormField>
              <FormField label="Phase">
                <input className="du-input" placeholder="e.g. Phase 2 - Structure" value={form.phase} onChange={e => setField("phase", e.target.value)} />
              </FormField>
              <FormField label="Weather">
                <input className="du-input" placeholder="Clear / Rainy / Cloudy" value={form.weather} onChange={e => setField("weather", e.target.value)} />
              </FormField>
              <FormField label="Temp (°C)">
                <input className="du-input" placeholder="32" value={form.weatherTemp} onChange={e => setField("weatherTemp", e.target.value)} />
              </FormField>
              <FormField label="Overall Status">
                <select className="du-input" value={form.overallStatus} onChange={e => setField("overallStatus", e.target.value)}>
                  <option value="on-track">On Track</option>
                  <option value="delayed">Delayed</option>
                  <option value="critical">Critical</option>
                  <option value="ahead">Ahead of Schedule</option>
                </select>
              </FormField>
            </div>
          </div>

          {/* Tabs */}
          <div className="du-form-section">
            <div className="du-tab-bar">
              {tabs.map(t => (
                <button key={t.id} className={`du-tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="du-tab-body">
              {/* WORK */}
              {activeTab === "work" && (
                <FormSection title="Work Completed Today">
                  <div className="du-table-head">
                    {["Activity", "Location", "Qty", "Unit", "Status", ""].map((c,i) => <div key={i} className="du-th-cell">{c}</div>)}
                  </div>
                  {form.workItems.map((row, i) => (
                    <div key={i} className="du-table-row">
                      <input className="du-input du-td-3" placeholder="Column casting..." value={row.activity} onChange={e => setArrayRow("workItems", i, "activity", e.target.value)} />
                      <input className="du-input du-td-2" placeholder="Grid C3, Lvl 4" value={row.location} onChange={e => setArrayRow("workItems", i, "location", e.target.value)} />
                      <input className="du-input du-td-1" placeholder="6" value={row.quantity} onChange={e => setArrayRow("workItems", i, "quantity", e.target.value)} />
                      <input className="du-input du-td-1" placeholder="Nos" value={row.unit} onChange={e => setArrayRow("workItems", i, "unit", e.target.value)} />
                      <select className="du-input du-td-2" value={row.status} onChange={e => setArrayRow("workItems", i, "status", e.target.value)}>
                        <option value="done">Done</option><option value="in-progress">In Progress</option><option value="pending">Pending</option>
                      </select>
                      <button className="du-remove-btn" onClick={() => removeRow("workItems", i)}>✕</button>
                    </div>
                  ))}
                  <button className="du-add-row-btn" onClick={() => addRow("workItems", { activity: "", location: "", quantity: "", unit: "", status: "done" })}>+ Add Row</button>
                </FormSection>
              )}

              {/* MANPOWER */}
              {activeTab === "manpower" && (
                <FormSection title="Manpower on Site">
                  <div className="du-table-head">
                    {["Trade", "Planned", "Present", "Remark", ""].map((c,i) => <div key={i} className="du-th-cell">{c}</div>)}
                  </div>
                  {form.manpower.map((row, i) => (
                    <div key={i} className="du-table-row">
                      <input className="du-input du-td-3" placeholder="Mason" value={row.trade} onChange={e => setArrayRow("manpower", i, "trade", e.target.value)} />
                      <input className="du-input du-td-1" placeholder="12" value={row.planned} onChange={e => setArrayRow("manpower", i, "planned", e.target.value)} />
                      <input className="du-input du-td-1" placeholder="10" value={row.present} onChange={e => setArrayRow("manpower", i, "present", e.target.value)} />
                      <input className="du-input du-td-3" placeholder="2 absent" value={row.remark} onChange={e => setArrayRow("manpower", i, "remark", e.target.value)} />
                      <button className="du-remove-btn" onClick={() => removeRow("manpower", i)}>✕</button>
                    </div>
                  ))}
                  <button className="du-add-row-btn" onClick={() => addRow("manpower", { trade: "", planned: "", present: "", remark: "" })}>+ Add Row</button>
                </FormSection>
              )}

              {/* EQUIPMENT */}
              {activeTab === "equipment" && (
                <FormSection title="Equipment and Machinery">
                  <div className="du-table-head">
                    {["Equipment", "Nos.", "Status", "Hours", ""].map((c,i) => <div key={i} className="du-th-cell">{c}</div>)}
                  </div>
                  {form.equipment.map((row, i) => (
                    <div key={i} className="du-table-row">
                      <input className="du-input du-td-3" placeholder="Tower Crane" value={row.name} onChange={e => setArrayRow("equipment", i, "name", e.target.value)} />
                      <input className="du-input du-td-1" placeholder="1" value={row.nos} onChange={e => setArrayRow("equipment", i, "nos", e.target.value)} />
                      <select className="du-input du-td-2" value={row.status} onChange={e => setArrayRow("equipment", i, "status", e.target.value)}>
                        <option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="idle">Idle</option>
                      </select>
                      <input className="du-input du-td-1" placeholder="7" value={row.hours} onChange={e => setArrayRow("equipment", i, "hours", e.target.value)} />
                      <button className="du-remove-btn" onClick={() => removeRow("equipment", i)}>✕</button>
                    </div>
                  ))}
                  <button className="du-add-row-btn" onClick={() => addRow("equipment", { name: "", nos: "", status: "operational", hours: "" })}>+ Add Row</button>
                </FormSection>
              )}

              {/* MATERIAL */}
              {activeTab === "material" && (
                <FormSection title="Material Received Today">
                  <div className="du-table-head">
                    {["Material", "Qty", "Supplier", "Challan", "QC", ""].map((c,i) => <div key={i} className="du-th-cell">{c}</div>)}
                  </div>
                  {form.materials.map((row, i) => (
                    <div key={i} className="du-table-row">
                      <input className="du-input du-td-3" placeholder="TMT Steel Fe500" value={row.material} onChange={e => setArrayRow("materials", i, "material", e.target.value)} />
                      <input className="du-input du-td-1" placeholder="8 MT" value={row.quantity} onChange={e => setArrayRow("materials", i, "quantity", e.target.value)} />
                      <input className="du-input du-td-2" placeholder="Supplier" value={row.supplier} onChange={e => setArrayRow("materials", i, "supplier", e.target.value)} />
                      <input className="du-input du-td-2" placeholder="CH-2045" value={row.challan} onChange={e => setArrayRow("materials", i, "challan", e.target.value)} />
                      <select className="du-input du-td-1" value={row.qc} onChange={e => setArrayRow("materials", i, "qc", e.target.value)}>
                        <option value="passed">Passed</option><option value="failed">Failed</option><option value="pending">Pending</option>
                      </select>
                      <button className="du-remove-btn" onClick={() => removeRow("materials", i)}>✕</button>
                    </div>
                  ))}
                  <button className="du-add-row-btn" onClick={() => addRow("materials", { material: "", quantity: "", supplier: "", challan: "", qc: "passed" })}>+ Add Row</button>
                </FormSection>
              )}

              {/* ISSUES */}
              {activeTab === "issues" && (
                <FormSection title="Issues / Problems Faced">
                  {form.issues.map((row, i) => (
                    <div key={i} className="du-issue-block">
                      <div className="du-issue-num">#{i+1}</div>
                      <div className="du-issue-fields">
                        <div className="du-issue-row">
                          <FormField label="Issue / Problem">
                            <input className="du-input" placeholder="JCB breakdown" value={row.issue} onChange={e => setArrayRow("issues", i, "issue", e.target.value)} />
                          </FormField>
                          <FormField label="Impact">
                            <input className="du-input" placeholder="Backfilling delayed 2 hrs" value={row.impact} onChange={e => setArrayRow("issues", i, "impact", e.target.value)} />
                          </FormField>
                        </div>
                        <div className="du-issue-row">
                          <FormField label="Action Taken">
                            <input className="du-input" placeholder="Mechanic called" value={row.action} onChange={e => setArrayRow("issues", i, "action", e.target.value)} />
                          </FormField>
                          <FormField label="Responsible">
                            <input className="du-input" placeholder="Site Engineer" value={row.responsible} onChange={e => setArrayRow("issues", i, "responsible", e.target.value)} />
                          </FormField>
                          <FormField label="Target Date">
                            <input className="du-input" type="date" value={row.targetDate} onChange={e => setArrayRow("issues", i, "targetDate", e.target.value)} />
                          </FormField>
                        </div>
                      </div>
                      <button className="du-remove-btn" onClick={() => removeRow("issues", i)}>✕</button>
                    </div>
                  ))}
                  <button className="du-add-row-btn" onClick={() => addRow("issues", { issue: "", impact: "", action: "", responsible: "", targetDate: "" })}>+ Add Issue</button>
                </FormSection>
              )}

              {/* PROGRESS */}
              {activeTab === "progress" && (
                <FormSection title="Overall Project Progress (%)">
                  {[
                    { key: "structural", label: "Structural Work" },
                    { key: "finishing",  label: "Finishing Work" },
                    { key: "mepElec",    label: "MEP - Electrical" },
                    { key: "mepPlumb",   label: "MEP - Plumbing" },
                    { key: "overall",    label: "Overall Project" },
                  ].map(({ key, label }) => (
                    <div key={key} className="du-progress-row">
                      <div className="du-prog-label">{label}</div>
                      <div className="du-prog-wrap">
                        <input className="du-input du-prog-input" type="number" min="0" max="100" placeholder="0"
                          value={form.progress[key]} onChange={e => setField("progress", { ...form.progress, [key]: e.target.value })} />
                        <div className="du-prog-track">
                          <div className="du-prog-bar" style={{ width: `${Math.min(100, form.progress[key] || 0)}%` }} />
                        </div>
                        <span className="du-prog-pct">{form.progress[key] || 0}%</span>
                      </div>
                    </div>
                  ))}
                </FormSection>
              )}

              {/* SAFETY */}
              {activeTab === "safety" && (
                <FormSection title="Safety Observations">
                  <FormField label="Safety Notes (one per line)">
                    <textarea className="du-input du-textarea" placeholder="Toolbox talk conducted at 8:00 AM&#10;All workers wearing helmets and harness"
                      value={form.safetyObs} onChange={e => setField("safetyObs", e.target.value)} />
                  </FormField>
                </FormSection>
              )}

              {/* TOMORROW */}
              {activeTab === "tomorrow" && (
                <FormSection title="Tomorrow's Work Plan">
                  <div className="du-table-head">
                    {["Planned Activity", "Location", "Target", ""].map((c,i) => <div key={i} className="du-th-cell">{c}</div>)}
                  </div>
                  {form.tomorrowPlan.map((row, i) => (
                    <div key={i} className="du-table-row">
                      <input className="du-input du-td-3" placeholder="Continue slab shuttering" value={row.activity} onChange={e => setArrayRow("tomorrowPlan", i, "activity", e.target.value)} />
                      <input className="du-input du-td-2" placeholder="Level 4, Zone C" value={row.location} onChange={e => setArrayRow("tomorrowPlan", i, "location", e.target.value)} />
                      <input className="du-input du-td-2" placeholder="200 Sqm" value={row.target} onChange={e => setArrayRow("tomorrowPlan", i, "target", e.target.value)} />
                      <button className="du-remove-btn" onClick={() => removeRow("tomorrowPlan", i)}>✕</button>
                    </div>
                  ))}
                  <button className="du-add-row-btn" onClick={() => addRow("tomorrowPlan", { activity: "", location: "", target: "" })}>+ Add Row</button>
                </FormSection>
              )}

              {/* MEDIA */}
              {activeTab === "media" && (
                <FormSection title="Photos and Videos">
                  <div className="du-upload-grid">
                    <div>
                      <div className="du-field-label">Photos</div>
                      <label className="du-upload-box">
                        📷 Upload Photos
                        <input type="file" multiple accept="image/*" style={{ display: "none" }}
                          onChange={e => setField("photoNames", Array.from(e.target.files).map(f => f.name))} />
                      </label>
                      {form.photoNames?.length > 0 && <ul className="du-file-list">{form.photoNames.map((n,i) => <li key={i}>📄 {n}</li>)}</ul>}
                    </div>
                    <div>
                      <div className="du-field-label">Videos</div>
                      <label className="du-upload-box">
                        🎥 Upload Videos
                        <input type="file" multiple accept="video/*" style={{ display: "none" }}
                          onChange={e => setField("videoNames", Array.from(e.target.files).map(f => f.name))} />
                      </label>
                      {form.videoNames?.length > 0 && <ul className="du-file-list">{form.videoNames.map((n,i) => <li key={i}>🎬 {n}</li>)}</ul>}
                    </div>
                  </div>
                </FormSection>
              )}

              {/* REMARKS */}
              {activeTab === "remarks" && (
                <FormSection title="PM Remarks and Submission">
                  <FormField label="PM Remarks">
                    <textarea className="du-input du-textarea" placeholder="Overall site status, client visit plans, coordination notes..."
                      value={form.pmRemarks} onChange={e => setField("pmRemarks", e.target.value)} />
                  </FormField>
                  <div className="du-two-col">
                    <FormField label="Submitted By">
                      <input className="du-input" placeholder="Rajesh Nair, PM" value={form.submittedBy} onChange={e => setField("submittedBy", e.target.value)} />
                    </FormField>
                    <FormField label="Submission Time">
                      <input className="du-input" type="time" value={form.submissionTime} onChange={e => setField("submissionTime", e.target.value)} />
                    </FormField>
                  </div>
                </FormSection>
              )}
            </div>
          </div>
        </div>

        {/* Sticky bottom bar */}
        <div className="du-form-sticky-footer">
          <div className="du-form-sticky-inner">
            <span className="du-form-progress-label">
              {form.projectName ? `📋 ${form.projectName}` : "New Report"} · {form.date || "No date set"}
            </span>
            <div className="du-form-footer-actions">
              <button className="btn-cancel" onClick={goList}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>
                {editingId ? "Update Report" : "Save Report"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════
  //  PAGE: VIEW REPORT
  // ════════════════════════════════════
  if (page === "view" && selectedReport) {
    const r = selectedReport;
    const sc = STATUS_COLORS[r.overallStatus] || STATUS_COLORS["on-track"];
    return (
      <div className="du-view-page">
        {toast && <div className={`du-toast du-toast--${toast.type}`}>{toast.msg}</div>}

        {/* View Topbar */}
        <div className="du-view-topbar">
          <button className="btn-back" onClick={goList}>← Back to Reports</button>
          <div className="du-view-topbar-actions">
            <button className="btn-msg" onClick={() => { setMsgModal({ to: r.submittedBy || "Site Team", report: r }); }}>
              💬 Send Message
            </button>
            <button className="btn-edit" onClick={() => goEdit(r)}>✏ Edit</button>
            {!r.approved ? (
              <button className="btn-approve-big" onClick={() => handleApprove(r.id)}>✓ Approve Report</button>
            ) : (
              <span className="du-approved-tag">✓ Approved</span>
            )}
          </div>
        </div>

        <div className="du-view-body">
          {/* Report Header */}
          <div className="du-view-header">
            <div>
              <div className="du-view-project">{r.projectName}</div>
              {r.phase && <div className="du-view-phase">{r.phase}</div>}
            </div>
            <div className="du-view-header-right">
              <span className="du-status-badge" data-status={r.overallStatus}>
                <span className="du-status-dot" style={{ background: sc.dot }} />
                {sc.label}
              </span>
              <div className="du-view-date">{r.date}{r.reportNo ? ` · #${r.reportNo}` : ""}</div>
              <div className="du-view-weather">{r.weather}{r.weatherTemp ? ` · ${r.weatherTemp}°C` : ""}</div>
            </div>
          </div>

          {/* Sections */}
          <ViewSection title="1. Work Completed Today">
            {(r.workItems||[]).filter(w => w.activity).length === 0 ? <Nil /> :
              (r.workItems||[]).filter(w => w.activity).map((w,i) => (
                <div key={i} className="du-rv-row">
                  <span className="du-rv-col-3">{w.activity}</span>
                  <span className="du-rv-col-2 du-muted">{w.location}</span>
                  <span className="du-rv-col-1 du-muted">{w.quantity} {w.unit}</span>
                  <span className="du-rv-col-1"><StatusPill status={w.status} map={WORK_STATUS} /></span>
                </div>
              ))}
          </ViewSection>

          <ViewSection title="2. Manpower on Site">
            {(r.manpower||[]).filter(m => m.trade).length === 0 ? <Nil /> :
              (r.manpower||[]).filter(m => m.trade).map((m,i) => (
                <div key={i} className="du-rv-row">
                  <span className="du-rv-col-3">{m.trade}</span>
                  <span className="du-rv-col-1 du-muted">Planned: {m.planned}</span>
                  <span className={`du-rv-col-1 ${m.present < m.planned ? "du-danger" : "du-success"}`}>Present: {m.present}</span>
                  <span className="du-rv-col-2 du-muted">{m.remark}</span>
                </div>
              ))}
          </ViewSection>

          <ViewSection title="3. Equipment and Machinery">
            {(r.equipment||[]).filter(e => e.name).length === 0 ? <Nil /> :
              (r.equipment||[]).filter(e => e.name).map((e,i) => (
                <div key={i} className="du-rv-row">
                  <span className="du-rv-col-3">{e.name}</span>
                  <span className="du-rv-col-1 du-muted">{e.nos} unit(s)</span>
                  <span className="du-rv-col-2"><StatusPill status={e.status} map={EQUIP_STATUS} /></span>
                  <span className="du-rv-col-1 du-muted">{e.hours} hrs</span>
                </div>
              ))}
          </ViewSection>

          <ViewSection title="4. Material Received">
            {(r.materials||[]).filter(m => m.material).length === 0 ? <Nil /> :
              (r.materials||[]).filter(m => m.material).map((m,i) => (
                <div key={i} className="du-rv-row">
                  <span className="du-rv-col-3">{m.material}</span>
                  <span className="du-rv-col-1 du-muted">{m.quantity}</span>
                  <span className="du-rv-col-2 du-muted">{m.supplier}</span>
                  <span className="du-rv-col-1 du-muted">{m.challan}</span>
                  <span className="du-rv-col-1"><StatusPill status={m.qc} map={QC_STATUS} /></span>
                </div>
              ))}
          </ViewSection>

          <ViewSection title="5. Issues / Problems">
            {(r.issues||[]).filter(i => i.issue).length === 0 ? <Nil text="No issues logged ✓" /> :
              (r.issues||[]).filter(i => i.issue).map((issue,i) => (
                <div key={i} className="du-issue-card">
                  <div className="du-issue-card-title">⚠ {issue.issue}</div>
                  {issue.impact   && <div className="du-issue-impact">Impact: {issue.impact}</div>}
                  {issue.action   && <div className="du-issue-action">Action: {issue.action}</div>}
                  <div className="du-issue-meta">
                    {issue.responsible && <span>By: {issue.responsible}</span>}
                    {issue.targetDate  && <span> · Target: {issue.targetDate}</span>}
                  </div>
                </div>
              ))}
          </ViewSection>

          <ViewSection title="6. Overall Progress">
            {Object.entries(r.progress||{}).map(([k, v]) => {
              if (!v) return null;
              const labels = { structural: "Structural", finishing: "Finishing", mepElec: "MEP Electrical", mepPlumb: "MEP Plumbing", overall: "Overall Project" };
              return (
                <div key={k} className="du-rv-progress-row">
                  <div className="du-rv-prog-label">{labels[k]}</div>
                  <div className="du-prog-track du-rv-prog-track">
                    <div className="du-prog-bar" style={{ width: `${Math.min(100, v)}%` }} />
                  </div>
                  <span className="du-prog-pct">{v}%</span>
                </div>
              );
            })}
          </ViewSection>

          {r.safetyObs && (
            <ViewSection title="7. Safety Observations">
              {r.safetyObs.split("\n").filter(Boolean).map((l,i) => (
                <div key={i} className="du-safety-line">🦺 {l}</div>
              ))}
            </ViewSection>
          )}

          <ViewSection title="8. Tomorrow's Plan">
            {(r.tomorrowPlan||[]).filter(t => t.activity).length === 0 ? <Nil /> :
              (r.tomorrowPlan||[]).filter(t => t.activity).map((t,i) => (
                <div key={i} className="du-rv-row">
                  <span className="du-rv-col-3">{t.activity}</span>
                  <span className="du-rv-col-2 du-muted">{t.location}</span>
                  <span className="du-rv-col-1 du-accent">{t.target}</span>
                </div>
              ))}
          </ViewSection>

          {((r.photoNames?.length||0) + (r.videoNames?.length||0)) > 0 && (
            <ViewSection title="9. Media">
              {r.photoNames?.map((n,i) => <div key={i} className="du-media-item">📷 {n}</div>)}
              {r.videoNames?.map((n,i) => <div key={i} className="du-media-item">🎥 {n}</div>)}
            </ViewSection>
          )}

          {r.pmRemarks && (
            <ViewSection title="10. PM Remarks">
              <div className="du-rv-remarks">{r.pmRemarks}</div>
            </ViewSection>
          )}

          <div className="du-rv-footer">
            <span>Submitted by: <strong>{r.submittedBy || "Project Manager"}</strong></span>
            {r.submissionTime && <span> · {r.submissionTime}</span>}
            <div className="du-rv-dist">Distribution: Client · Site Engineer · Consultant · Management</div>
          </div>
        </div>

        {/* Message Modal */}
        {msgModal && (
          <div className="du-overlay" onClick={() => setMsgModal(null)}>
            <div className="du-msg-modal" onClick={e => e.stopPropagation()}>
              <div className="du-msg-header">
                <div className="du-msg-title">💬 Send Message</div>
                <button className="du-close-btn" onClick={() => setMsgModal(null)}>✕</button>
              </div>
              <div className="du-msg-body">
                <div className="du-msg-to">To: <strong>{msgModal.to}</strong></div>
                <div className="du-msg-project">Re: {msgModal.report.projectName} — {msgModal.report.date}</div>
                <textarea className="du-msg-textarea" placeholder="Type your message..." value={msgText} onChange={e => setMsgText(e.target.value)} rows={5} />
              </div>
              <div className="du-msg-footer">
                <button className="btn-cancel" onClick={() => setMsgModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleSendMessage}>Send Message</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Helper Components ────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div className="du-field">
      <label className="du-field-label">{label}</label>
      {children}
    </div>
  );
}
function FormSection({ title, children }) {
  return (
    <div className="du-section">
      <div className="du-section-title">{title}</div>
      {children}
    </div>
  );
}
function ViewSection({ title, children }) {
  return (
    <div className="du-rv-section">
      <div className="du-rv-section-title">{title}</div>
      {children}
    </div>
  );
}
function Nil({ text = "No entries" }) {
  return <div className="du-rv-nil">{text}</div>;
}
function StatusPill({ status, map }) {
  const colorMap = {
    done: "#d1fae5|#065f46", "in-progress": "#fef3c7|#92400e", pending: "#f1f5f9|#64748b",
    operational: "#d1fae5|#065f46", maintenance: "#fef3c7|#92400e", idle: "#f1f5f9|#64748b",
    passed: "#d1fae5|#065f46", failed: "#fee2e2|#991b1b",
  };
  const [bg, color] = (colorMap[status] || "#f1f5f9|#64748b").split("|");
  return <span style={{ background: bg, color, fontSize: 11, padding: "2px 8px", borderRadius: 3, fontWeight: 600 }}>{map[status] || status}</span>;
}