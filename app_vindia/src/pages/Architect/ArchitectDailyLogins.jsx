import { useState, useEffect, useRef } from "react";
import "./ArchitectDailyLogins.css";
import { getArchitectProjects } from "../../services/architectprojectService";
import { submitDailyLog, getDailyLog } from "../../services/architectDailyLogService";

const STATUSES = ["To Do", "In Progress", "Under Review", "Done"];

const ISSUE_TYPES = [
  "Design Issue",
  "Missing Info",
  "Structural Conflict",
  "MEP Conflict",
  "Site Issue",
  "Client Change",
];

const SEVERITIES = ["P3", "P2", "P1"];

const todayISO = () => new Date().toISOString().slice(0, 10);

const longDate = () =>
  new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const shortDate = () =>
  new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const chipClass = (s, active) => {
  if (!active) return "adu-status-chip";
  return (
    {
      "To Do": "adu-status-chip s-todo",
      "In Progress": "adu-status-chip s-progress",
      "Under Review": "adu-status-chip s-review",
      Done: "adu-status-chip s-done",
    }[s] || "adu-status-chip s-progress"
  );
};

const sevClass = (s, active) => {
  if (!active) return "adu-sev";
  return (
    {
      P3: "adu-sev active-p3",
      P2: "adu-sev active-p2",
      P1: "adu-sev active-p1",
    }[s] || "adu-sev"
  );
};

const issueCardClass = (sev) =>
  ({ P1: "adu-issue-card p1", P2: "adu-issue-card p2", P3: "adu-issue-card p3" }[sev] ||
    "adu-issue-card p3");

