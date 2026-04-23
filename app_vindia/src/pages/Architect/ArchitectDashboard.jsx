import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ArchitectDashboard.css";

/* ══════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════ */
const projectsData = [
  {
    id: 1,
    name: "Skyward Residency",
    version: "v4.2.1-RELEASE",
    phase: "Phase 1",
    accuracy: 98.4,
    incidents: [
      { id: 1, issue: "Beam clash with HVAC (Grid B-12)",      priority: "HIGH",   status: "Coordination Required", discipline: "MEP/Struct", age: "2d" },
      { id: 2, issue: "Column offset Basement B2",             priority: "MEDIUM", status: "Awaiting Architect",    discipline: "Structural", age: "4d" },
      { id: 3, issue: "Skylight structural load conflict",     priority: "HIGH",   status: "In Progress",           discipline: "MEP/Struct", age: "4d" },
      { id: 4, issue: "Lobby flooring material query",         priority: "LOW",    status: "Pending Review",        discipline: "Client",     age: "9d" },
    ],
    signoffItems: [
      { id: 1, title: "Level 3 Floor Plan — Block A",  version: "v2.4", sentDaysAgo: 3, status: "OVERDUE"  },
      { id: 2, title: "Facade Elevation — South Wing", version: "v1.7", sentDaysAgo: 5, status: "OVERDUE"  },
      { id: 3, title: "Structural Interface Drawing",  version: "v3.0", sentDaysAgo: 1, status: "Awaiting" },
      { id: 4, title: "MEP Coordination Sheet",        version: "v2.1", sentDaysAgo: 0, status: "APPROVED" },
    ],
    tasks: [
      { id: 1, name: "Upload stair section drawings",          assignee: "P. Rao",   initials: "PR", due: "Done",  done: true  },
      { id: 2, name: "Revise facade panel schedule",           assignee: "S. Mehta", initials: "SM", due: "Today", done: false },
      { id: 3, name: "Coordinate with MEP on duct routing",   assignee: "T. Kumar", initials: "TK", due: "Fri",   done: false },
      { id: 4, name: "Update room data sheets — L4",          assignee: "A. Jain",  initials: "AJ", due: "Mon",   done: false },
      { id: 5, name: "Prepare sign-off pack for Block B",     assignee: "P. Rao",   initials: "PR", due: "Mon",   done: false },
    ],
    versions: [
      { ver: "v3.0", name: "Structural Interface",    date: "Today",      author: "AK", status: "Current"  },
      { ver: "v2.4", name: "L3 Floor Plan — Block A", date: "2 days ago", author: "AK", status: "Pending"  },
      { ver: "v1.7", name: "Facade Elevation S. Wing",date: "5 days ago", author: "SM", status: "Pending"  },
      { ver: "v2.1", name: "MEP Coordination Sheet",  date: "1 week ago", author: "TK", status: "Approved" },
    ],
    structural: [
      { title: "Confirm shear wall spec at Grid F",   by: "Eng. Patel",  age: "3 days ago", status: "Awaiting"  },
      { title: "Column cap plate drawing shared",     by: "Eng. Sharma", age: "Today",      status: "Received"  },
      { title: "Slab recess for MEP penetration",    by: "AK",          age: "1 week ago", status: "Resolved"  },
    ],
    mep: [
      { title: "HVAC duct routing — Level 5 clash",  by: "MEP Lead",    age: "2 days ago", status: "Urgent"    },
      { title: "Electrical riser shaft dimension",   by: "T. Kumar",    age: "Yesterday",  status: "Pending"   },
      { title: "Plumbing chase location confirmed",  by: "AK",          age: "3 days ago", status: "Resolved"  },
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
      { id: 1, name: "Review site drainage layout",   assignee: "A. Jain",  initials: "AJ", due: "Thu", done: false },
      { id: 2, name: "Submit MEP interface sheet",    assignee: "T. Kumar", initials: "TK", due: "Fri", done: false },
    ],
    versions: [
      { ver: "v1.2", name: "Site Plan — Block C", date: "Yesterday", author: "AK", status: "Pending" },
    ],
    structural: [
      { title: "Foundation detail clarification", by: "Eng. Roy",  age: "2 days ago", status: "Awaiting" },
    ],
    mep: [
      { title: "Pipe routing conflict Level 3",   by: "MEP Lead",  age: "1 day ago",  status: "Urgent"  },
    ],
  },
];

