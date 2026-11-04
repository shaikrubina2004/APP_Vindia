import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Layers3,
  ListChecks,
  Search,
  Sparkles,
} from "lucide-react";
import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

const STATUS_META = {
  done: { label: "Completed", className: "success", icon: CheckCircle2 },
  in_progress: { label: "In progress", className: "info", icon: Clock3 },
  delayed: { label: "Delayed", className: "warning", icon: AlertCircle },
  pending: { label: "Pending", className: "neutral", icon: Layers3 },
};

const FILTERS = [
  { key: "all", label: "All milestones" },
  { key: "in_progress", label: "In progress" },
  { key: "pending", label: "Pending" },
  { key: "delayed", label: "Delayed" },
  { key: "done", label: "Completed" },
];
const EMPTY_MILESTONES = [];

function getStatus(milestone) {
  const status = String(milestone.display_status || milestone.status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return STATUS_META[status] ? status : "pending";
}

function getProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`cm-status-badge cm-status-badge--${meta.className}`}>
      <Icon size={14} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function Subtask({ task }) {
  const done = ["done", "completed"].includes(
    String(task.status || "").trim().toLowerCase(),
  );
  const progress = getProgress(task.progress);

  return (
    <li className={`cm-task ${done ? "cm-task--done" : ""}`}>
      <span className="cm-task__icon" aria-hidden="true">
        {done ? <Check size={14} /> : <span />}
      </span>
      <span className="cm-task__body">
        <span className="cm-task__name">{task.name || "Untitled task"}</span>
        {task.description && (
          <span className="cm-task__description">{task.description}</span>
        )}
      </span>
      <span className="cm-task__progress">{progress}%</span>
      {task.due_date && (
        <span className="cm-task__date">{fmtDate(task.due_date)}</span>
      )}
    </li>
  );
}

