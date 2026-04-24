import { useState, useEffect, useRef} from "react";
import "./ArchitectDailyLogins.css";
import { getArchitectProjects } from "../../services/architectprojectService";
import { submitDailyLog } from "../../services/architectDailyLogService";
/* ══════════════════════════════════════════════════════
   ARCHITECT DAILY LOG — Focused ERP Module
   Sections: Basic Info · Tasks · Work Done ·
             Issues / Blockers · Attachments · Submit
══════════════════════════════════════════════════════ */

/* ─── Constants ─── */


const TASK_STATUS = ["To Do", "In Progress", "Under Review", "Done"];
const ISSUE_TYPES = ["Design Issue", "Missing Info", "Structural Conflict", "MEP Conflict", "Site Issue", "Client Change"];
const SEVERITIES  = ["P3", "P2", "P1"];


/* ─── Helpers ─── */
const sevDot  = s => s === "P1" ? "sd-h" : s === "P2" ? "sd-m" : "sd-l";
const sevChip = s => s === "P1" ? "on-danger" : s === "P2" ? "on-warn" : "on-ok";

/* ══════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════ */
export default function DailyLogPage() {
  const [user] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [projects, setProjects] = useState([]);
  const [attachments, setAttachments] = useState([]);

  const [toast, setToast] = useState({ msg: "", show: false });
  const toastTimer = useRef(null);
  const toast_ = (msg) => {
  setToast({ msg, show: true });

  if (toastTimer.current) clearTimeout(toastTimer.current);

  toastTimer.current = setTimeout(() => {
    setToast({ msg: "", show: false });
  }, 2500);
};

  const [logStatus, setLogStatus] = useState("Draft");

  const [basic, setBasic] = useState({
    date: new Date().toISOString().slice(0, 10),
    project: "",
    architect: user?.name ?? "Not Logged In",
  });

  // ✅ FILE UPLOAD FUNCTION (THIS WAS MISSING / MISPLACED)
const handleFileUpload = async (e) => {
  const files = Array.from(e.target.files);

  for (let file of files) {
    const formData = new FormData();
    formData.append("file", file);

    console.log("UPLOAD URL:", `${API_BASE}/api/upload`);

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      console.error("Upload failed:", res.status);
      return;
    }

    const data = await res.json();

    setAttachments(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        name: data.file_name,
        type: data.file_type,
        url: data.file_url
      }
    ]);
  }

  toast_(`${files.length} file(s) uploaded ✓`);
};

  // ❌ REMOVE THIS (it was WRONG in your code):
  // setAttachments(prev => [...prev, ...formatted]);
  // toast_(`${files.length} file(s) added ✓`);



  const [tasks,       setTasks]       = useState([ { id: 1, name: "", status: "In Progress" }]);
  const [workDone,    setWorkDone]    = useState("");
  const [issues,      setIssues]      = useState([]);


