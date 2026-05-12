import { useState } from "react";
import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

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
  const status = m.display_status || "pending";

  return (
    <div className={`cm-milestone-row cm-milestone-row--${status}`}>
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
            {fmtDate(m.start_date)} → {fmtDate(m.due_date)}
          </div>
        </div>
        <div className="cm-row-right">
          <StatusPill status={status} />
          <span className="cm-row-pct">{m.progress ?? 0}%</span>
          <span className={`cm-chevron ${open ? "open" : ""}`}>›</span>
        </div>
      </div>

      <div className="cm-bar-wrap">
        <div className="cm-bar-bg">
          <div
            className={`cm-bar-fill cm-bar-fill--${status}`}
            style={{ width: `${m.progress ?? 0}%` }}
          />
        </div>
      </div>

      {open && (
        <div className="cm-subtasks">
          <div className="cm-subtask-head">
            Sub-tasks · {m.subtask_done ?? 0} / {m.subtask_count ?? 0} done
          </div>
          <ul className="cm-subtask-list">
            {(m.subtasks || []).map((t) => {
              const isDone = [
                "DONE",
                "COMPLETED",
                "done",
                "completed",
              ].includes(t.status);
              return (
                <li
                  key={t.id}
                  className={`cm-subtask-item ${isDone ? "cm-subtask-item--done" : ""}`}
                >
                  <span className="cm-check">
                    {isDone && <span className="cm-check-tick">✓</span>}
                  </span>
                  <span style={{ flex: 1 }}>{t.name}</span>
                  {t.due_date && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {fmtDate(t.due_date)}
                    </span>
                  )}
                </li>
              );
            })}
            {(m.subtasks || []).length === 0 && (
              <li
                className="cm-subtask-item"
                style={{ color: "var(--text-muted)" }}
              >
                No sub-tasks added yet.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ClientMilestone() {
  const { data, loading, error, refetch } = useClientAPI("/client/milestones");

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const project = data?.project || {};
  const milestones = data?.milestones || [];
  const ov = data?.overview || {};

  const overviewItems = [
    { label: "Total milestones", val: ov.total ?? 0 },
    { label: "Completed", val: ov.done ?? 0 },
    { label: "In progress", val: ov.in_progress ?? 0 },
    { label: "Delayed", val: ov.delayed ?? 0 },
  ];

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Progress</div>
          <h1 className="cl-page-title">Milestones</h1>
          <p className="cl-page-sub">{project.name || "Your project"}</p>
        </div>
      </div>

      <div className="cm-progress-overview">
        {overviewItems.map((o) => (
          <div key={o.label} className="cm-prog-item">
            <div className="cm-prog-item__label">{o.label}</div>
            <div className="cm-prog-item__val">{o.val}</div>
          </div>
        ))}
      </div>

      {milestones.length === 0 ? (
        <div className="cl-empty">
          <div className="cl-empty__icon">🏗️</div>
          <p>
            No milestones are visible yet. Your project manager will share them
            soon.
          </p>
        </div>
      ) : (
        <div>
          {milestones.map((m, i) => (
            <MilestoneRow key={m.id} m={m} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
