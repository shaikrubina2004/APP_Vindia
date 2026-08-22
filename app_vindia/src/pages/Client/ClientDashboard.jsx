import { useState } from "react";
import { API } from "../../services/authService";
import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
  fmtINR,
} from "../../hooks/Useclientapi.jsx";
import CheckInButton from "../../SharedResourse/CheckInButton";
import "../../styles/Client.css";

// ── Shared pill ────────────────────────────────────────────────────────────
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
    Created: ["Created", "pill--neutral"],
    Resolved: ["Resolved", "pill--success"],
    Closed: ["Closed", "pill--neutral"],
  };
  const [label, cls] = map[status] || [status, "pill--neutral"];
  return <span className={`pill ${cls}`}>{label}</span>;
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, subType = "info" }) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value ?? "—"}</span>
        {sub && (
          <span className={`stat-card__sub stat-card__sub--${subType}`}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Milestone card (expandable) ────────────────────────────────────────────
function MilestoneCard({ m }) {
  const [open, setOpen] = useState(false);
  const status = m.display_status || "pending";
  const done = m.subtask_done ?? 0;
  const total = m.subtask_count ?? 0;

  return (
    <div className={`milestone-card milestone-card--${status}`}>
      <div
        className="milestone-card__header"
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
      >
        <div className="milestone-card__left">
          <div className="milestone-card__name">{m.name}</div>
          <div className="milestone-card__meta">Due {fmtDate(m.due_date)}</div>
        </div>
        <div className="milestone-card__right">
          <StatusPill status={status} />
          <span className="milestone-card__pct">{m.progress ?? 0}%</span>
          <span className={`milestone-card__chevron ${open ? "open" : ""}`}>
            ›
          </span>
        </div>
      </div>
      <div className="milestone-card__bar-bg">
        <div
          className={`milestone-card__bar-fill milestone-card__bar-fill--${status}`}
          style={{ width: `${m.progress ?? 0}%` }}
        />
      </div>
      {open && (
        <ul className="milestone-card__tasks">
          {(m.subtasks || []).map((t) => {
            const isDone = ["DONE", "COMPLETED", "done", "completed"].includes(
              t.status,
            );
            return (
              <li
                key={t.id}
                className={`task-item ${isDone ? "task-item--done" : ""}`}
              >
                <span className="task-item__dot" />
                {t.name}
              </li>
            );
          })}
          {total === 0 && (
            <li className="task-item" style={{ color: "var(--text-muted)" }}>
              No sub-tasks
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Daily log card ─────────────────────────────────────────────────────────
function LogCard({ log }) {
  const isSafety =
    (log.milestone_name || "").toLowerCase().includes("safety") ||
    (log.work_done || "").toLowerCase().includes("safety");
  const initials = (log.submitted_by_name || "SE")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className={`log-card ${isSafety ? "log-card--safety" : ""}`}>
      <div className="log-card__header">
        <div className="log-card__who">
          <div className="log-card__avatar">{initials}</div>
          <div>
            <div className="log-card__name">
              {log.submitted_by_name || "Site Engineer"}
            </div>
            <div className="log-card__role">Site Engineer</div>
          </div>
        </div>
        <div className="log-card__meta-right">
          <span className="log-card__date">{fmtDate(log.report_date)}</span>
          {log.milestone_name && (
            <span className="log-tag">{log.milestone_name}</span>
          )}
        </div>
      </div>
      <p className="log-card__summary">{log.work_done || "—"}</p>
      <div className="log-card__footer">
        {log.labour_total != null && (
          <span className="log-card__stat">👷 {log.labour_total} crew</span>
        )}
        {log.weather_am && (
          <span className="log-card__stat">
            🌤 {log.weather_am} {log.temp_c ? `· ${log.temp_c}°C` : ""}
          </span>
        )}
        {log.delay_type && (
          <span className="log-card__stat" style={{ color: "var(--amber)" }}>
            ⚠ {log.delay_type}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Invoice row ────────────────────────────────────────────────────────────
function InvoiceRow({ inv }) {
  const statusKey =
    inv.status === "finalised" || inv.status === "finalized"
      ? "paid"
      : inv.status === "pending_pm" || inv.status === "pending_se"
        ? "due"
        : inv.status;
  return (
    <div className="invoice-row">
      <div className="invoice-row__left">
        <span className="invoice-row__id">BOQ-{inv.id}</span>
        <span className="invoice-row__desc">{inv.milestone_name}</span>
      </div>
      <div className="invoice-row__right">
        <span className="invoice-row__amount">
          {fmtINR(inv.amount ?? inv.grand_total)}
        </span>
        <StatusPill status={statusKey} />
      </div>
      <div className="invoice-row__due">
        {inv.invoice_date
          ? `Finalised ${fmtDate(inv.invoice_date)}`
          : "Pending finalisation"}
      </div>
    </div>
  );
}

// ── Incident row ───────────────────────────────────────────────────────────
function IncidentRow({ inc }) {
  const sev = { P1: "sev--high", P2: "sev--medium", P3: "sev--low" };
  return (
    <div className="incident-row">
      <span className={`sev-dot ${sev[inc.priority] || "sev--medium"}`} />
      <div className="incident-row__body">
        <div className="incident-row__title">
          <span className="incident-row__id">{inc.incident_no}</span>
          {inc.title}
        </div>
        <div className="incident-row__meta">
          Raised {fmtDate(inc.created_at)} · {inc.created_by_name || "—"}
        </div>
      </div>
      <StatusPill status={inc.status} />
    </div>
  );
}

// ── Progress ring ──────────────────────────────────────────────────────────
function ProgressRing({ pct = 0 }) {
  const circumference = 188.5;
  return (
    <div className="cd-header__progress-ring">
      <svg viewBox="0 0 72 72" width="72" height="72">
        <circle cx="36" cy="36" r="30" className="ring-bg" />
        <circle
          cx="36"
          cy="36"
          r="30"
          className="ring-fill"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          strokeDashoffset="47"
        />
      </svg>
      <span className="ring-label">{pct}%</span>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const { data, loading, error, refetch } = useClientAPI("/client/milestones");
  const { data: logsData } = useClientAPI("/client/daily-logs?limit=3");
  const { data: invoicesData } = useClientAPI("/client/invoices");
  const { data: incidentsData } = useClientAPI("/client/incidents");

  // Used by the shared CheckInButton — decides whether to skip location
  // capture for the CEO. Falls back to role if designation isn't stored yet.
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const employeeId = currentUser?.employee_id || currentUser?.id || null;
  const designation = currentUser?.designation || currentUser?.role || null;

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const project = data?.project || {};
  const overview = data?.overview || {};
  const milestones = (data?.milestones || []).slice(0, 4);
  const logs = logsData?.logs || [];
  const invoices = (invoicesData?.invoices || []).slice(0, 3);
  const incidents = (incidentsData?.incidents || [])
    .filter((i) => i.status !== "Closed")
    .slice(0, 3);

  const progress = Math.round(project.progress ?? 0);

  return (
    <div className="cd-root">
      {/* Header */}
      <header className="cd-header">
        <div className="cd-header__left">
          <div className="cd-header__eyebrow">Client portal</div>
          <h1 className="cd-header__title">{project.name || "Your Project"}</h1>
          <div className="cd-header__meta">
            {project.start_date && (
              <>
                <span>Started {fmtDate(project.start_date)}</span>
                <span className="sep">·</span>
              </>
            )}
            {project.end_date && (
              <>
                <span>Expected {fmtDate(project.end_date)}</span>
                <span className="sep">·</span>
              </>
            )}
            <span style={{ textTransform: "capitalize" }}>
              {project.status || ""}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {employeeId && (
            <CheckInButton employeeId={employeeId} designation={designation} />
          )}
          <ProgressRing pct={progress} />
        </div>
      </header>

      {/* Stat cards */}
      <section className="cd-stats">
        <StatCard
          icon="📐"
          label="Overall progress"
          value={`${progress}%`}
          sub={
            progress >= 75
              ? "On track"
              : progress > 0
                ? "In progress"
                : "Not started"
          }
          subType={progress >= 75 ? "success" : "info"}
        />
        <StatCard
          icon="🏗️"
          label="Active milestones"
          value={overview.in_progress ?? 0}
          sub={
            overview.delayed ? `${overview.delayed} delayed` : "All on track"
          }
          subType={overview.delayed ? "warning" : "success"}
        />
        <StatCard
          icon="🧾"
          label="Total invoiced"
          value={fmtINR(invoicesData?.summary?.total_billed)}
          sub={fmtINR(invoicesData?.summary?.total_pending) + " pending"}
          subType="danger"
        />
        <StatCard
          icon="⚠️"
          label="Open incidents"
          value={incidents.length}
          sub="Awaiting response"
          subType="warning"
        />
      </section>

      {/* Grid */}
      <div className="cd-grid">
        {/* Left col */}
        <div className="cd-col">
          <div className="cd-card">
            <div className="cd-card__head">
              <span className="cd-card__title">Milestone tracker</span>
              <span className="cd-card__hint">Click to expand sub-tasks</span>
            </div>
            <div className="milestone-list">
              {milestones.length ? (
                milestones.map((m) => <MilestoneCard key={m.id} m={m} />)
              ) : (
                <p
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  No milestones yet.
                </p>
              )}
            </div>
          </div>

          <div className="cd-card">
            <div className="cd-card__head">
              <span className="cd-card__title">Incidents</span>
              <span className="incident-count">{incidents.length} open</span>
            </div>
            <div className="incident-list">
              {incidents.length ? (
                incidents.map((inc) => <IncidentRow key={inc.id} inc={inc} />)
              ) : (
                <p
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  No open incidents.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="cd-col">
          <div className="cd-card">
            <div className="cd-card__head">
              <span className="cd-card__title">Daily site logs</span>
              <span className="cd-card__hint">By site engineer</span>
            </div>
            <div className="log-list">
              {logs.length ? (
                logs.map((log) => <LogCard key={log.id} log={log} />)
              ) : (
                <p
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  No logs yet.
                </p>
              )}
            </div>
          </div>

          <div className="cd-card">
            <div className="cd-card__head">
              <span className="cd-card__title">Invoices</span>
              <a href="/client/invoices" className="cd-card__link">
                View all →
              </a>
            </div>
            <div className="invoice-list">
              {invoices.length ? (
                invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)
              ) : (
                <p
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  No invoices yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}