import { useState } from "react";
import "../../styles/Client.css";

const MILESTONES = [
  {
    id: 1,
    name: "Foundation & excavation",
    start: "Jan 10, 2024",
    due: "Mar 15, 2024",
    status: "done",
    progress: 100,
    tasks: [
      { name: "Soil testing & report", done: true },
      { name: "Excavation works", done: true },
      { name: "PCC layer", done: true },
      { name: "Foundation reinforcement", done: true },
    ],
  },
  {
    id: 2,
    name: "Structural frame – floors 1–5",
    start: "Mar 20, 2024",
    due: "Jun 15, 2024",
    status: "in_progress",
    progress: 72,
    tasks: [
      { name: "Column casting – F1 to F3", done: true },
      { name: "Slab work – F1 to F3", done: true },
      { name: "Column casting – F4 & F5", done: false },
      { name: "Slab work – F4 & F5", done: false },
    ],
  },
  {
    id: 3,
    name: "MEP rough-in",
    start: "Jun 20, 2024",
    due: "Jul 30, 2024",
    status: "delayed",
    progress: 18,
    tasks: [
      { name: "Electrical conduit layout", done: true },
      { name: "Plumbing rough-in – lower floors", done: false },
      { name: "HVAC ducting", done: false },
      { name: "Fire suppression pipe", done: false },
    ],
  },
  {
    id: 4,
    name: "Finishing & handover",
    start: "Aug 1, 2024",
    due: "Dec 10, 2024",
    status: "pending",
    progress: 0,
    tasks: [
      { name: "Plaster & putty", done: false },
      { name: "Flooring", done: false },
      { name: "Paint – interior", done: false },
      { name: "Handover inspection", done: false },
    ],
  },
];

const OVERVIEW = [
  { label: "Total milestones", val: 4 },
  { label: "Completed", val: 1 },
  { label: "In progress", val: 1 },
  { label: "Delayed", val: 1 },
];

function StatusPill({ status }) {
  const map = {
    done: ["Done", "pill--success"],
    in_progress: ["In progress", "pill--info"],
    delayed: ["Delayed", "pill--warning"],
    pending: ["Pending", "pill--neutral"],
  };
  const [label, cls] = map[status] || [status, "pill--neutral"];
  return <span className={`pill ${cls}`}>{label}</span>;
}

function MilestoneRow({ m, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`cm-milestone-row cm-milestone-row--${m.status}`}>
      <div
        className="cm-row-header"
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
      >
        <span className="cm-row-index">#{index + 1}</span>
        <div className="cm-row-info">
          <div className="cm-row-name">{m.name}</div>
          <div className="cm-row-dates">
            {m.start} → {m.due}
          </div>
        </div>
        <div className="cm-row-right">
          <StatusPill status={m.status} />
          <span className="cm-row-pct">{m.progress}%</span>
          <span className={`cm-chevron ${open ? "open" : ""}`}>›</span>
        </div>
      </div>
      <div className="cm-bar-wrap">
        <div className="cm-bar-bg">
          <div
            className={`cm-bar-fill cm-bar-fill--${m.status}`}
            style={{ width: `${m.progress}%` }}
          />
        </div>
      </div>
      {open && (
        <div className="cm-subtasks">
          <div className="cm-subtask-head">Sub-tasks</div>
          <ul className="cm-subtask-list">
            {m.tasks.map((t, i) => (
              <li
                key={i}
                className={`cm-subtask-item ${t.done ? "cm-subtask-item--done" : ""}`}
              >
                <span className="cm-check">
                  {t.done && <span className="cm-check-tick">✓</span>}
                </span>
                {t.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ClientMilestone() {
  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Progress</div>
          <h1 className="cl-page-title">Milestones</h1>
          <p className="cl-page-sub">Greenview Residences – Tower B</p>
        </div>
      </div>

      <div className="cm-progress-overview">
        {OVERVIEW.map((o) => (
          <div key={o.label} className="cm-prog-item">
            <div className="cm-prog-item__label">{o.label}</div>
            <div className="cm-prog-item__val">{o.val}</div>
          </div>
        ))}
      </div>

      <div>
        {MILESTONES.map((m, i) => (
          <MilestoneRow key={m.id} m={m} index={i} />
        ))}
      </div>
    </div>
  );
}
