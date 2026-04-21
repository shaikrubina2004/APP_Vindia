import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ IMPORTANT
import "./ArchitectDashboard.css";

const projectsData = [
  {
    id: 1,
    name: "Skyward Residency",
    version: "v4.2.1-RELEASE",
    phase: "Phase 1",
    accuracy: 98.4,
    incidents: [
      { id: 1, issue: "Beam clash with HVAC (Grid B-12)", priority: "HIGH", status: "Coordination Required", discipline: "MEP/Struct", age: "2d" },
      { id: 2, issue: "Column offset Basement B2", priority: "MEDIUM", status: "Awaiting Architect", discipline: "Structural", age: "4d" },
      { id: 3, issue: "Skylight structural load conflict", priority: "HIGH", status: "In Progress", discipline: "MEP/Struct", age: "4d" },
      { id: 4, issue: "Lobby flooring material query", priority: "LOW", status: "Pending Review", discipline: "Client", age: "9d" },
    ],
    signoffItems: [
      { id: 1, title: "Level 3 Floor Plan — Block A", version: "v2.4", sentDaysAgo: 3, status: "OVERDUE" },
      { id: 2, title: "Facade Elevation — South Wing", version: "v1.7", sentDaysAgo: 5, status: "OVERDUE" },
      { id: 3, title: "Structural Interface Drawing", version: "v3.0", sentDaysAgo: 1, status: "Awaiting" },
      { id: 4, title: "MEP Coordination Sheet", version: "v2.1", sentDaysAgo: 0, status: "APPROVED" },
    ],
    tasks: [
      { id: 1, name: "Upload stair section drawings", assignee: "P. Rao", initials: "PR", due: "Done", done: true },
      { id: 2, name: "Revise facade panel schedule", assignee: "S. Mehta", initials: "SM", due: "Today", done: false },
      { id: 3, name: "Coordinate with MEP on duct routing", assignee: "T. Kumar", initials: "TK", due: "Fri", done: false },
      { id: 4, name: "Update room data sheets — L4", assignee: "A. Jain", initials: "AJ", due: "Mon", done: false },
      { id: 5, name: "Prepare sign-off pack for Block B", assignee: "P. Rao", initials: "PR", due: "Mon", done: false },
    ],
    versions: [
      { ver: "v3.0", name: "Structural Interface", date: "Today", author: "AK", status: "Current" },
      { ver: "v2.4", name: "L3 Floor Plan — Block A", date: "2 days ago", author: "AK", status: "Pending" },
      { ver: "v1.7", name: "Facade Elevation S. Wing", date: "5 days ago", author: "SM", status: "Pending" },
      { ver: "v2.1", name: "MEP Coordination Sheet", date: "1 week ago", author: "TK", status: "Approved" },
    ],
    structural: [
      { title: "Confirm shear wall spec at Grid F", by: "Eng. Patel", age: "3 days ago", status: "Awaiting" },
      { title: "Column cap plate drawing shared", by: "Eng. Sharma", age: "Today", status: "Received" },
      { title: "Slab recess for MEP penetration", by: "AK", age: "1 week ago", status: "Resolved" },
    ],
    mep: [
      { title: "HVAC duct routing — Level 5 clash", by: "MEP Lead", age: "2 days ago", status: "Urgent" },
      { title: "Electrical riser shaft dimension", by: "T. Kumar", age: "Yesterday", status: "Pending" },
      { title: "Plumbing chase location confirmed", by: "AK", age: "3 days ago", status: "Resolved" },
    ],
    trendData: [
      { day: "Apr 14", clashes: 8, resolved: 1 },
      { day: "Apr 15", clashes: 6, resolved: 3 },
      { day: "Apr 16", clashes: 5, resolved: 5 },
      { day: "Apr 17", clashes: 4, resolved: 7 },
    ],
  },
  {
    id: 2,
    name: "Green Valley Towers",
    version: "v2.3.0-DRAFT",
    phase: "Phase 2",
    accuracy: 92.1,
    incidents: [
      { id: 1, issue: "Pipe routing conflict Level 3", priority: "MEDIUM", status: "Pending Review", discipline: "MEP", age: "1d" },
    ],
    signoffItems: [
      { id: 1, title: "Site Plan — Block C", version: "v1.2", sentDaysAgo: 1, status: "Awaiting" },
    ],
    tasks: [
      { id: 1, name: "Review site drainage layout", assignee: "A. Jain", initials: "AJ", due: "Thu", done: false },
      { id: 2, name: "Submit MEP interface sheet", assignee: "T. Kumar", initials: "TK", due: "Fri", done: false },
    ],
    versions: [
      { ver: "v1.2", name: "Site Plan — Block C", date: "Yesterday", author: "AK", status: "Pending" },
    ],
    structural: [
      { title: "Foundation detail clarification", by: "Eng. Roy", age: "2 days ago", status: "Awaiting" },
    ],
    mep: [
      { title: "Pipe routing conflict Level 3", by: "MEP Lead", age: "1 day ago", status: "Urgent" },
    ],
    trendData: [
      { day: "Apr 14", clashes: 3, resolved: 0 },
      { day: "Apr 15", clashes: 2, resolved: 1 },
      { day: "Apr 16", clashes: 2, resolved: 1 },
      { day: "Apr 17", clashes: 1, resolved: 2 },
    ],
  },
];

