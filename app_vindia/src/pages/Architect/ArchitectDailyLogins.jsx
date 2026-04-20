import { useState } from "react";

/* ══════════════════════════════════════════════════════
   ARCHITECT DAILY LOG — Focused ERP Module
   6 sections: Basic Info · Tasks · Work Done ·
               Issues / Blockers · Attachments · Submit
   Palette: #001D39 · #0A4174 · #49769F · #4E8EA2
            #6EA2B3 · #7BBDE8 · #BDD8E9 · #f0f5f9
══════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Fraunces:opsz,wght@9..144,300;9..144,600;9..144,700&display=swap');

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --navy: #001D39; --b1: #0A4174; --b2: #49769F; --b3: #4E8EA2;
  --b4: #6EA2B3;  --b5: #7BBDE8; --b6: #BDD8E9; --bg: #f0f5f9;
  --white: #fff;  --border: #d0e4f0; --border2: #c0d8ec;
  --danger: #c0392b; --warn: #e6a817; --ok: #1c5e35;
  --fd: 'Fraunces', serif; --fm: 'DM Mono', monospace; --r: 12px;
}
body { font-family: var(--fm); background: var(--bg); color: var(--navy); font-size: 13px; line-height: 1.6; }

/* ── TOPBAR ── */
.tp { background: var(--white); border-bottom: 1px solid var(--border); padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 20; }
.tp-crumb { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--b4); }
.tp-crumb b { color: var(--navy); font-weight: 600; }
.tp-right { display: flex; align-items: center; gap: 8px; }
.proj-pill { font-size: 11px; font-weight: 600; background: var(--b6); color: var(--b1); border: 1px solid var(--b5); border-radius: 20px; padding: 4px 13px; }

/* ── BUTTONS ── */
.btn { font-family: var(--fm); font-size: 12px; font-weight: 500; border-radius: 8px; padding: 8px 16px; border: none; cursor: pointer; transition: all .17s; display: inline-flex; align-items: center; gap: 6px; }
.btn:active { transform: scale(.97); }
.btn-p { background: linear-gradient(135deg, var(--b1), var(--navy)); color: #fff; box-shadow: 0 4px 14px rgba(10,65,116,.22); }
.btn-p:hover { box-shadow: 0 7px 22px rgba(10,65,116,.32); transform: translateY(-1px); }
.btn-s { background: var(--white); color: var(--b1); border: 1px solid var(--border2); }
.btn-s:hover { background: var(--bg); border-color: var(--b5); }
.btn-g { background: none; color: var(--b4); border: 1px solid var(--border); }
.btn-g:hover { background: var(--bg); color: var(--b1); border-color: var(--b5); }
.btn-sm { padding: 5px 11px; font-size: 11px; border-radius: 6px; }

/* ── PAGE ── */
.page { max-width: 720px; margin: 0 auto; padding: 32px 24px 120px; }
.page-title { font-family: var(--fd); font-size: 30px; font-weight: 700; color: var(--navy); letter-spacing: -.5px; }
.page-sub { font-size: 12px; color: var(--b4); margin-top: 4px; margin-bottom: 28px; }

/* ── SECTION ── */
.sec { background: var(--white); border: 1px solid var(--border); border-radius: var(--r); margin-bottom: 16px; overflow: hidden; }
.sec-head { padding: 15px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); }
.sec-num { width: 26px; height: 26px; border-radius: 50%; background: var(--b1); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sec-num.done { background: var(--ok); }
.sec-label { font-family: var(--fd); font-size: 15px; font-weight: 600; color: var(--navy); flex: 1; }
.sec-body { padding: 20px; }

/* ── FORM ELEMENTS ── */
.field { margin-bottom: 15px; }
.field:last-child { margin-bottom: 0; }
.lbl { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--b4); margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
.lbl .req { color: var(--danger); }
.fi, .fs, .fta { width: 100%; background: var(--bg); border: 1px solid var(--border2); border-radius: 8px; padding: 9px 13px; font-family: var(--fm); font-size: 12px; color: var(--navy); outline: none; transition: all .15s; }
.fi:focus, .fs:focus, .fta:focus { border-color: var(--b5); box-shadow: 0 0 0 3px rgba(123,189,232,.12); background: var(--white); }
.fi::placeholder, .fta::placeholder { color: var(--b4); }
.fta { resize: vertical; min-height: 88px; line-height: 1.6; }
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }

/* ── STATUS CHIPS ── */
.chip-row { display: flex; gap: 7px; flex-wrap: wrap; }
.chip { font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border2); background: var(--white); color: var(--b2); cursor: pointer; transition: all .14s; user-select: none; }
.chip:hover { border-color: var(--b5); color: var(--b1); }
.chip.on { background: var(--b1); color: #fff; border-color: var(--b1); }
.chip.on-warn { background: var(--warn); color: #fff; border-color: var(--warn); }
.chip.on-danger { background: var(--danger); color: #fff; border-color: var(--danger); }
.chip.on-ok { background: var(--ok); color: #fff; border-color: var(--ok); }

/* ── TASK ITEMS ── */
.task-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.task-card { background: var(--bg); border: 1px solid var(--border); border-radius: 9px; padding: 14px 16px; }
.task-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.task-tag { font-size: 10px; font-weight: 700; color: var(--b1); background: var(--b6); border: 1px solid var(--b5); border-radius: 5px; padding: 2px 8px; font-family: var(--fm); }
.task-rm { margin-left: auto; background: none; border: none; color: var(--b4); cursor: pointer; padding: 3px 6px; border-radius: 4px; font-size: 13px; transition: all .14s; }
.task-rm:hover { color: var(--danger); background: #fdecea; }
.add-row { display: flex; align-items: center; gap: 7px; padding: 9px 14px; border: 1px dashed var(--b5); border-radius: 8px; background: none; color: var(--b2); font-family: var(--fm); font-size: 12px; cursor: pointer; width: 100%; transition: all .15s; }
.add-row:hover { background: var(--b6); border-color: var(--b1); color: var(--b1); }

/* ── ISSUE ITEMS ── */
.issue-card { background: var(--bg); border: 1px solid var(--border); border-radius: 9px; padding: 14px 16px; margin-bottom: 10px; }
.issue-top { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
.sev-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.sd-low { background: var(--b3); }
.sd-med { background: var(--warn); }
.sd-high { background: var(--danger); }

/* ── ATTACHMENTS ── */
.att-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.att-row { display: flex; align-items: center; gap: 10px; padding: 9px 13px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
.att-icon { font-size: 18px; flex-shrink: 0; }
.att-name { font-size: 12px; font-weight: 500; color: var(--navy); flex: 1; }
.att-type { font-size: 10px; color: var(--b4); font-family: var(--fm); }
.att-rm { background: none; border: none; color: var(--b4); cursor: pointer; padding: 3px 6px; border-radius: 4px; font-size: 13px; transition: all .14s; }
.att-rm:hover { color: var(--danger); background: #fdecea; }
.upload-zone { border: 2px dashed var(--b5); border-radius: 9px; padding: 22px; text-align: center; cursor: pointer; transition: all .15s; background: rgba(123,189,232,.03); }
.upload-zone:hover { border-color: var(--b1); background: rgba(10,65,116,.04); }
.upz-icon { font-size: 26px; margin-bottom: 5px; }
.upz-text { font-size: 13px; color: var(--b2); font-weight: 600; }
.upz-sub { font-size: 11px; color: var(--b4); margin-top: 3px; }

/* ── SUBMIT SECTION ── */
.submit-sec { background: var(--white); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; margin-bottom: 16px; }
.submit-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.status-info { display: flex; align-items: center; gap: 10px; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.status-label { font-size: 13px; font-weight: 600; color: var(--navy); }
.status-sub { font-size: 11px; color: var(--b4); }
.submit-btns { display: flex; gap: 9px; }

/* ── SUCCESS BANNER ── */
.success-banner { background: linear-gradient(135deg, rgba(28,94,53,.06), rgba(96,228,160,.1)); border: 1px solid #a8d9b8; border-radius: var(--r); padding: 18px 22px; display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.sb-icon { font-size: 28px; }
.sb-title { font-family: var(--fd); font-size: 17px; font-weight: 700; color: var(--ok); }
.sb-sub { font-size: 12px; color: var(--b4); margin-top: 2px; }

/* ── TOAST ── */
.toast { position: fixed; bottom: 24px; right: 24px; background: var(--navy); color: #fff; font-family: var(--fm); font-size: 12px; padding: 10px 16px; border-radius: 9px; z-index: 100; pointer-events: none; transition: opacity .3s, transform .3s; box-shadow: 0 8px 24px rgba(0,29,57,.3); }
.toast.h { opacity: 0; transform: translateY(8px); }
.toast.s { opacity: 1; transform: translateY(0); }

/* ── ANIMATIONS ── */
@keyframes fu { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.sec { animation: fu .3s ease both; }
.sec:nth-child(1) { animation-delay: .04s; }
.sec:nth-child(2) { animation-delay: .08s; }
.sec:nth-child(3) { animation-delay: .12s; }
.sec:nth-child(4) { animation-delay: .16s; }
.sec:nth-child(5) { animation-delay: .20s; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--b5); border-radius: 3px; }

@media (max-width: 640px) {
  .page { padding: 20px 16px 100px; }
  .g2, .g3 { grid-template-columns: 1fr; }
}
`;

/* ─── CONSTANTS ─── */
const PROJECTS     = ["Skyward Residency", "Green Valley Towers", "Horizon Plaza"];
const ROLES        = ["Lead Architect", "Architect", "Junior Architect", "Intern Architect", "Technician"];
const TASK_STATUS  = ["To Do", "In Progress", "Under Review", "Done"];
const ISSUE_TYPES  = ["Design Issue", "Missing Info", "Structural Conflict", "MEP Conflict", "Site Issue", "Client Change"];
const SEVERITIES   = ["Low", "Medium", "High"];
const MOCK_FILES   = [
  { name: "L4-FloorPlan-RevC.dwg", type: "DWG", icon: "📐" },
  { name: "Facade-Detail-01.pdf",  type: "PDF", icon: "📄" },
  { name: "SitePhoto-GridD.jpg",   type: "JPG", icon: "🖼️" },
  { name: "MEP-Overlay-L5.pdf",    type: "PDF", icon: "📄" },
  { name: "WindowSchedule-RevC.xlsx", type: "XLSX", icon: "📊" },
];

const sevChip = s =>
  s === "High" ? "on-danger" : s === "Medium" ? "on-warn" : "on-ok";

const sevDot = s =>
  s === "High" ? "sd-high" : s === "Medium" ? "sd-med" : "sd-low";

/* ─── COMPONENT ─── */
export default function DailyLogPage() {
  /* ── state ── */
  const [logStatus, setLogStatus] = useState("Draft"); // Draft | Submitted

  const [basic, setBasic] = useState({
    date: new Date().toISOString().slice(0, 10),
    project: "Skyward Residency",
    architect: "Arjun K.",
    role: "Lead Architect",
  });

  const [tasks, setTasks] = useState([
    { id: 1, name: "", status: "In Progress" },
  ]);

  const [workDone, setWorkDone] = useState("");

  const [issues, setIssues] = useState([]);

  const [attachments, setAttachments] = useState([]);

  const [toast, setToast] = useState({ msg: "", show: false });

  const toast_ = msg => {
    setToast({ msg, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2600);
  };

  /* ── task helpers ── */
  const addTask = () =>
    setTasks(p => [...p, { id: Date.now(), name: "", status: "In Progress" }]);
  const updTask = (id, k, v) =>
    setTasks(p => p.map(t => t.id === id ? { ...t, [k]: v } : t));
  const remTask = id =>
    setTasks(p => p.filter(t => t.id !== id));

  /* ── issue helpers ── */
  const addIssue = () =>
    setIssues(p => [...p, { id: Date.now(), title: "", type: "Design Issue", severity: "Medium", desc: "" }]);
  const updIssue = (id, k, v) =>
    setIssues(p => p.map(i => i.id === id ? { ...i, [k]: v } : i));
  const remIssue = id =>
    setIssues(p => p.filter(i => i.id !== id));

  /* ── attachment helpers ── */
  const mockUpload = () => {
    const pick = MOCK_FILES[Math.floor(Math.random() * MOCK_FILES.length)];
    const file = { ...pick, id: Date.now() };
    setAttachments(p => [...p, file]);
    toast_(`${pick.name} attached ✓`);
  };
  const remAtt = id => setAttachments(p => p.filter(a => a.id !== id));

  /* ── submit ── */
  const handleSubmit = status => {
    if (!basic.date || !basic.project || !basic.architect.trim()) {
      toast_("Please fill in the required fields in Basic Info."); return;
    }
    if (!tasks.some(t => t.name.trim())) {
      toast_("Please add at least one task."); return;
    }
    if (!workDone.trim()) {
      toast_("Please describe the work done today."); return;
    }
    setLogStatus(status);
    toast_(status === "Submitted"
      ? "Daily log submitted successfully ✓"
      : "Log saved as draft ✓");
  };

  /* ── section done indicators ── */
  const basicDone = basic.date && basic.project && basic.architect.trim();
  const tasksDone = tasks.some(t => t.name.trim());
  const workDone_ = workDone.trim().length > 0;

  return (
    <>
      <style>{CSS}</style>

      {/* TOPBAR */}
      <div className="tp">
        <div className="tp-crumb">
          <span>ERP</span> › <span>Daily Logs</span> › <b>New Log</b>
        </div>
        <div className="tp-right">
          <span className="proj-pill">{basic.project}</span>
          <button className="btn btn-g btn-sm" onClick={() => toast_("Exporting log as PDF…")}>
            📄 Export
          </button>
        </div>
      </div>

      <div className="page">

        {/* PAGE HEADER */}
        <div className="page-title">Daily Log</div>
        <div className="page-sub">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>

        {/* SUCCESS BANNER */}
        {logStatus === "Submitted" && (
          <div className="success-banner">
            <span className="sb-icon">✅</span>
            <div style={{ flex: 1 }}>
              <div className="sb-title">Log Submitted</div>
              <div className="sb-sub">
                Submitted on {new Date().toLocaleDateString()} · Pending review by Project Manager
              </div>
            </div>
            <button className="btn btn-g btn-sm" onClick={() => setLogStatus("Draft")}>
              Edit
            </button>
          </div>
        )}

        {/* ── 1. BASIC INFO ── */}
        <div className="sec">
          <div className="sec-head">
            <div className={`sec-num${basicDone ? " done" : ""}`}>
              {basicDone ? "✓" : "1"}
            </div>
            <span className="sec-label">Basic Information</span>
          </div>
          <div className="sec-body">
            <div className="g3">
              <div className="field">
                <div className="lbl">Date <span className="req">*</span></div>
                <input className="fi" type="date" value={basic.date}
                  onChange={e => setBasic(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="field">
                <div className="lbl">Project <span className="req">*</span></div>
                <select className="fs" value={basic.project}
                  onChange={e => setBasic(p => ({ ...p, project: e.target.value }))}>
                  {PROJECTS.map(x => <option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="field">
                <div className="lbl">Role</div>
                <select className="fs" value={basic.role}
                  onChange={e => setBasic(p => ({ ...p, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <div className="lbl">Architect Name <span className="req">*</span></div>
              <input className="fi" placeholder="Full name" value={basic.architect}
                onChange={e => setBasic(p => ({ ...p, architect: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* ── 2. TASKS WORKED ON ── */}
        <div className="sec">
          <div className="sec-head">
            <div className={`sec-num${tasksDone ? " done" : ""}`}>
              {tasksDone ? "✓" : "2"}
            </div>
            <span className="sec-label">Tasks Worked On</span>
          </div>
          <div className="sec-body">
            <div className="task-list">
              {tasks.map((t, idx) => (
                <div key={t.id} className="task-card">
                  <div className="task-card-top">
                    <span className="task-tag">TASK {idx + 1}</span>
                    {tasks.length > 1 && (
                      <button className="task-rm" onClick={() => remTask(t.id)}>✕</button>
                    )}
                  </div>
                  <div className="g2">
                    <div className="field">
                      <div className="lbl">Task Name</div>
                      <input className="fi" placeholder="e.g. Level 4 Floor Plan"
                        value={t.name} onChange={e => updTask(t.id, "name", e.target.value)} />
                    </div>
                    <div className="field">
                      <div className="lbl">Status</div>
                      <div className="chip-row">
                        {TASK_STATUS.map(s => (
                          <span key={s}
                            className={`chip${t.status === s ? " on" : ""}`}
                            onClick={() => updTask(t.id, "status", s)}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="add-row" onClick={addTask}>
              ＋ Add another task
            </button>
          </div>
        </div>

        {/* ── 3. WORK DONE TODAY ── */}
        <div className="sec">
          <div className="sec-head">
            <div className={`sec-num${workDone_ ? " done" : ""}`}>
              {workDone_ ? "✓" : "3"}
            </div>
            <span className="sec-label">Work Done Today</span>
          </div>
          <div className="sec-body">
            <div className="field">
              <div className="lbl">Description <span className="req">*</span></div>
              <textarea className="fta" style={{ minHeight: 110 }}
                placeholder="Describe what was completed today — drawings finished, revisions made, models updated, coordination done, decisions taken…"
                value={workDone}
                onChange={e => setWorkDone(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── 4. ISSUES / BLOCKERS ── */}
        <div className="sec">
          <div className="sec-head">
            <div className="sec-num" style={issues.length > 0 ? { background: "var(--warn)" } : {}}>
              {issues.length > 0 ? issues.length : "4"}
            </div>
            <span className="sec-label">Issues / Blockers</span>
            <span style={{ fontSize: 11, color: "var(--b4)" }}>Optional</span>
          </div>
          <div className="sec-body">
            {issues.map(issue => (
              <div key={issue.id} className="issue-card">
                <div className="issue-top">
                  <div className={`sev-dot ${sevDot(issue.severity)}`} />
                  <span style={{ fontSize: 11, color: "var(--b2)", fontWeight: 600 }}>
                    {issue.severity} severity
                  </span>
                  <button className="task-rm" style={{ marginLeft: "auto" }}
                    onClick={() => remIssue(issue.id)}>✕</button>
                </div>
                <div className="g2" style={{ marginBottom: 12 }}>
                  <div className="field">
                    <div className="lbl">Issue Title</div>
                    <input className="fi" placeholder="Short title"
                      value={issue.title} onChange={e => updIssue(issue.id, "title", e.target.value)} />
                  </div>
                  <div className="field">
                    <div className="lbl">Type</div>
                    <select className="fs" value={issue.type}
                      onChange={e => updIssue(issue.id, "type", e.target.value)}>
                      {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <div className="lbl">Description</div>
                  <textarea className="fta" style={{ minHeight: 70 }}
                    placeholder="Describe the issue and its impact on today's work…"
                    value={issue.desc} onChange={e => updIssue(issue.id, "desc", e.target.value)} />
                </div>
                <div className="field">
                  <div className="lbl">Severity</div>
                  <div className="chip-row">
                    {SEVERITIES.map(s => (
                      <span key={s}
                        className={`chip${issue.severity === s ? " " + sevChip(s) : ""}`}
                        onClick={() => updIssue(issue.id, "severity", s)}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button className="add-row" onClick={addIssue}>
              ＋ Log an issue or blocker
            </button>
          </div>
        </div>

        {/* ── 5. ATTACHMENTS ── */}
        <div className="sec">
          <div className="sec-head">
            <div className="sec-num"
              style={attachments.length > 0 ? { background: "var(--b3)" } : {}}>
              {attachments.length > 0 ? attachments.length : "5"}
            </div>
            <span className="sec-label">Attachments</span>
            <span style={{ fontSize: 11, color: "var(--b4)" }}>Optional</span>
          </div>
          <div className="sec-body">
            {attachments.length > 0 && (
              <div className="att-list">
                {attachments.map(a => (
                  <div key={a.id} className="att-row">
                    <span className="att-icon">{a.icon}</span>
                    <span className="att-name">{a.name}</span>
                    <span className="att-type">{a.type}</span>
                    <button className="att-rm" onClick={() => remAtt(a.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="upload-zone" onClick={mockUpload}>
              <div className="upz-icon">📎</div>
              <div className="upz-text">Click to attach files</div>
              <div className="upz-sub">DWG · PDF · JPG · PNG · XLSX · any format</div>
            </div>
          </div>
        </div>

        {/* ── SUBMIT ── */}
        <div className="submit-sec">
          <div className="submit-row">
            <div className="status-info">
              <div className="status-dot" style={{
                background: logStatus === "Submitted" ? "var(--ok)"
                  : logStatus === "Draft" ? "var(--warn)" : "var(--b3)"
              }} />
              <div>
                <div className="status-label">{logStatus}</div>
                <div className="status-sub">
                  {logStatus === "Draft"
                    ? "Not yet submitted — save to continue later or submit when done"
                    : "Submitted to Project Manager for review"}
                </div>
              </div>
            </div>
            <div className="submit-btns">
              <button className="btn btn-s" onClick={() => handleSubmit("Draft")}>
                💾 Save Draft
              </button>
              <button className="btn btn-p" onClick={() => handleSubmit("Submitted")}>
                ✅ Submit Log
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className={`toast ${toast.show ? "s" : "h"}`}>{toast.msg}</div>
    </>
  );
}