import { useState } from "react";
import "../../styles/Client.css";

const PROJECT = {
  name: "Greenview Residences – Tower B",
  manager: "Arjun Mehta",
  startDate: "Jan 2024",
  expectedCompletion: "Dec 2024",
  progress: 67,
};

const STATS = [
  {
    id: "progress",
    label: "Overall progress",
    value: "67%",
    sub: "On track",
    subType: "success",
    icon: "📐",
  },
  {
    id: "milestones",
    label: "Active milestones",
    value: "3",
    sub: "1 delayed",
    subType: "warning",
    icon: "🏗️",
  },
  {
    id: "invoices",
    label: "Pending invoices",
    value: "₹14.2L",
    sub: "Due in 5 days",
    subType: "danger",
    icon: "🧾",
  },
  {
    id: "incidents",
    label: "Open incidents",
    value: "2",
    sub: "Awaiting response",
    subType: "warning",
    icon: "⚠️",
  },
];

const MILESTONES = [
  {
    id: 1,
    name: "Foundation & excavation",
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

const INVOICES = [
  {
    id: "INV-2024-003",
    desc: "Structural work – Phase 2",
    amount: "₹14,20,000",
    due: "May 14, 2024",
    status: "due",
  },
  {
    id: "INV-2024-002",
    desc: "Foundation completion",
    amount: "₹22,80,000",
    due: "Mar 30, 2024",
    status: "paid",
  },
  {
    id: "INV-2024-001",
    desc: "Mobilisation & setup",
    amount: "₹8,50,000",
    due: "Jan 20, 2024",
    status: "paid",
  },
];

const DAILY_LOGS = [
  {
    id: 1,
    engineer: "Ravi Kumar",
    role: "Site Engineer",
    date: "Today, 6:30 PM",
    photos: 6,
    weather: "Partly cloudy · 31°C",
    crew: 24,
    tag: "Structural frame",
    summary:
      "Column casting completed for F4 north side. Shuttering removed for F3 slab. Concrete pour scheduled for F4 south tomorrow 7 AM.",
  },
  {
    id: 2,
    engineer: "Ravi Kumar",
    role: "Site Engineer",
    date: "Yesterday, 6:15 PM",
    photos: 4,
    weather: "Clear · 33°C",
    crew: 21,
    tag: "MEP rough-in",
    summary:
      "Plumbing rough-in delayed — materials not delivered. Raised procurement request. Electrical conduit work on F5 progressing well, 80% done.",
  },
  {
    id: 3,
    engineer: "Ravi Kumar",
    role: "Site Engineer",
    date: "May 7, 5:45 PM",
    photos: 3,
    weather: "Hot · 35°C",
    crew: 26,
    tag: "Safety",
    summary:
      "Safety inspection completed by officer Suresh. All workers with helmets & harness. One near-miss reported at F4 level, incident filed.",
  },
];

const INCIDENTS = [
  {
    id: "INC-042",
    title: "Tile selection approval pending from client",
    raised: "May 6, 2024",
    severity: "medium",
    status: "open",
    assignee: "Arjun Mehta",
  },
  {
    id: "INC-039",
    title: "Near-miss at F4 scaffolding — worker safety report",
    raised: "May 7, 2024",
    severity: "high",
    status: "under_review",
    assignee: "Suresh (Safety Officer)",
  },
];

function StatusPill({ status }) {
  const map = {
    done: ["Done", "pill--success"],
    in_progress: ["In progress", "pill--info"],
    delayed: ["Delayed", "pill--warning"],
    pending: ["Pending", "pill--neutral"],
    due: ["Due", "pill--danger"],
    paid: ["Paid", "pill--success"],
    open: ["Open", "pill--warning"],
    under_review: ["Under review", "pill--info"],
  };
  const [label, cls] = map[status] || [status, "pill--neutral"];
  return <span className={`pill ${cls}`}>{label}</span>;
}

function StatCard({ stat }) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon">{stat.icon}</div>
      <div className="stat-card__body">
        <span className="stat-card__label">{stat.label}</span>
        <span className="stat-card__value">{stat.value}</span>
        <span className={`stat-card__sub stat-card__sub--${stat.subType}`}>
          {stat.sub}
        </span>
      </div>
    </div>
  );
}