function ArchitectDashboard() {
  const navigate = useNavigate(); // ✅ ONLY here (correct place)

  const [projects] = useState(projectsData);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0].id);
  const [logSubmitted, setLogSubmitted] = useState(false);
  const [logText, setLogText] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [taskStates, setTaskStates] = useState({});
  const [filterDiscipline, setFilterDiscipline] = useState("All Disciplines");
  const [clock, setClock] = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSignOff = (incidentId) => {
    alert(
      `✓ Client Sign-off Initiated\nRef: ARC-${selectedProject.id}0${incidentId}\n${selectedProject.name} → Project Manager → Client`
    );
  };

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSubmitLog = () => {
    if (!logText.trim()) {
      alert("Please enter your progress notes before submitting.");
      return;
    }
    setLogSubmitted(true);
    setLogText("");
    setSelectedTags([]);
  };

  const toggleTask = (projId, taskId) => {
    const key = `${projId}-${taskId}`;
    setTaskStates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isTaskDone = (projId, taskId) => {
    const key = `${projId}-${taskId}`;
    return key in taskStates
      ? taskStates[key]
      : selectedProject.tasks.find((t) => t.id === taskId)?.done;
  };

  const filteredIncidents =
    filterDiscipline === "All Disciplines"
      ? selectedProject.incidents
      : selectedProject.incidents.filter((i) =>
          i.discipline.includes(filterDiscipline)
        );

  const pendingSignoffs = selectedProject.signoffItems.filter(
    (s) => s.status !== "APPROVED"
  ).length;

  const activeTasks = selectedProject.tasks.filter(
    (t) => !isTaskDone(selectedProject.id, t.id)
  ).length;

  const soStatusClass = (status) => {
    if (status === "OVERDUE") return "overdue";
    if (status === "APPROVED") return "approved";
    return "awaiting";
  };

  const collabStatusClass = (status) => {
    if (status === "Urgent") return "urgent";
    if (status === "Awaiting" || status === "Pending") return "awaiting";
    return "resolved";
  };
return (
  <div className="main">

    {/* 🔷 HEADER */}
    <div className="topbar">
      <div>
        <div className="page-title">Good morning, Arjun.</div>
        <div className="page-sub">
          Friday — your daily log is due before EOD.
        </div>
      </div>

      <div className="date-chip">
        {new Date().toDateString()}
      </div>
    </div>

    {/* 🔴 ALERT */}
    {pendingSignoffs > 0 && (
      <div className="alert-banner">
        <div className="alert-text">
          {pendingSignoffs} client sign-offs are overdue — action required.
        </div>
        <button className="btn-submit">Review now</button>
      </div>
    )}

    {/* 🔷 KPI */}
    <div className="kpi-grid">

      <div className="kpi-card blue">
        <div className="kpi-label">DAILY LOG</div>
        <div className="kpi-val">Pending</div>
        <div className="kpi-meta">Due by 6:00 PM</div>
      </div>

      <div className="kpi-card blue">
        <div className="kpi-label">OPEN INCIDENTS</div>
        <div className="kpi-val">{filteredIncidents.length}</div>
        <div className="kpi-meta">2 high priority</div>
      </div>

      <div className="kpi-card blue">
        <div className="kpi-label">PENDING SIGN-OFFS</div>
        <div className="kpi-val">{pendingSignoffs}</div>
        <div className="kpi-meta">Overdue &gt; 48 hrs</div>
      </div>

      <div className="kpi-card blue">
        <div className="kpi-label">TASKS ASSIGNED</div>
        <div className="kpi-val">{activeTasks}</div>
        <div className="kpi-meta">In progress</div>
      </div>

    </div>

    {/* 🔷 ROW 1 */}
    <div className="two-col">

      {/* DAILY LOG */}
      {/* DAILY LOG CARD */}
<div 
  className="panel daily-log-card"
  onClick={() => navigate("/architect/logs")}
>
  <div className="panel-head">
    <div className="panel-title">
      Daily Progress
      <span className="panel-badge pb-danger">Not submitted</span>
    </div>
  </div>

  <div className="daily-log-content">
    <div className="daily-icon">＋</div>

    <div>
      <div className="daily-title">Add Today’s Progress</div>
      <div className="daily-sub">
        Log design updates, meetings, coordination notes
      </div>
    </div>
  </div>
</div>

     <div className="panel">
  <div className="panel-head">
    <div className="panel-title">
      Incident Queue
      <span className="panel-badge pb-danger">
        {filteredIncidents.length} open
      </span>
    </div>

    <button 
      className="log-tag"
      onClick={() => navigate("/architect/incidents")}
    >
      + New
    </button>
  </div>

  {filteredIncidents.map((inc) => (
    <div key={inc.id} className="inc-row">
      <div
        className={`inc-prio ${
          inc.priority === "HIGH"
            ? "p-high"
            : inc.priority === "MEDIUM"
            ? "p-med"
            : "p-low"
        }`}
      />

      <div>
        <div className="inc-title">{inc.issue}</div>
        <div className="inc-sub">
          {inc.discipline} • INC-00{inc.id}
        </div>
      </div>

      <span className="inc-status">{inc.status}</span>
      <span className="inc-age">{inc.age}</span>
    </div>
  ))}
</div>
</div>

    {/* 🔷 ROW 2 */}
    <div className="three-col">

      {/* SIGNOFFS */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">
            Client Sign-offs
            <span className="panel-badge pb-warn">
              {pendingSignoffs} pending
            </span>
          </div>
          <button
  className="log-tag"
  onClick={(e) => {
    e.stopPropagation(); // prevents parent click interference (safe)
    navigate("/architect/sign-off");
  }}
>
  Chase
</button>
        </div>

        {selectedProject.signoffItems.map((s) => (
          <div key={s.id} className="signoff-row">
            <div className="so-head">
              <span>{s.title}</span>
              <span className="so-version">{s.version}</span>
            </div>
            <div className="so-meta">
              <span>{s.sentDaysAgo} days ago</span>
              <span>{s.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TASKS */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">
            Task Assignments
            <span className="panel-badge pb-success">{activeTasks} active</span>
          </div>
          <button
  className="log-tag"
  onClick={() => navigate("/architect/tasks")}
>
  + Assign
</button>
        </div>

        {selectedProject.tasks.map((task) => {
          const done = isTaskDone(selectedProject.id, task.id);

          return (
            <div key={task.id} className="task-row">
              <div
                className={`task-check ${done ? "done" : ""}`}
                onClick={() => toggleTask(selectedProject.id, task.id)}
              />

              <div className="task-info">
                <div className={`task-name ${done ? "done" : ""}`}>
                  {task.name}
                </div>
                <div className="task-assignee">
                  <div className="avatar-xs">{task.initials}</div>
                  {task.assignee}
                </div>
              </div>

              <span className="task-due">
                {done ? "Done" : task.due}
              </span>
            </div>
          );
        })}
      </div>

      {/* VERSIONS */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">
            Design Versions
            <span className="panel-badge pb-success">Active</span>
          </div>
          <button
  className="log-tag"
  onClick={() => navigate("/architect/designs")}
>Upload</button>
        </div>

        {selectedProject.versions.map((v) => (
          <div key={v.ver} className="ver-row">
            <span className="ver-num">{v.ver}</span>
            <div className="ver-info">
              <div>{v.name}</div>
              <div className="ver-meta">{v.date} · {v.author}</div>
            </div>
            <span className="ver-tag">{v.status}</span>
          </div>
        ))}
      </div>

    </div>
    {/* 🔷 ROW 3 — CROSS DISCIPLINE */}
<div className="panel" style={{ marginTop: "16px" }}>
  <div className="panel-head">
    <div className="panel-title">
      Cross-Discipline Coordination
      <span className="panel-badge pb-success">Structural + MEP</span>
    </div>
    <button className="log-tag"
  onClick={() => navigate("/architect/coordination")}>+ Log Item</button>
  </div>

  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
    
    {/* STRUCTURAL */}
    <div>
      <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
        STRUCTURAL
      </div>

      {selectedProject.structural.map((item, i) => (
        <div key={i} className="inc-row">
          <div className="inc-prio p-med" />

          <div>
            <div className="inc-title">{item.title}</div>
            <div className="inc-sub">
              {item.age} • {item.by}
            </div>
          </div>

          <span className="inc-status">
            {item.status}
          </span>
        </div>
      ))}
    </div>

    {/* MEP */}
    <div>
      <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
        MEP
      </div>

      {selectedProject.mep.map((item, i) => (
        <div key={i} className="inc-row">
          <div className="inc-prio p-high" />

          <div>
            <div className="inc-title">{item.title}</div>
            <div className="inc-sub">
              {item.age} • {item.by}
            </div>
          </div>

          <span className="inc-status">
            {item.status}
          </span>
        </div>
      ))}
    </div>

  </div>
</div>
  </div>
);
}

export default ArchitectDashboard;