const Icon = {
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Plus: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Send: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Edit: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  List: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

// ─── Daily Logs Panel ─────────────────────────────────────────────────────────

function DailyLogsPanel({ userId, projects, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
useEffect(() => {
  if (!userId || !projects.length) return;

  const today = todayISO();
  let ignore = false;

  const fetchAll = async () => {
    setLoading(true);

    try {
      const responses = await Promise.all(
        projects.map(async (p) => {
          const pid = String(p.project_id || p.id);
          try {
            const res = await getDailyLog(userId, pid, today);
            const log = res?.data;
            return log ? { ...log, project_name: p.project_name || p.name } : null;
          } catch {
            return null;
          }
        })
      );

      if (!ignore) {
        setLogs(responses.filter(Boolean));
      }
    } finally {
      if (!ignore) setLoading(false);
    }
  };

  fetchAll();
  return () => {
    ignore = true;
  };
}, [userId, projects]);
  const approvalClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return "adu-approval-tag approved";
    if (s === "rejected") return "adu-approval-tag rejected";
    return "adu-approval-tag pending";
  };

  return (
    <div className="adu-logs-overlay" onClick={onClose}>
      <div className="adu-logs-panel" onClick={(e) => e.stopPropagation()}>
        <div className="adu-logs-header">
          <div className="adu-logs-title-row">
            <Icon.List />
            <span className="adu-logs-title">Daily Logs — {shortDate()}</span>
          </div>
          <button className="adu-logs-close" onClick={onClose} type="button">
            <Icon.Close />
          </button>
        </div>

        <div className="adu-logs-body">
          {loading && (
            <div className="adu-logs-empty">
              <span className="adu-logs-spinner" />
              Loading your logs…
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="adu-logs-empty">No logs submitted for today yet.</div>
          )}

          {!loading && logs.map((log) => {
            const isOpen = expandedId === log.id;
            return (
              <div key={log.id} className={`adu-log-card ${isOpen ? "open" : ""}`}>
                <button
                  className="adu-log-card-header"
                  onClick={() => setExpandedId(isOpen ? null : log.id)}
                  type="button"
                >
                  <div className="adu-log-card-left">
                    <span className="adu-log-project">{log.project_name}</span>
                    <span className="adu-log-meta">
                      {(log.tasks || []).length} task{(log.tasks || []).length !== 1 ? "s" : ""}
                      {(log.issues || []).length > 0 &&
                        ` · ${log.issues.length} issue${log.issues.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <div className="adu-log-card-right">
                    <span className={approvalClass(log.approval_status)}>
                      {log.approval_status || "Pending"}
                    </span>
                    <span className="adu-log-chevron">
                      {isOpen ? <Icon.ChevronDown /> : <Icon.ChevronRight />}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="adu-log-card-body">
                    {log.work_done && (
                      <div className="adu-log-section">
                        <div className="adu-log-section-label">Work Summary</div>
                        <p className="adu-log-summary">{log.work_done}</p>
                      </div>
                    )}

                    {(log.tasks || []).length > 0 && (
                      <div className="adu-log-section">
                        <div className="adu-log-section-label">Tasks</div>
                        <div className="adu-log-tasks">
                          {log.tasks.map((t, i) => (
                            <div key={t.id || i} className="adu-log-task-row">
                              <span className="adu-log-task-num">{i + 1}</span>
                              <span className="adu-log-task-name">{t.task_name}</span>
                              <span className={chipClass(t.status, true)}>{t.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(log.issues || []).length > 0 && (
                      <div className="adu-log-section">
                        <div className="adu-log-section-label">Issues & Blockers</div>
                        <div className="adu-log-issues-list">
                          {log.issues.map((issue, i) => (
                            <div key={issue.id || i}
                              className={issueCardClass(issue.severity)}
                              style={{ padding: "10px 14px" }}>
                              <div className="adu-log-issue-top">
                                <span className={sevClass(issue.severity, true)}>{issue.severity}</span>
                                <span className="adu-log-issue-type">{issue.type}</span>
                                {issue.title && (
                                  <span className="adu-log-issue-title">{issue.title}</span>
                                )}
                              </div>
                              {issue.description && (
                                <p className="adu-log-issue-desc">{issue.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`adu-log-approval-callout ${(log.approval_status || "pending").toLowerCase()}`}>
                      <strong>PM Approval:</strong>{" "}
                      {log.approval_status === "Approved"
                        ? "Your log has been approved by the Project Manager."
                        : log.approval_status === "Rejected"
                        ? "Your log was rejected. Please edit and re-submit."
                        : "Awaiting Project Manager review."}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ArchitectDailyUpdate() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

  const [projects, setProjects] = useState([]);
  const [logStatus, setLogStatus] = useState("draft"); // "draft" | "submitted" | "editing"
  const [approvalStatus, setApprovalStatus] = useState("Pending");
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState({ msg: "", show: false, type: "neutral" });
  const [showLogsPanel, setShowLogsPanel] = useState(false);

  const [project, setProject] = useState("");
  const [date] = useState(todayISO());
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState([{ id: crypto.randomUUID(), name: "", status: "In Progress" }]);
  const [issues, setIssues] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [loadedLogId, setLoadedLogId] = useState(null);

  const toastRef = useRef(null);
  const originalRef = useRef(null);
  const requestRef = useRef(0);

  const architectName = user?.name || "Not Logged In";

  const toast_ = (msg, type = "neutral") => {
    setToast({ msg, show: true, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => {
      setToast({ msg: "", show: false, type: "neutral" });
    }, 2800);
  };

  // Load projects
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await getArchitectProjects(user.id);
        const list = res?.data || res || [];
        setProjects(list);
        if (list.length > 0) {
          setProject((prev) => prev || String(list[0].project_id || list[0].id || ""));
        }
      } catch {
        toast_("Could not load projects", "error");
      }
    })();
  }, [user?.id]);

  // Reset form to blank draft state
  const resetForm = () => {
    setLoadedLogId(null);
    setSummary("");
    setTasks([{ id: crypto.randomUUID(), name: "", status: "In Progress" }]);
    setIssues([]);
    setLogStatus("draft");
    setApprovalStatus("Pending");
    originalRef.current = null;
  };

  // Load log for the selected project
  useEffect(() => {
    if (!user?.id || !project) return;

    resetForm();

    const reqId = ++requestRef.current;
    let ignore = false;

    const load = async () => {
      setLoadingLog(true);
      try {
        const res = await getDailyLog(user.id, project, date);
        if (ignore || reqId !== requestRef.current) return;

        const log = res?.data || null;
        if (!log) { resetForm(); return; }

        const loadedTasks = log.tasks?.length
          ? log.tasks.map((t) => ({ id: crypto.randomUUID(), name: t.task_name || "", status: t.status || "In Progress" }))
          : [{ id: crypto.randomUUID(), name: "", status: "In Progress" }];

        const loadedIssues = (log.issues || []).map((i) => ({
          id: crypto.randomUUID(),
          title: i.title || "",
          type: i.type || "Design Issue",
          severity: i.severity || "P2",
          desc: i.description || "",
        }));

        setLoadedLogId(log.id || null);
        setApprovalStatus(log?.approval_status ?? "Pending");
        setLogStatus("submitted");
        setSummary(log.work_done || "");
        setTasks(loadedTasks);
        setIssues(loadedIssues);

        originalRef.current = {
          project,
          date,
          approvalStatus: log?.approval_status ?? "Pending",
          summary: log.work_done || "",
          tasks: loadedTasks,
          issues: loadedIssues,
          logStatus: "submitted",
          loadedLogId: log.id || null,
        };
      } catch (e) {
        console.error(e);
        if (!ignore && reqId === requestRef.current) resetForm();
      } finally {
        if (!ignore && reqId === requestRef.current) setLoadingLog(false);
      }
    };

    load();
    return () => { ignore = true; };
  }, [user?.id, project]); // eslint-disable-line react-hooks/exhaustive-deps

  const addTask = () => setTasks((p) => [...p, { id: crypto.randomUUID(), name: "", status: "In Progress" }]);
  const updTask = (id, k, v) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, [k]: v } : t)));
  const remTask = (id) => setTasks((p) => p.filter((t) => t.id !== id));

  const addIssue = () =>
    setIssues((p) => [...p, { id: crypto.randomUUID(), title: "", type: "Design Issue", severity: "P2", desc: "" }]);
  const updIssue = (id, k, v) => setIssues((p) => p.map((i) => (i.id === id ? { ...i, [k]: v } : i)));
  const remIssue = (id) => setIssues((p) => p.filter((i) => i.id !== id));

  const validate = () => {
    if (!project) return toast_("Select a project", "error"), false;
    if (!tasks.some((t) => t.name.trim())) return toast_("Add at least one activity", "error"), false;
    if (!summary.trim()) return toast_("Write a brief work summary", "error"), false;
    return true;
  };

  const doSubmit = async () => {
    if (!validate()) return;

    const payload = {
      id: loadedLogId,
      date,
      project_id: project,
      architect_id: user?.id,
      role: "Architect",
      status: "Submitted",
      approval_status: "Pending", // always reset on (re-)submit
      work_done: summary,
      tasks: tasks.filter((t) => t.name.trim()).map((t) => ({
        task_name: t.name.trim(),
        status: t.status,
      })),
      issues: issues.map((i) => ({
        title: i.title.trim(),
        type: i.type,
        severity: i.severity,
        description: i.desc.trim(),
      })),
    };

    try {
      const saved = await submitDailyLog(payload);
      const savedId = saved?.id || saved?.log_id || loadedLogId;

      setLoadedLogId(savedId);
      setApprovalStatus("Pending");
      // FIX 1: After re-submit, lock the form (no double-submit possible).
      // To submit again they must press "Edit Log" → re-submit.
      setLogStatus("submitted");

      originalRef.current = {
        project,
        date,
        approvalStatus: "Pending",
        summary,
        tasks: structuredClone(tasks),
        issues: structuredClone(issues),
        logStatus: "submitted",
        loadedLogId: savedId,
      };

      setShowConfirm(false);
      toast_("Daily update submitted ✓", "success");
    } catch (err) {
      console.error(err);
      toast_("Submission failed — please retry", "error");
    }
  };

  const isLocked = logStatus === "submitted";
  const isEditing = logStatus === "editing";

  const handleEdit = () => { if (isLocked) setLogStatus("editing"); };

  const handleCancelEdit = () => {
    const orig = originalRef.current;
    if (orig) {
      setProject(orig.project);
      setSummary(orig.summary);
      setTasks(structuredClone(orig.tasks));
      setIssues(structuredClone(orig.issues));
      setApprovalStatus(orig.approvalStatus);
      setLoadedLogId(orig.loadedLogId);
      setLogStatus(orig.logStatus);
    } else {
      setLogStatus("draft");
    }
  };

  const currentProjectName =
    projects.find((p) => String(p.project_id || p.id) === project)?.project_name || "this project";

  return (
    <div className="adu-page">
      <div className="adu-content">

        {/* ── Page header ── */}
        <div className="adu-page-header">
         
          <button className="adu-view-logs-btn" onClick={() => setShowLogsPanel(true)} type="button">
            <Icon.List />
            Daily Logs
          </button>
        </div>

        {/* ── Submitted banner ── */}
        {isLocked && !isEditing && (
          <div className="adu-submitted-banner">
            <div className="adu-submitted-check">✓</div>
            <div className="adu-submitted-text">
              <h3>Update submitted!</h3>
              <p>
                Log saved for <strong>{currentProjectName}</strong>.
                Select another project to log for a different one, or click Edit to make changes.
              </p>
            </div>
            <button className="adu-edit-link" onClick={handleEdit} type="button">
              <Icon.Edit /> Edit
            </button>
          </div>
        )}

        {/* ── Editing banner ── */}
        {isEditing && (
          <div className="adu-edit-bar">
            <span className="adu-edit-bar-icon">✏️</span>
            <div className="adu-edit-bar-text">
              <strong>You are editing a submitted log</strong>
              <span>Re-submitting will replace the existing record for this project.</span>
            </div>
            <button className="adu-cancel-edit" onClick={handleCancelEdit} type="button">Cancel</button>
          </div>
        )}

        {/* ── Form card ── */}
        <div className="adu-form">
          <div className="adu-form-top">
            <span className="adu-form-heading">Daily Log</span>
            <div className="adu-top-right">
              <span className="adu-form-date">{shortDate()}</span>
              <span className={`adu-approval-tag ${(approvalStatus || "").replace(/\s/g, "-").toLowerCase()}`}>
                {approvalStatus}
              </span>
            </div>
          </div>

          <div className="adu-form-body">
            <div className="adu-row-2">
              <div className="adu-field">
                <label className="adu-label">Architect Name</label>
                <input className="adu-input readonly" value={architectName} readOnly />
              </div>

              <div className="adu-field">
                <label className="adu-label">Project <span className="req">*</span></label>
                {/*
                  FIX 2: selector is always enabled (only disabled while actively
                  editing so you don't accidentally change project mid-edit).
                  When submitted, changing project loads that project's log (or
                  a fresh blank form), so the user can fill in another project.
                */}
                <select
                  className="adu-select"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  disabled={isEditing}
                >
                  <option value="">Select project…</option>
                  {projects.map((p) => (
                    <option key={p.project_id || p.id} value={String(p.project_id || p.id)}>
                      {p.project_name || p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingLog ? (
              <div className="adu-loading-row">
                <span className="adu-logs-spinner" />
                Loading log for this project…
              </div>
            ) : (
              <>
                <div className="adu-divider">Activities</div>
                <div className="adu-field">
                  <label className="adu-label">Tasks <span className="req">*</span></label>
                  <div className="adu-activities">
                    {tasks.map((t, i) => (
                      <div key={t.id} className="adu-activity-row">
                        <span className="adu-act-num">{i + 1}</span>
                        <input
                          className="adu-act-input"
                          value={t.name}
                          placeholder="Describe activity…"
                          onChange={(e) => updTask(t.id, "name", e.target.value)}
                          disabled={isLocked && !isEditing}
                        />
                        {!isLocked || isEditing ? (
                          <div className="adu-status-group">
                            {STATUSES.map((s) => (
                              <button type="button" key={s}
                                className={chipClass(s, t.status === s)}
                                onClick={() => updTask(t.id, "status", s)}>
                                {s}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className={chipClass(t.status, true)} style={{ pointerEvents: "none" }}>{t.status}</span>
                        )}
                        {(!isLocked || isEditing) && tasks.length > 1 && (
                          <button className="adu-act-del" onClick={() => remTask(t.id)} type="button">✕</button>
                        )}
                      </div>
                    ))}
                    {(!isLocked || isEditing) && (
                      <button className="adu-add-row" onClick={addTask} type="button">
                        <Icon.Plus /> Add activity
                      </button>
                    )}
                  </div>
                </div>

                <div className="adu-divider">Summary</div>
                <div className="adu-field">
                  <label className="adu-label">Work done today <span className="req">*</span></label>
                  <textarea
                    className="adu-textarea"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    disabled={isLocked && !isEditing}
                    rows={4}
                    placeholder="Summarise what was accomplished today…"
                  />
                </div>

                <div className="adu-divider">Issues & Blockers</div>
                <div className="adu-issues">
                  {issues.length === 0 && !isLocked && !isEditing && (
                    <div className="adu-no-issues">No issues logged — tap below to add one</div>
                  )}
                  {issues.length === 0 && isLocked && !isEditing && (
                    <div className="adu-no-issues">No issues were logged for this update</div>
                  )}
                  {issues.map((issue) => (
                    <div key={issue.id} className={issueCardClass(issue.severity)}>
                      <div className="adu-issue-top">
                        <select className="adu-issue-type" value={issue.type}
                          onChange={(e) => updIssue(issue.id, "type", e.target.value)}
                          disabled={isLocked && !isEditing}>
                          {ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <input className="adu-issue-title-input" placeholder="Issue title…"
                          value={issue.title}
                          onChange={(e) => updIssue(issue.id, "title", e.target.value)}
                          disabled={isLocked && !isEditing} />
                        {!isLocked || isEditing ? (
                          <div className="adu-sev-group">
                            {SEVERITIES.map((s) => (
                              <button type="button" key={s}
                                className={sevClass(s, issue.severity === s)}
                                onClick={() => updIssue(issue.id, "severity", s)}>
                                {s}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className={sevClass(issue.severity, true)} style={{ pointerEvents: "none" }}>{issue.severity}</span>
                        )}
                        {(!isLocked || isEditing) && (
                          <button className="adu-act-del" onClick={() => remIssue(issue.id)} type="button">✕</button>
                        )}
                      </div>
                      <textarea className="adu-issue-desc-input" placeholder="Description"
                        value={issue.desc}
                        onChange={(e) => updIssue(issue.id, "desc", e.target.value)}
                        disabled={isLocked && !isEditing} />
                    </div>
                  ))}
                  {(!isLocked || isEditing) && (
                    <button className="adu-add-issue" onClick={addIssue} type="button">
                      <Icon.Plus /> Log an issue
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="adu-form-footer">
            <div className="adu-footer-actions">
              {logStatus === "draft" && !loadingLog && (
                <button className="adu-btn adu-btn-primary"
                  onClick={() => { if (!validate()) return; setShowConfirm(true); }}
                  type="button">
                  <Icon.Send /> Submit Update
                </button>
              )}
              {isEditing && (
                <>
                  <button className="adu-btn adu-btn-ghost" onClick={handleCancelEdit} type="button">Cancel</button>
                  <button className="adu-btn adu-btn-primary"
                    onClick={() => { if (!validate()) return; setShowConfirm(true); }}
                    type="button">
                    <Icon.Send /> Re-submit Update
                  </button>
                </>
              )}
              {isLocked && !isEditing && (
                <button className="adu-btn adu-btn-ghost" onClick={handleEdit} type="button">
                  <Icon.Edit /> Edit Log
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm modal ── */}
      {showConfirm && (
        <div className="adu-confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="adu-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="adu-confirm-icon"><Icon.Send /></div>
            <h3>{isEditing ? "Re-submit daily update?" : "Submit daily update?"}</h3>
            <p>
              {isEditing
                ? "This will replace your previously submitted log for this project. The Project Manager will see the updated version."
                : "This will submit today's log for the selected project."}
            </p>
            <div className="adu-confirm-actions">
              <button className="adu-btn adu-btn-ghost" onClick={() => setShowConfirm(false)} type="button">Cancel</button>
              <button className="adu-btn adu-btn-primary" onClick={doSubmit} type="button">
                {isEditing ? "Re-submit" : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Daily Logs panel ── */}
      {showLogsPanel && (
        <DailyLogsPanel userId={user?.id} projects={projects} onClose={() => setShowLogsPanel(false)} />
      )}

      {/* ── Toast ── */}
      <div className={`adu-toast ${toast.show ? "show" : ""} ${toast.type}`}>
        {toast.type === "success" && <Icon.Check />}
        {toast.type === "error" && <Icon.Alert />}
        {toast.msg}
      </div>
    </div>
  );
}