function MilestoneCard({ m }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`milestone-card milestone-card--${m.status}`}>
      <div
        className="milestone-card__header"
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
      >
        <div className="milestone-card__left">
          <div className="milestone-card__name">{m.name}</div>
          <div className="milestone-card__meta">Due {m.due}</div>
        </div>
        <div className="milestone-card__right">
          <StatusPill status={m.status} />
          <span className="milestone-card__pct">{m.progress}%</span>
          <span className={`milestone-card__chevron ${open ? "open" : ""}`}>
            ›
          </span>
        </div>
      </div>
      <div className="milestone-card__bar-bg">
        <div
          className={`milestone-card__bar-fill milestone-card__bar-fill--${m.status}`}
          style={{ width: `${m.progress}%` }}
        />
      </div>
      {open && (
        <ul className="milestone-card__tasks">
          {m.tasks.map((t, i) => (
            <li
              key={i}
              className={`task-item ${t.done ? "task-item--done" : ""}`}
            >
              <span className="task-item__dot" />
              {t.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LogCard({ log }) {
  return (
    <div
      className={`log-card ${log.tag === "Safety" ? "log-card--safety" : ""}`}
    >
      <div className="log-card__header">
        <div className="log-card__who">
          <div className="log-card__avatar">
            {log.engineer
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <div className="log-card__name">{log.engineer}</div>
            <div className="log-card__role">{log.role}</div>
          </div>
        </div>
        <div className="log-card__meta-right">
          <span className="log-card__date">{log.date}</span>
          <span className="log-tag">{log.tag}</span>
        </div>
      </div>
      <p className="log-card__summary">{log.summary}</p>
      <div className="log-card__footer">
        <span className="log-card__stat">📷 {log.photos} photos</span>
        <span className="log-card__stat">👷 {log.crew} crew</span>
        <span className="log-card__stat">🌤 {log.weather}</span>
      </div>
    </div>
  );
}

function InvoiceRow({ inv }) {
  return (
    <div className="invoice-row">
      <div className="invoice-row__left">
        <span className="invoice-row__id">{inv.id}</span>
        <span className="invoice-row__desc">{inv.desc}</span>
      </div>
      <div className="invoice-row__right">
        <span className="invoice-row__amount">{inv.amount}</span>
        <StatusPill status={inv.status} />
      </div>
      <div className="invoice-row__due">Due {inv.due}</div>
    </div>
  );
}

function IncidentRow({ inc }) {
  const sev = { high: "sev--high", medium: "sev--medium", low: "sev--low" };
  return (
    <div className="incident-row">
      <span className={`sev-dot ${sev[inc.severity]}`} />
      <div className="incident-row__body">
        <div className="incident-row__title">
          <span className="incident-row__id">{inc.id}</span>
          {inc.title}
        </div>
        <div className="incident-row__meta">
          Raised {inc.raised} · {inc.assignee}
        </div>
      </div>
      <StatusPill status={inc.status} />
    </div>
  );
}

export default function ClientDashboard() {
  return (
    <div className="cd-root">
      <header className="cd-header">
        <div className="cd-header__left">
          <div className="cd-header__eyebrow">Client portal</div>
          <h1 className="cd-header__title">{PROJECT.name}</h1>
          <div className="cd-header__meta">
            <span>PM: {PROJECT.manager}</span>
            <span className="sep">·</span>
            <span>Started {PROJECT.startDate}</span>
            <span className="sep">·</span>
            <span>Expected completion: {PROJECT.expectedCompletion}</span>
          </div>
        </div>
        <div className="cd-header__progress-ring">
          <svg viewBox="0 0 72 72" width="72" height="72">
            <circle cx="36" cy="36" r="30" className="ring-bg" />
            <circle
              cx="36"
              cy="36"
              r="30"
              className="ring-fill"
              strokeDasharray={`${(PROJECT.progress / 100) * 188.5} 188.5`}
              strokeDashoffset="47"
            />
          </svg>
          <span className="ring-label">{PROJECT.progress}%</span>
        </div>
      </header>

      <section className="cd-stats">
        {STATS.map((s) => (
          <StatCard key={s.id} stat={s} />
        ))}
      </section>

      <div className="cd-grid">
        <div className="cd-col">
          <div className="cd-card">
            <div className="cd-card__head">
              <span className="cd-card__title">Milestone tracker</span>
              <span className="cd-card__hint">Click to expand sub-tasks</span>
            </div>
            <div className="milestone-list">
              {MILESTONES.map((m) => (
                <MilestoneCard key={m.id} m={m} />
              ))}
            </div>
          </div>
          <div className="cd-card">
            <div className="cd-card__head">
              <span className="cd-card__title">Incidents</span>
              <span className="incident-count">{INCIDENTS.length} open</span>
            </div>
            <div className="incident-list">
              {INCIDENTS.map((inc) => (
                <IncidentRow key={inc.id} inc={inc} />
              ))}
            </div>
          </div>
        </div>
        <div className="cd-col">
          <div className="cd-card">
            <div className="cd-card__head">
              <span className="cd-card__title">Daily site logs</span>
              <span className="cd-card__hint">By site engineer</span>
            </div>
            <div className="log-list">
              {DAILY_LOGS.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          </div>
          <div className="cd-card">
            <div className="cd-card__head">
              <span className="cd-card__title">Invoices</span>
              <button className="cd-card__link">View all →</button>
            </div>
            <div className="invoice-list">
              {INVOICES.map((inv) => (
                <InvoiceRow key={inv.id} inv={inv} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
