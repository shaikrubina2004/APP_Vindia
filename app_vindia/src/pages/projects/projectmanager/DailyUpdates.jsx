import { useState } from "react";

const EMPTY_FORM = {
  date: "",
  reportNo: "",
  projectName: "",
  phase: "",
  weather: "Clear",
  weatherTemp: "",
  overallStatus: "on-track",

  workItems: [{ activity: "", location: "", quantity: "", unit: "", status: "done" }],
  manpower: [{ trade: "", planned: "", present: "", remark: "" }],
  equipment: [{ name: "", nos: "", status: "operational", hours: "" }],
  materials: [{ material: "", quantity: "", supplier: "", challan: "", qc: "passed" }],
  issues: [{ issue: "", impact: "", action: "", responsible: "", targetDate: "" }],
  progress: { structural: "", finishing: "", mepElec: "", mepPlumb: "", overall: "" },
  safetyObs: "",
  tomorrowPlan: [{ activity: "", location: "", target: "" }],
  pmRemarks: "",
  submittedBy: "",
  submissionTime: "",
  photos: [],
  videos: [],
};

const STATUS_COLORS = {
  "on-track": { bg: "#d1fae5", text: "#065f46", label: "On Track" },
  "delayed": { bg: "#fef3c7", text: "#92400e", label: "Delayed" },
  "critical": { bg: "#fee2e2", text: "#991b1b", label: "Critical" },
  "ahead": { bg: "#dbeafe", text: "#1e40af", label: "Ahead" },
};

const WORK_STATUS = { done: "✅ Done", "in-progress": "🔄 In Progress", pending: "⏳ Pending" };
const EQUIP_STATUS = { operational: "✅ Operational", maintenance: "🔧 Maintenance", idle: "⏸ Idle" };
const QC_STATUS = { passed: "✅ Passed", failed: "❌ Failed", pending: "⏳ Pending" };