function MilestoneCard({ milestone, index }) {
  const [expanded, setExpanded] = useState(false);
  const status = getStatus(milestone);
  const progress = getProgress(milestone.progress);
  const subtasks = Array.isArray(milestone.subtasks) ? milestone.subtasks : [];
  const taskDone = Number.isFinite(Number(milestone.subtask_done))
    ? Number(milestone.subtask_done)
    : subtasks.filter((task) =>
        ["done", "completed"].includes(String(task.status || "").toLowerCase()),
      ).length;

  return (
    <article className={`cm-card cm-card--${status}`}>
      <button
        className="cm-card__toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={`milestone-details-${milestone.id}`}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="cm-card__number">{String(index + 1).padStart(2, "0")}</span>
        <span className="cm-card__main">
          <span className="cm-card__eyebrow">
            {milestone.code || milestone.phase || "Project milestone"}
          </span>
          <span className="cm-card__title">{milestone.name || "Untitled milestone"}</span>
          <span className="cm-card__dates">
            <CalendarDays size={14} aria-hidden="true" />
            {fmtDate(milestone.start_date)} <span aria-hidden="true">→</span>{" "}
            {fmtDate(milestone.due_date)}
          </span>
        </span>
        <span className="cm-card__status">
          <StatusBadge status={status} />
        </span>
        <span className="cm-card__completion">
          <span>{progress}%</span>
          <span className="cm-card__completion-label">complete</span>
        </span>
        <ChevronDown
          className={`cm-card__chevron ${expanded ? "is-open" : ""}`}
          size={19}
          aria-hidden="true"
        />
      </button>

      <div className="cm-card__progress" aria-label={`${progress}% complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {expanded && (
        <div
          className="cm-card__details"
          id={`milestone-details-${milestone.id}`}
        >
          <div className="cm-detail-summary">
            <div>
              <span className="cm-detail-summary__label">Milestone overview</span>
              <p>
                {milestone.description ||
                  "No additional description has been shared for this milestone."}
              </p>
            </div>
            <div className="cm-detail-summary__tasks">
              <ListChecks size={18} aria-hidden="true" />
              <span>
                <strong>{taskDone} of {subtasks.length}</strong>
                <small>tasks complete</small>
              </span>
            </div>
          </div>

          <div className="cm-detail-heading">
            <div>
              <h3>Milestone tasks</h3>
              <p>Work items and progress shared by your project team.</p>
            </div>
            {subtasks.length > 0 && (
              <span className="cm-task-count">{subtasks.length} tasks</span>
            )}
          </div>

          {subtasks.length ? (
            <ul className="cm-task-list">
              {subtasks.map((task) => <Subtask key={task.id} task={task} />)}
            </ul>
          ) : (
            <div className="cm-no-tasks">
              <Layers3 size={18} aria-hidden="true" />
              <span>No tasks have been shared for this milestone yet.</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function ClientMilestone() {
  const { data, loading, error, refetch } = useClientAPI("/client/milestones");
  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");

  const project = data?.project || {};
  const milestones = Array.isArray(data?.milestones)
    ? data.milestones
    : EMPTY_MILESTONES;

  const counts = useMemo(() => {
    const result = { total: milestones.length, done: 0, in_progress: 0, delayed: 0, pending: 0 };
    milestones.forEach((milestone) => {
      result[getStatus(milestone)] += 1;
    });
    return result;
  }, [milestones]);

  const visibleMilestones = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return milestones.filter((milestone) => {
      const matchesStatus = activeFilter === "all" || getStatus(milestone) === activeFilter;
      const searchableText = [
        milestone.name,
        milestone.code,
        milestone.phase,
        milestone.description,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [activeFilter, milestones, query]);

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  return (
    <main className="cl-page cm-page">
      <header className="cm-page__header">
        <div>
          <div className="cm-page__eyebrow">
            <Sparkles size={15} aria-hidden="true" />
            Project progress
          </div>
          <h1 className="cm-page__title">Milestones</h1>
          <p className="cm-page__subtitle">
            Follow the key stages of {project.name || "your project"} and see what has been completed.
          </p>
        </div>
        <div className="cm-page__project">
          <span className="cm-page__project-icon"><Layers3 size={19} aria-hidden="true" /></span>
          <span>
            <small>YOUR PROJECT</small>
            <strong>{project.name || "Project overview"}</strong>
          </span>
        </div>
      </header>

      <section className="cm-summary" aria-label="Milestone summary">
        <div className="cm-summary__intro">
          <span className="cm-summary__icon"><ListChecks size={21} aria-hidden="true" /></span>
          <span>
            <strong>Project milestones</strong>
            <small>A clear view of your project stages</small>
          </span>
        </div>
        <div className="cm-summary__stats">
          <div className="cm-summary__stat cm-summary__stat--total">
            <strong>{counts.total}</strong><span>Total</span>
          </div>
          <div className="cm-summary__stat cm-summary__stat--done">
            <strong>{counts.done}</strong><span>Completed</span>
          </div>
          <div className="cm-summary__stat cm-summary__stat--progress">
            <strong>{counts.in_progress}</strong><span>In progress</span>
          </div>
          <div className="cm-summary__stat cm-summary__stat--pending">
            <strong>{counts.pending}</strong><span>Pending</span>
          </div>
          <div className="cm-summary__stat cm-summary__stat--delayed">
            <strong>{counts.delayed}</strong><span>Delayed</span>
          </div>
        </div>
      </section>

      <section className="cm-board" aria-label="Milestones list">
        <div className="cm-board__header">
          <div>
            <h2>Milestone plan</h2>
            <p>Select any milestone to view its description and task progress.</p>
          </div>
          {milestones.length > 0 && (
            <label className="cm-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search milestones"
                aria-label="Search milestones"
              />
            </label>
          )}
        </div>

        {milestones.length > 0 && (
          <div className="cm-filters" role="group" aria-label="Filter milestones by status">
            {FILTERS.map((filter) => {
              const count = filter.key === "all" ? counts.total : counts[filter.key];
              return (
                <button
                  key={filter.key}
                  type="button"
                  className={`cm-filter ${activeFilter === filter.key ? "is-active" : ""}`}
                  aria-pressed={activeFilter === filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}<span>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {milestones.length === 0 ? (
          <div className="cm-empty">
            <span className="cm-empty__icon"><Layers3 size={25} aria-hidden="true" /></span>
            <h3>No milestones shared yet</h3>
            <p>
              Your project timeline will appear here once milestone stages are added and shared with you.
              Check back later for updates from your project team.
            </p>
          </div>
        ) : visibleMilestones.length === 0 ? (
          <div className="cm-empty cm-empty--compact">
            <h3>No matching milestones</h3>
            <p>Try a different search term or status filter.</p>
            <button type="button" onClick={() => { setActiveFilter("all"); setQuery(""); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="cm-list">
            {visibleMilestones.map((milestone, index) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                index={index}
              />
            ))}
          </div>
        )}
        {milestones.length > 0 && (
          <p className="cm-board__footnote">
            <CheckCircle2 size={14} aria-hidden="true" />
            Milestone progress is based on updates shared by your project team.
          </p>
        )}
      </section>
    </main>
  );
}