useEffect(() => {
  if (!user?.id) return;

  const loadProjects = async () => {
    try {
      const architectId = user.id;

      console.log("ARCHITECT ID:", architectId);

      const res = await getArchitectProjects(architectId);

      console.log("PROJECT RESPONSE:", res);

      // ✅ FIX HERE (important)
      setProjects(res.data || res || []);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  };

  loadProjects();
}, [user]);

useEffect(() => {
  if (projects.length > 0 && !basic.project) {
    setBasic(p => ({
      ...p,
      project: projects[0].project_id
    }));
  }
}, [projects]);
  /* ── Task helpers ── */
  const addTask = () =>
    setTasks(p => [...p, { id: Date.now(), name: "", status: "In Progress" }]);
  const updTask = (id, k, v) =>
    setTasks(p => p.map(t => t.id === id ? { ...t, [k]: v } : t));
  const remTask = id =>
    setTasks(p => p.filter(t => t.id !== id));

  /* ── Issue helpers ── */
  const addIssue = () =>
    setIssues(p => [...p, { id: Date.now(), title: "", type: "Design Issue", severity: "P2", desc: "" }]);
  const updIssue = (id, k, v) =>
    setIssues(p => p.map(i => i.id === id ? { ...i, [k]: v } : i));
  const remIssue = id =>
    setIssues(p => p.filter(i => i.id !== id));

  const remAtt = id => setAttachments(p => p.filter(a => a.id !== id));

  /* ── Submit ── */
  const handleSubmit = async (status) => {
  if (!basic.date || !basic.project || !basic.architect.trim()) {
    toast_("Fill in required Basic Info fields.");
    return;
  }

  if (tasks.every(t => !t.name.trim())) {
    toast_("Add at least one task.");
    return;
  }

  if (!workDone.trim()) {
    toast_("Describe the work done today.");
    return;
  }
   // 🔥 ADD THIS DEBUG HERE
  console.log("SUBMIT PAYLOAD:", {
    date: basic.date,
    project_id: basic.project,
    architect_id: user?.id,
  });

  const payload = {
  date: basic.date,
  project_id: basic.project,
  architect_id: user.id,   // IMPORTANT (you currently don't send this properly)
  role: "Architect",
  status,
  work_done: workDone,

  tasks: tasks.filter(t => t.name.trim()).map(t => ({
    task_name: t.name,
    status: t.status
  })),

  issues: issues.map(i => ({
    title: i.title,
    type: i.type,
    severity: i.severity,
    description: i.description,
  })),

  attachments: attachments.map(a => ({
  file_name: a.name,
  file_type: a.type,
  file_url: a.url
}))
};

  try {
    await submitDailyLog(payload);
    setLogStatus(status);
    toast_(status === "Submitted" ? "Daily log submitted ✓" : "Saved as draft");
  } catch (err) {
    console.error(err);
    toast_("Failed to submit log");
  }
};

  /* ── Section completion flags ── */
  const basicDone = !!(basic.date && basic.project && basic.architect.trim());
  const tasksDone = tasks.some(t => t.name.trim());
  const workDone_ = workDone.trim().length > 0;

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── TOPBAR ── */}
     

      {/* ── SHELL ── */}
      <div className="shell">

        {/* PAGE HEADER */}
        <div className="page-head">
          <div>
            <div className="page-title">Daily Log</div>
            <div className="page-sub">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </div>
          </div>

          {logStatus === "Submitted" && (
            <div className="success-banner">
              <span className="sb-icon"></span>
              <div>
                <div className="sb-title">Log Submitted</div>
                <div className="sb-sub">Pending PM review</div>
              </div>
              <button className="btn btn-g btn-sm" onClick={() => setLogStatus("Draft")}>
                Edit
              </button>
            </div>
          )}
        </div>

        {/* ── TWO-COLUMN GRID ── */}
        <div className="grid">

          {/* ════════════ LEFT COLUMN ════════════ */}
          <div className="col">

            {/* 1 · BASIC INFORMATION */}
            <div className="sec">
              <div className="sec-head">
                <div className={`sn${basicDone ? " done" : ""}`}>
                  {basicDone ? "✓" : "1"}
                </div>
                <span className="sec-label">Basic Information</span>
              </div>
              <div className="sec-body" style={{ display: "flex", flexDirection: "column" }}>
                <div className="g3" style={{ marginBottom: 10 }}>
                  <div className="field">
                    <div className="lbl">Date <span className="req">*</span></div>
                    <input
                      className="fi"
                      type="date"
                      value={basic.date}
                      onChange={e => setBasic(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <div className="lbl">Project <span className="req">*</span></div>
                   <select
  className="fs"
  value={basic.project}
  onChange={e => setBasic(p => ({ ...p, project: e.target.value }))}
>
  <option value="">Select project</option>

  {projects.map(p => (
    <option key={p.project_id || p.id} value={p.project_id || p.id}>
  {p.project_name || p.name}
</option>
  ))}
</select>
                  </div>
                  
                </div>
                <div className="field">
                  <div className="lbl">Architect Name <span className="req">*</span></div>
                  <input
  className="fi"
  value={basic.architect}
  readOnly
/>
                </div>
              </div>
            </div>

            {/* 2 · TASKS WORKED ON */}
            <div className="sec ">
              <div className="sec-head">
                <div className={`sn${tasksDone ? " done" : ""}`}>
                  {tasksDone ? "✓" : "2"}
                </div>
                <span className="sec-label">Tasks Worked On</span>
              </div>
              <div className="sec-body">
                {tasks.map((t, idx) => (
                  <div key={t.id} className="task-row">
                    <span className="task-num">{idx + 1}</span>
                    <input
                      className="task-fi"
                      placeholder="Task name…"
                      value={t.name}
                      onChange={e => updTask(t.id, "name", e.target.value)}
                    />
                    <div className="chip-row" style={{ flexShrink: 0 }}>
                      {TASK_STATUS.map(s => (
                        <span
                          key={s}
                          className={`chip${t.status === s ? " on" : ""}`}
                          onClick={() => updTask(t.id, "status", s)}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    {tasks.length > 1 && (
                      <button className="task-rm" onClick={() => remTask(t.id)}>✕</button>
                    )}
                  </div>
                ))}
                <button className="add-row" onClick={addTask}>＋ Add task</button>
              </div>
            </div>

            {/* 3 · WORK DONE TODAY */}
            <div className="sec work ">
              <div className="sec-head">
                <div className={`sn${workDone_ ? " done" : ""}`}>
                  {workDone_ ? "✓" : "3"}
                </div>
                <span className="sec-label">Work Done Today</span>
              </div>
              <div className="sec-body" style={{ display: "flex", flexDirection: "column" }}>
                <textarea
                  className="fta"
                  style={{ resize: "none" }}
                  placeholder="Describe what was completed today — drawings finished, revisions made, models updated, coordination done, decisions taken…"
                  value={workDone}
                  onChange={e => setWorkDone(e.target.value)}
                />
              </div>
            </div>

          </div>{/* end left col */}

          {/* ════════════ RIGHT COLUMN ════════════ */}
          <div className="col">

            {/* 4 · ISSUES / BLOCKERS */}
            <div className="sec issues ">
              <div className="sec-head">
                <div className={`sn${issues.length > 0 ? " warn" : ""}`}>
                  {issues.length > 0 ? issues.length : "4"}
                </div>
                <span className="sec-label">Issues / Blockers</span>
                <span className="opt">Optional</span>
              </div>
              <div className="sec-body">
                {issues.map(issue => (
                  <div key={issue.id} className="issue-row">
                    <div className="issue-top">
                      <div className={`sev-dot ${sevDot(issue.severity)}`} />
                      <select
                        className="fs"
                        style={{ flex: 1 }}
                        value={issue.type}
                        onChange={e => updIssue(issue.id, "type", e.target.value)}
                      >
                        {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <div className="chip-row">
                        {SEVERITIES.map(s => (
                          <span
                            key={s}
                            className={`chip${issue.severity === s ? " " + sevChip(s) : ""}`}
                            onClick={() => updIssue(issue.id, "severity", s)}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <button className="irm" onClick={() => remIssue(issue.id)}>✕</button>
                    </div>
                    <input
                      className="fi"
                      style={{ marginBottom: 7 }}
                      placeholder="Issue title…"
                      value={issue.title}
                      onChange={e => updIssue(issue.id, "title", e.target.value)}
                    />
                    <textarea
                      className="fta"
                      style={{ minHeight: 52, resize: "none" }}
                      placeholder="Describe impact on today's work…"
                      value={issue.desc}
                      onChange={e => updIssue(issue.id, "desc", e.target.value)}
                    />
                  </div>
                ))}
                <button className="add-row" onClick={addIssue}>
                  ＋ Log an issue or blocker
                </button>
              </div>
            </div>

           <div className="sec attach">
  <div className="sec-head">
    <div className={`sn${attachments.length > 0 ? " info" : ""}`}>
      {attachments.length > 0 ? attachments.length : "5"}
    </div>
    <span className="sec-label">Attachments</span>
    <span className="opt">Optional</span>
  </div>

  <div className="sec-body">

    {attachments.map(a => (
      <div key={a.id} className="att-row">
        <span className="att-icon">📎</span>
        <span className="att-name">{a.name}</span>
        <span className="att-type">
          {a.file?.type || a.type}
        </span>
        <button className="att-rm" onClick={() => remAtt(a.id)}>✕</button>
      </div>
    ))}

    <div className="upload-zone">
  <input
    type="file"
    multiple
    onChange={handleFileUpload}
    style={{ display: "none" }}
    id="fileUpload"
  />

  <label htmlFor="fileUpload" style={{ cursor: "pointer", width: "100%" }}>
    <div className="upz-icon">📎</div>
    <div className="upz-text">Click to attach files</div>
    <div className="upz-sub">DWG · PDF · JPG · PNG · XLSX</div>
  </label>
</div>

  </div>
</div>

            {/* SUBMIT */}
            <div className="submit-card">
              <div className="status-row">
                <div
                  className="sdot"
                  style={{ background: logStatus === "Submitted" ? "var(--ok)" : "var(--warn)" }}
                />
                <div>
                  <div className="slabel">{logStatus}</div>
                  <div className="ssub">
                    {logStatus === "Draft"
                      ? "Save to continue later or submit when done"
                      : "Submitted to Project Manager for review"}
                  </div>
                </div>
              </div>
              <div className="sbtns">
                <button className="btn btn-s" onClick={() => handleSubmit("Draft")}>
                  Save Draft
                </button>
                <button className="btn btn-p" onClick={() => handleSubmit("Submitted")}>
                  Submit Log
                </button>
              </div>
            </div>

          </div>{/* end right col */}

        </div>{/* end .grid */}
      </div>{/* end .shell */}

      {/* TOAST */}
      <div className={`toast ${toast.show ? "s" : "h"}`}>{toast.msg}</div>
    </>
  );
}