export default function DailyUpdates() {
  const [updates, setUpdates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState("work");
  const [viewReport, setViewReport] = useState(null);
  const [photoNames, setPhotoNames] = useState([]);
  const [videoNames, setVideoNames] = useState([]);

  // ── helpers ──
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

  const handleSave = () => {
    if (!form.date || !form.projectName) {
      alert("Date and Project Name are required.");
      return;
    }
    setUpdates(prev => [{ id: Date.now(), ...form, photoNames, videoNames }, ...prev]);
    setForm(EMPTY_FORM);
    setPhotoNames([]);
    setVideoNames([]);
    setShowModal(false);
    setActiveTab("work");
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

  return (
    <div style={styles.page}>
      {/* ── PAGE HEADER ── */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.eyebrow}>Construction Management</div>
          <h1 style={styles.pageTitle}>Daily Site Reports</h1>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowModal(true)}>+ New Report</button>
      </div>

      {/* ── STATS ── */}
      <div style={styles.statsGrid}>
        {[
          { label: "Total Reports", val: updates.length },
          { label: "Projects", val: new Set(updates.map(u => u.projectName)).size },
          { label: "Issues Logged", val: updates.reduce((a, u) => a + u.issues.filter(i => i.issue).length, 0) },
          { label: "On Track", val: updates.filter(u => u.overallStatus === "on-track").length },
        ].map(s => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statVal}>{s.val}</div>
            <div style={styles.statLbl}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── REPORT LIST ── */}
      {updates.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📋</div>
          <div style={styles.emptyMsg}>No reports yet</div>
          <div style={styles.emptySub}>Create your first daily site report</div>
        </div>
      ) : (
        <div style={styles.reportList}>
          {updates.map(u => {
            const sc = STATUS_COLORS[u.overallStatus] || STATUS_COLORS["on-track"];
            const issueCount = u.issues.filter(i => i.issue).length;
            return (
              <div key={u.id} style={styles.reportCard}>
                <div style={styles.rcTop}>
                  <div>
                    <div style={styles.rcProject}>{u.projectName}</div>
                    <div style={styles.rcMeta}>
                      {u.phase && <span>{u.phase} · </span>}
                      <span>{u.date}</span>
                      {u.reportNo && <span> · #{u.reportNo}</span>}
                    </div>
                  </div>
                  <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.text }}>{sc.label}</span>
                </div>
                <div style={styles.rcStats}>
                  <span style={styles.rcStat}>🏗 {u.workItems.filter(w => w.activity).length} work items</span>
                  <span style={styles.rcStat}>👷 {u.manpower.filter(m => m.trade).length} trades</span>
                  {issueCount > 0 && <span style={{ ...styles.rcStat, color: "#dc2626" }}>⚠️ {issueCount} issues</span>}
                  {(u.photoNames?.length > 0 || u.videoNames?.length > 0) && (
                    <span style={styles.rcStat}>📸 {(u.photoNames?.length || 0) + (u.videoNames?.length || 0)} media</span>
                  )}
                </div>
                {u.pmRemarks && <div style={styles.rcRemarks}>"{u.pmRemarks.slice(0, 120)}{u.pmRemarks.length > 120 ? "…" : ""}"</div>}
                <div style={styles.rcFooter}>
                  <span style={styles.rcBy}>{u.submittedBy || "Project Manager"} · {u.submissionTime || u.date}</span>
                  <button style={styles.btnView} onClick={() => setViewReport(u)}>View Full Report →</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════
          ADD REPORT MODAL
      ══════════════════════════════════════════ */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>New Daily Site Report</div>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* TOP META */}
            <div style={styles.metaBar}>
              <div style={styles.metaGrid}>
                <Field label="Date *">
                  <input style={styles.input} type="date" value={form.date} onChange={e => setField("date", e.target.value)} />
                </Field>
                <Field label="Report No.">
                  <input style={styles.input} placeholder="DSR-2025-001" value={form.reportNo} onChange={e => setField("reportNo", e.target.value)} />
                </Field>
                <Field label="Project Name *">
                  <input style={styles.input} placeholder="e.g. Greenfield Tower" value={form.projectName} onChange={e => setField("projectName", e.target.value)} />
                </Field>
                <Field label="Phase">
                  <input style={styles.input} placeholder="e.g. Phase 2 – Structure" value={form.phase} onChange={e => setField("phase", e.target.value)} />
                </Field>
                <Field label="Weather">
                  <input style={styles.input} placeholder="Clear / Rainy / Cloudy" value={form.weather} onChange={e => setField("weather", e.target.value)} />
                </Field>
                <Field label="Temp (°C)">
                  <input style={styles.input} placeholder="32" value={form.weatherTemp} onChange={e => setField("weatherTemp", e.target.value)} />
                </Field>
                <Field label="Overall Status">
                  <select style={styles.input} value={form.overallStatus} onChange={e => setField("overallStatus", e.target.value)}>
                    <option value="on-track">On Track</option>
                    <option value="delayed">Delayed</option>
                    <option value="critical">Critical</option>
                    <option value="ahead">Ahead of Schedule</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* TABS */}
            <div style={styles.tabBar}>
              {tabs.map(t => (
                <button key={t.id} style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={styles.tabBody}>
              {/* ── WORK DONE ── */}
              {activeTab === "work" && (
                <Section title="Work Completed Today">
                  <TableHead cols={["Activity", "Location", "Qty", "Unit", "Status", ""]} />
                  {form.workItems.map((row, i) => (
                    <div key={i} style={styles.tableRow}>
                      <input style={{ ...styles.input, ...styles.tdFlex3 }} placeholder="Column casting..." value={row.activity} onChange={e => setArrayRow("workItems", i, "activity", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex2 }} placeholder="Grid C3, Lvl 4" value={row.location} onChange={e => setArrayRow("workItems", i, "location", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex1 }} placeholder="6" value={row.quantity} onChange={e => setArrayRow("workItems", i, "quantity", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex1 }} placeholder="Nos" value={row.unit} onChange={e => setArrayRow("workItems", i, "unit", e.target.value)} />
                      <select style={{ ...styles.input, ...styles.tdFlex2 }} value={row.status} onChange={e => setArrayRow("workItems", i, "status", e.target.value)}>
                        <option value="done">Done</option>
                        <option value="in-progress">In Progress</option>
                        <option value="pending">Pending</option>
                      </select>
                      <button style={styles.removeBtn} onClick={() => removeRow("workItems", i)}>✕</button>
                    </div>
                  ))}
                  <button style={styles.addRowBtn} onClick={() => addRow("workItems", { activity: "", location: "", quantity: "", unit: "", status: "done" })}>+ Add Row</button>
                </Section>
              )}

              {/* ── MANPOWER ── */}
              {activeTab === "manpower" && (
                <Section title="Manpower on Site">
                  <TableHead cols={["Trade", "Planned", "Present", "Remark", ""]} />
                  {form.manpower.map((row, i) => (
                    <div key={i} style={styles.tableRow}>
                      <input style={{ ...styles.input, ...styles.tdFlex3 }} placeholder="Mason" value={row.trade} onChange={e => setArrayRow("manpower", i, "trade", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex1 }} placeholder="12" value={row.planned} onChange={e => setArrayRow("manpower", i, "planned", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex1 }} placeholder="10" value={row.present} onChange={e => setArrayRow("manpower", i, "present", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex3 }} placeholder="2 absent" value={row.remark} onChange={e => setArrayRow("manpower", i, "remark", e.target.value)} />
                      <button style={styles.removeBtn} onClick={() => removeRow("manpower", i)}>✕</button>
                    </div>
                  ))}
                  <button style={styles.addRowBtn} onClick={() => addRow("manpower", { trade: "", planned: "", present: "", remark: "" })}>+ Add Row</button>
                </Section>
              )}

              {/* ── EQUIPMENT ── */}
              {activeTab === "equipment" && (
                <Section title="Equipment & Machinery">
                  <TableHead cols={["Equipment", "Nos.", "Status", "Hours Worked", ""]} />
                  {form.equipment.map((row, i) => (
                    <div key={i} style={styles.tableRow}>
                      <input style={{ ...styles.input, ...styles.tdFlex3 }} placeholder="Tower Crane" value={row.name} onChange={e => setArrayRow("equipment", i, "name", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex1 }} placeholder="1" value={row.nos} onChange={e => setArrayRow("equipment", i, "nos", e.target.value)} />
                      <select style={{ ...styles.input, ...styles.tdFlex2 }} value={row.status} onChange={e => setArrayRow("equipment", i, "status", e.target.value)}>
                        <option value="operational">Operational</option>
                        <option value="maintenance">Under Maintenance</option>
                        <option value="idle">Idle</option>
                      </select>
                      <input style={{ ...styles.input, ...styles.tdFlex1 }} placeholder="7" value={row.hours} onChange={e => setArrayRow("equipment", i, "hours", e.target.value)} />
                      <button style={styles.removeBtn} onClick={() => removeRow("equipment", i)}>✕</button>
                    </div>
                  ))}
                  <button style={styles.addRowBtn} onClick={() => addRow("equipment", { name: "", nos: "", status: "operational", hours: "" })}>+ Add Row</button>
                </Section>
              )}

              {/* ── MATERIAL ── */}
              {activeTab === "material" && (
                <Section title="Material Received Today">
                  <TableHead cols={["Material", "Quantity", "Supplier", "Challan No.", "QC", ""]} />
                  {form.materials.map((row, i) => (
                    <div key={i} style={styles.tableRow}>
                      <input style={{ ...styles.input, ...styles.tdFlex3 }} placeholder="TMT Steel Fe500" value={row.material} onChange={e => setArrayRow("materials", i, "material", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex1 }} placeholder="8 MT" value={row.quantity} onChange={e => setArrayRow("materials", i, "quantity", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex2 }} placeholder="Supplier name" value={row.supplier} onChange={e => setArrayRow("materials", i, "supplier", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex2 }} placeholder="CH-2045" value={row.challan} onChange={e => setArrayRow("materials", i, "challan", e.target.value)} />
                      <select style={{ ...styles.input, ...styles.tdFlex1 }} value={row.qc} onChange={e => setArrayRow("materials", i, "qc", e.target.value)}>
                        <option value="passed">Passed</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                      </select>
                      <button style={styles.removeBtn} onClick={() => removeRow("materials", i)}>✕</button>
                    </div>
                  ))}
                  <button style={styles.addRowBtn} onClick={() => addRow("materials", { material: "", quantity: "", supplier: "", challan: "", qc: "passed" })}>+ Add Row</button>
                </Section>
              )}

              {/* ── ISSUES ── */}
              {activeTab === "issues" && (
                <Section title="Issues / Problems Faced">
                  {form.issues.map((row, i) => (
                    <div key={i} style={styles.issueBlock}>
                      <div style={styles.issueNum}>#{i + 1}</div>
                      <div style={styles.issueFields}>
                        <div style={styles.issueRow}>
                          <Field label="Issue / Problem">
                            <input style={styles.input} placeholder="JCB breakdown" value={row.issue} onChange={e => setArrayRow("issues", i, "issue", e.target.value)} />
                          </Field>
                          <Field label="Impact">
                            <input style={styles.input} placeholder="Backfilling delayed 2 hrs" value={row.impact} onChange={e => setArrayRow("issues", i, "impact", e.target.value)} />
                          </Field>
                        </div>
                        <div style={styles.issueRow}>
                          <Field label="Action Taken">
                            <input style={styles.input} placeholder="Mechanic called, repair by tomorrow" value={row.action} onChange={e => setArrayRow("issues", i, "action", e.target.value)} />
                          </Field>
                          <Field label="Responsible">
                            <input style={styles.input} placeholder="Site Engineer" value={row.responsible} onChange={e => setArrayRow("issues", i, "responsible", e.target.value)} />
                          </Field>
                          <Field label="Target Date">
                            <input style={styles.input} type="date" value={row.targetDate} onChange={e => setArrayRow("issues", i, "targetDate", e.target.value)} />
                          </Field>
                        </div>
                      </div>
                      <button style={styles.removeBtn} onClick={() => removeRow("issues", i)}>✕</button>
                    </div>
                  ))}
                  <button style={styles.addRowBtn} onClick={() => addRow("issues", { issue: "", impact: "", action: "", responsible: "", targetDate: "" })}>+ Add Issue</button>
                </Section>
              )}

              {/* ── PROGRESS ── */}
              {activeTab === "progress" && (
                <Section title="Overall Project Progress (%)">
                  {[
                    { key: "structural", label: "Structural Work" },
                    { key: "finishing", label: "Finishing Work" },
                    { key: "mepElec", label: "MEP – Electrical" },
                    { key: "mepPlumb", label: "MEP – Plumbing" },
                    { key: "overall", label: "Overall Project" },
                  ].map(({ key, label }) => (
                    <div key={key} style={styles.progressRow}>
                      <div style={styles.progLabel}>{label}</div>
                      <div style={styles.progInputWrap}>
                        <input
                          style={{ ...styles.input, width: 80 }}
                          type="number"
                          min="0" max="100"
                          placeholder="0"
                          value={form.progress[key]}
                          onChange={e => setField("progress", { ...form.progress, [key]: e.target.value })}
                        />
                        <div style={styles.progTrack}>
                          <div style={{ ...styles.progBar, width: `${Math.min(100, form.progress[key] || 0)}%` }} />
                        </div>
                        <span style={styles.progPct}>{form.progress[key] || 0}%</span>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* ── SAFETY ── */}
              {activeTab === "safety" && (
                <Section title="Safety Observations">
                  <Field label="Safety Notes (one per line)">
                    <textarea
                      style={{ ...styles.input, minHeight: 160, resize: "vertical" }}
                      placeholder={"✅ Toolbox talk conducted at 8:00 AM — Topic: Working at Height\n✅ All workers wearing PPE\n⚠️ 1 worker found without harness at Level 4 — Warning issued\n✅ No Lost Time Injury (LTI) today"}
                      value={form.safetyObs}
                      onChange={e => setField("safetyObs", e.target.value)}
                    />
                  </Field>
                </Section>
              )}

              {/* ── TOMORROW ── */}
              {activeTab === "tomorrow" && (
                <Section title="Tomorrow's Work Plan">
                  <TableHead cols={["Planned Activity", "Location", "Target", ""]} />
                  {form.tomorrowPlan.map((row, i) => (
                    <div key={i} style={styles.tableRow}>
                      <input style={{ ...styles.input, ...styles.tdFlex3 }} placeholder="Continue slab shuttering" value={row.activity} onChange={e => setArrayRow("tomorrowPlan", i, "activity", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex2 }} placeholder="Level 4, Zone C" value={row.location} onChange={e => setArrayRow("tomorrowPlan", i, "location", e.target.value)} />
                      <input style={{ ...styles.input, ...styles.tdFlex2 }} placeholder="200 Sqm" value={row.target} onChange={e => setArrayRow("tomorrowPlan", i, "target", e.target.value)} />
                      <button style={styles.removeBtn} onClick={() => removeRow("tomorrowPlan", i)}>✕</button>
                    </div>
                  ))}
                  <button style={styles.addRowBtn} onClick={() => addRow("tomorrowPlan", { activity: "", location: "", target: "" })}>+ Add Row</button>
                </Section>
              )}

              {/* ── MEDIA ── */}
              {activeTab === "media" && (
                <Section title="Photos & Videos">
                  <div style={styles.uploadGrid}>
                    <div>
                      <div style={styles.fieldLabel}>Photos</div>
                      <label style={styles.uploadBox}>
                        📸 Upload Photos
                        <input type="file" multiple accept="image/*" style={{ display: "none" }}
                          onChange={e => setPhotoNames(Array.from(e.target.files).map(f => f.name))} />
                      </label>
                      {photoNames.length > 0 && (
                        <ul style={styles.fileList}>{photoNames.map((n, i) => <li key={i}>{n}</li>)}</ul>
                      )}
                    </div>
                    <div>
                      <div style={styles.fieldLabel}>Videos</div>
                      <label style={styles.uploadBox}>
                        🎥 Upload Videos
                        <input type="file" multiple accept="video/*" style={{ display: "none" }}
                          onChange={e => setVideoNames(Array.from(e.target.files).map(f => f.name))} />
                      </label>
                      {videoNames.length > 0 && (
                        <ul style={styles.fileList}>{videoNames.map((n, i) => <li key={i}>{n}</li>)}</ul>
                      )}
                    </div>
                  </div>
                </Section>
              )}

              {/* ── REMARKS ── */}
              {activeTab === "remarks" && (
                <Section title="PM Remarks & Submission">
                  <Field label="PM Remarks">
                    <textarea
                      style={{ ...styles.input, minHeight: 100, resize: "vertical" }}
                      placeholder="Overall site status, client visit plans, coordination notes..."
                      value={form.pmRemarks}
                      onChange={e => setField("pmRemarks", e.target.value)}
                    />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Submitted By">
                      <input style={styles.input} placeholder="Rajesh Nair, PM" value={form.submittedBy} onChange={e => setField("submittedBy", e.target.value)} />
                    </Field>
                    <Field label="Submission Time">
                      <input style={styles.input} type="time" value={form.submissionTime} onChange={e => setField("submissionTime", e.target.value)} />
                    </Field>
                  </div>
                </Section>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleSave}>Save Report</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW FULL REPORT MODAL
      ══════════════════════════════════════════ */}
      {viewReport && (
        <div style={styles.overlay} onClick={() => setViewReport(null)}>
          <div style={{ ...styles.modal, maxWidth: 780 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>📋 Daily Site Report</div>
              <button style={styles.closeBtn} onClick={() => setViewReport(null)}>✕</button>
            </div>
            <div style={{ ...styles.tabBody, maxHeight: "75vh" }}>
              <ReportView r={viewReport} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function TableHead({ cols }) {
  return (
    <div style={styles.tableHead}>
      {cols.map((c, i) => <div key={i} style={styles.thCell}>{c}</div>)}
    </div>
  );
}

function ReportView({ r }) {
  const sc = STATUS_COLORS[r.overallStatus] || STATUS_COLORS["on-track"];
  return (
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
      {/* Header */}
      <div style={styles.rvHeader}>
        <div>
          <div style={styles.rvProject}>{r.projectName}</div>
          {r.phase && <div style={{ color: "#64748b", fontSize: 12 }}>{r.phase}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.text }}>{sc.label}</span>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            {r.date}{r.reportNo ? ` · #${r.reportNo}` : ""}
          </div>
          <div style={{ color: "#64748b", fontSize: 12 }}>{r.weather} {r.weatherTemp && `· ${r.weatherTemp}°C`}</div>
        </div>
      </div>

      <RvSection title="1. Work Completed Today">
        {r.workItems.filter(w => w.activity).length === 0
          ? <Nil /> : r.workItems.filter(w => w.activity).map((w, i) => (
            <div key={i} style={styles.rvRow}>
              <span style={{ flex: 3 }}>{w.activity}</span>
              <span style={{ flex: 2, color: "#64748b" }}>{w.location}</span>
              <span style={{ flex: 1, color: "#64748b" }}>{w.quantity} {w.unit}</span>
              <span style={{ flex: 1 }}>{WORK_STATUS[w.status]}</span>
            </div>
          ))}
      </RvSection>

      <RvSection title="2. Manpower on Site">
        {r.manpower.filter(m => m.trade).length === 0
          ? <Nil /> : r.manpower.filter(m => m.trade).map((m, i) => (
            <div key={i} style={styles.rvRow}>
              <span style={{ flex: 3 }}>{m.trade}</span>
              <span style={{ flex: 1, color: "#64748b" }}>Planned: {m.planned}</span>
              <span style={{ flex: 1, color: (m.present < m.planned ? "#dc2626" : "#059669") }}>Present: {m.present}</span>
              <span style={{ flex: 2, color: "#64748b" }}>{m.remark}</span>
            </div>
          ))}
      </RvSection>

      <RvSection title="3. Equipment & Machinery">
        {r.equipment.filter(e => e.name).length === 0
          ? <Nil /> : r.equipment.filter(e => e.name).map((e, i) => (
            <div key={i} style={styles.rvRow}>
              <span style={{ flex: 3 }}>{e.name}</span>
              <span style={{ flex: 1, color: "#64748b" }}>{e.nos} unit(s)</span>
              <span style={{ flex: 2 }}>{EQUIP_STATUS[e.status]}</span>
              <span style={{ flex: 1, color: "#64748b" }}>{e.hours} hrs</span>
            </div>
          ))}
      </RvSection>

      <RvSection title="4. Material Received">
        {r.materials.filter(m => m.material).length === 0
          ? <Nil /> : r.materials.filter(m => m.material).map((m, i) => (
            <div key={i} style={styles.rvRow}>
              <span style={{ flex: 3 }}>{m.material}</span>
              <span style={{ flex: 1, color: "#64748b" }}>{m.quantity}</span>
              <span style={{ flex: 2, color: "#64748b" }}>{m.supplier}</span>
              <span style={{ flex: 1, color: "#64748b" }}>{m.challan}</span>
              <span style={{ flex: 1 }}>{QC_STATUS[m.qc]}</span>
            </div>
          ))}
      </RvSection>

      <RvSection title="5. Issues / Problems">
        {r.issues.filter(i => i.issue).length === 0
          ? <Nil text="No issues logged" /> : r.issues.filter(i => i.issue).map((issue, i) => (
            <div key={i} style={styles.issueCard}>
              <div style={styles.issueCardTitle}>⚠️ {issue.issue}</div>
              {issue.impact && <div style={{ color: "#dc2626", fontSize: 12 }}>Impact: {issue.impact}</div>}
              {issue.action && <div style={{ color: "#0369a1", fontSize: 12 }}>Action: {issue.action}</div>}
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                {issue.responsible && <span>By: {issue.responsible}</span>}
                {issue.targetDate && <span> · Target: {issue.targetDate}</span>}
              </div>
            </div>
          ))}
      </RvSection>

      <RvSection title="6. Overall Progress">
        {Object.entries(r.progress).map(([k, v]) => {
          if (!v) return null;
          const labels = { structural: "Structural", finishing: "Finishing", mepElec: "MEP Electrical", mepPlumb: "MEP Plumbing", overall: "Overall Project" };
          return (
            <div key={k} style={styles.progressRow}>
              <div style={{ ...styles.progLabel, fontSize: 12 }}>{labels[k]}</div>
              <div style={styles.progInputWrap}>
                <div style={styles.progTrack}>
                  <div style={{ ...styles.progBar, width: `${Math.min(100, v)}%` }} />
                </div>
                <span style={styles.progPct}>{v}%</span>
              </div>
            </div>
          );
        })}
      </RvSection>

      {r.safetyObs && (
        <RvSection title="7. Safety Observations">
          {r.safetyObs.split("\n").filter(Boolean).map((l, i) => (
            <div key={i} style={{ padding: "4px 0", fontSize: 13 }}>{l}</div>
          ))}
        </RvSection>
      )}

      <RvSection title="8. Tomorrow's Plan">
        {r.tomorrowPlan.filter(t => t.activity).length === 0
          ? <Nil /> : r.tomorrowPlan.filter(t => t.activity).map((t, i) => (
            <div key={i} style={styles.rvRow}>
              <span style={{ flex: 3 }}>{t.activity}</span>
              <span style={{ flex: 2, color: "#64748b" }}>{t.location}</span>
              <span style={{ flex: 1, color: "#1e40af" }}>{t.target}</span>
            </div>
          ))}
      </RvSection>

      {(r.photoNames?.length > 0 || r.videoNames?.length > 0) && (
        <RvSection title="9. Media">
          {r.photoNames?.map((n, i) => <div key={i} style={{ fontSize: 12, color: "#64748b" }}>📸 {n}</div>)}
          {r.videoNames?.map((n, i) => <div key={i} style={{ fontSize: 12, color: "#64748b" }}>🎥 {n}</div>)}
        </RvSection>
      )}

      {r.pmRemarks && (
        <RvSection title="10. PM Remarks">
          <div style={styles.rvRemarks}>{r.pmRemarks}</div>
        </RvSection>
      )}

      <div style={styles.rvFooter}>
        <span>Submitted by: <strong>{r.submittedBy || "Project Manager"}</strong></span>
        {r.submissionTime && <span> · {r.submissionTime}</span>}
        <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 11 }}>Distribution: Client · Site Engineer · Consultant · Management</div>
      </div>
    </div>
  );
}

function RvSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={styles.rvSectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Nil({ text = "No entries" }) {
  return <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic", padding: "6px 0" }}>{text}</div>;
}

// ── Styles ──
const styles = {
  page: { padding: 24, background: "linear-gradient(160deg, #f0f4ff 0%, #f8f6f0 100%)", minHeight: "100vh", fontFamily: "'DM Mono', 'Courier New', monospace" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, paddingBottom: 16, borderBottom: "2px solid #1a1a2e" },
  eyebrow: { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8888aa", marginBottom: 4 },
  pageTitle: { fontFamily: "'Georgia', serif", fontSize: 30, fontWeight: 700, color: "#1a1a2e", fontStyle: "italic", margin: 0 },
  btnPrimary: { background: "#1a1a2e", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: "pointer", letterSpacing: "0.04em" },
  btnCancel: { background: "none", border: "1px solid #d4d0c8", borderRadius: 4, padding: "10px 20px", fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: "pointer", color: "#4a4a6a" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 },
  statCard: { background: "#fff", border: "0.5px solid #d4d0c8", borderRadius: 8, padding: "16px 18px" },
  statVal: { fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 700, color: "#1a1a2e", fontStyle: "italic" },
  statLbl: { fontSize: 11, color: "#8888aa", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" },
  empty: { textAlign: "center", padding: "80px 0", color: "#8888aa" },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyMsg: { fontFamily: "'Georgia', serif", fontSize: 20, fontStyle: "italic", color: "#4a4a6a" },
  emptySub: { fontSize: 12, marginTop: 6 },
  reportList: { display: "flex", flexDirection: "column", gap: 14 },
  reportCard: { background: "#fff", border: "0.5px solid #d4d0c8", borderLeft: "4px solid #1a1a2e", borderRadius: 8, padding: "16px 20px" },
  rcTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  rcProject: { fontFamily: "'Georgia', serif", fontSize: 17, fontWeight: 700, color: "#1a1a2e", fontStyle: "italic" },
  rcMeta: { fontSize: 12, color: "#8888aa", marginTop: 2 },
  statusBadge: { fontSize: 11, padding: "3px 10px", borderRadius: 3, fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap" },
  rcStats: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 },
  rcStat: { fontSize: 12, color: "#4a4a6a" },
  rcRemarks: { fontSize: 12, color: "#64748b", fontStyle: "italic", padding: "8px 12px", background: "#f8f7f4", borderRadius: 4, marginBottom: 10 },
  rcFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #eceae4" },
  rcBy: { fontSize: 11, color: "#94a3b8" },
  btnView: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#1e40af", padding: 0 },
  overlay: { position: "fixed", inset: 0, background: "rgba(26,26,46,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 12, width: "92%", maxWidth: 700, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #1a1a2e" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "0.5px solid #d4d0c8", flexShrink: 0 },
  modalTitle: { fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 700, fontStyle: "italic", color: "#1a1a2e" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#8888aa", padding: "4px 8px", borderRadius: 4 },
  metaBar: { padding: "16px 22px", borderBottom: "0.5px solid #eceae4", background: "#f8f7f4", flexShrink: 0 },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 },
  tabBar: { display: "flex", overflowX: "auto", borderBottom: "0.5px solid #d4d0c8", flexShrink: 0, padding: "0 22px" },
  tab: { background: "none", border: "none", borderBottom: "2px solid transparent", padding: "10px 14px", cursor: "pointer", fontSize: 12, letterSpacing: "0.04em", color: "#8888aa", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace" },
  tabActive: { borderBottomColor: "#1a1a2e", color: "#1a1a2e" },
  tabBody: { padding: "18px 22px", overflowY: "auto", flex: 1 },
  modalFooter: { display: "flex", gap: 10, padding: "14px 22px", borderTop: "0.5px solid #eceae4", flexShrink: 0 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a4a6a", marginBottom: 12, paddingBottom: 6, borderBottom: "0.5px solid #eceae4" },
  fieldLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8888aa", marginBottom: 5 },
  input: { background: "#f4f3f0", border: "0.5px solid #d4d0c8", borderRadius: 4, padding: "8px 10px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#1a1a2e", outline: "none", width: "100%" },
  tableHead: { display: "flex", gap: 6, padding: "6px 0", marginBottom: 4 },
  thCell: { flex: 1, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8" },
  tableRow: { display: "flex", gap: 6, marginBottom: 6, alignItems: "center" },
  tdFlex1: { flex: 1 },
  tdFlex2: { flex: 2 },
  tdFlex3: { flex: 3 },
  removeBtn: { background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14, padding: "0 4px", flexShrink: 0 },
  addRowBtn: { background: "none", border: "1px dashed #d4d0c8", borderRadius: 4, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#4a4a6a", marginTop: 6, fontFamily: "'DM Mono', monospace" },
  issueBlock: { display: "flex", gap: 10, marginBottom: 14, padding: 12, background: "#fff9f9", border: "0.5px solid #fca5a5", borderRadius: 6 },
  issueNum: { fontSize: 12, fontWeight: 700, color: "#dc2626", minWidth: 24 },
  issueFields: { flex: 1 },
  issueRow: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 8 },
  progressRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  progLabel: { width: 140, fontSize: 12, color: "#4a4a6a", flexShrink: 0 },
  progInputWrap: { display: "flex", alignItems: "center", gap: 10, flex: 1 },
  progTrack: { flex: 1, height: 8, background: "#eceae4", borderRadius: 4, overflow: "hidden" },
  progBar: { height: "100%", background: "#1a1a2e", borderRadius: 4, transition: "width 0.3s" },
  progPct: { fontSize: 12, color: "#1a1a2e", fontWeight: 600, minWidth: 36 },
  uploadGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  uploadBox: { display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 14px", border: "1.5px dashed #d4d0c8", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#4a4a6a", textAlign: "center", marginTop: 6 },
  fileList: { listStyle: "none", padding: 0, marginTop: 8 },
  rvHeader: { display: "flex", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottom: "1.5px solid #1a1a2e" },
  rvProject: { fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 700, fontStyle: "italic", color: "#1a1a2e" },
  rvSectionTitle: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#4a4a6a", marginBottom: 8, paddingBottom: 5, borderBottom: "0.5px solid #eceae4" },
  rvRow: { display: "flex", gap: 12, padding: "6px 0", borderBottom: "0.5px solid #f1f5f9", fontSize: 12 },
  issueCard: { padding: "10px 12px", background: "#fff9f9", border: "0.5px solid #fca5a5", borderRadius: 5, marginBottom: 8 },
  issueCardTitle: { fontWeight: 600, color: "#dc2626", marginBottom: 4, fontSize: 13 },
  rvRemarks: { fontStyle: "italic", color: "#4a4a6a", fontSize: 13, padding: "10px 14px", background: "#f8f7f4", borderRadius: 5, lineHeight: 1.6, borderLeft: "3px solid #1a1a2e" },
  rvFooter: { marginTop: 20, paddingTop: 14, borderTop: "1px solid #d4d0c8", fontSize: 12, color: "#4a4a6a" },
};