/* ══════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════ */
function ArchitectDashboard() {
  const navigate = useNavigate();

  const [projects]           = useState(projectsData);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0].id);
  const [taskStates,         setTaskStates]        = useState({});
  const [filterDiscipline,   setFilterDiscipline]  = useState("All Disciplines");
  const [clock,              setClock]             = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  /* Live clock */
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Helpers */
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

  /* Derived values */
  const filteredIncidents =
    filterDiscipline === "All Disciplines"
      ? selectedProject.incidents
      : selectedProject.incidents.filter((i) => i.discipline.includes(filterDiscipline));

  const pendingSignoffs = selectedProject.signoffItems.filter((s) => s.status !== "APPROVED").length;
  const activeTasks     = selectedProject.tasks.filter((t) => !isTaskDone(selectedProject.id, t.id)).length;

  const prioClass = (p) =>
    p === "HIGH" ? "p-high" : p === "MEDIUM" ? "p-med" : "p-low";

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  return (
    <div className="main">

      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div>
          <div className="page-title">Good morning, Arjun.</div>
          <div className="page-sub">Friday — your daily log is due before EOD.</div>
        </div>
        <div className="date-chip">{new Date().toDateString()}</div>
      </div>

      {/* ── ALERT ── */}
      {pendingSignoffs > 0 && (
        <div className="alert-banner">
          <div className="alert-text">
            {pendingSignoffs} client sign-off{pendingSignoffs > 1 ? "s" : ""} are overdue — action required.
          </div>
          <button
            className="btn-submit"
            onClick={() => navigate("/architect/sign-off")}
          >
            Review now
          </button>
        </div>
      )}

      {/* ── KPI GRID ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Daily Log</div>
          <div className="kpi-val">Pending</div>
          <div className="kpi-meta">Due by 6:00 PM</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Open Incidents</div>
          <div className="kpi-val">{filteredIncidents.length}</div>
          <div className="kpi-meta">2 high priority</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending Sign-offs</div>
          <div className="kpi-val">{pendingSignoffs}</div>
          <div className="kpi-meta">Overdue &gt; 48 hrs</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Tasks Assigned</div>
          <div className="kpi-val">{activeTasks}</div>
          <div className="kpi-meta">In progress</div>
        </div>
      </div>

      {/* ── ROW 1: Daily Log + Incidents ── */}
      <div className="two-col">

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
                  className={`task-check${done ? " done" : ""}`}
                  onClick={() => toggleTask(selectedProject.id, task.id)}
                />
                <div className="task-info">
                  <div className={`task-name${done ? " done" : ""}`}>{task.name}</div>
                  <div className="task-assignee">
                    <div className="avatar-xs">{task.initials}</div>
                    {task.assignee}
                  </div>
                </div>
                <span className="task-due">{done ? "Done" : task.due}</span>
              </div>
            );
          })}
        </div>

        {/* INCIDENT QUEUE */}
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Incident Queue
              <span className="panel-badge pb-danger">{filteredIncidents.length} open</span>
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
              <div className={`inc-prio ${prioClass(inc.priority)}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="inc-title">{inc.issue}</div>
                <div className="inc-sub">{inc.discipline} · INC-00{inc.id}</div>
              </div>
              <span className="inc-status">{inc.status}</span>
              <span className="inc-age">{inc.age}</span>
            </div>
          ))}
        </div>

      </div>

      

        

       

    

    

          

      

    </div>
  );
}

export default ArchitectDashboard;