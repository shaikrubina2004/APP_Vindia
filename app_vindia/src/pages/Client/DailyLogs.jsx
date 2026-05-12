import { useState } from "react";
import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

function LogEntry({ log }) {
  const [showDetail, setShowDetail] = useState(false);
  const isSafety =
    (log.milestone_name || "").toLowerCase().includes("safety") ||
    (log.work_done || "").toLowerCase().includes("safety incident");
  const initials = (log.submitted_by_name || "SE")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  // Parse attachments if string
  let attachments = [];
  try {
    attachments =
      typeof log.attachments === "string"
        ? JSON.parse(log.attachments)
        : log.attachments || [];
  } catch {
    attachments = [];
  }

  return (
    <div className={`dl-entry ${isSafety ? "dl-entry--safety" : ""}`}>
      <div className="dl-entry__header">
        <div className="dl-entry__who">
          <div className="dl-avatar">{initials}</div>
          <div>
            <div className="dl-name">
              {log.submitted_by_name || "Site Engineer"}
            </div>
            <div className="dl-role">Site Engineer</div>
          </div>
        </div>
        <div className="dl-entry__right">
          <span className="dl-date">
            {fmtDate(log.report_date)}
            {log.shift ? ` · ${log.shift} shift` : ""}
          </span>
          {log.milestone_name && (
            <span className={`dl-tag ${isSafety ? "dl-tag--safety" : ""}`}>
              {log.milestone_name}
            </span>
          )}
        </div>
      </div>

      <div className="dl-body">
        <p className="dl-summary">{log.work_done || "—"}</p>

        <div className="dl-meta-row">
          {log.labour_total != null && (
            <span className="dl-meta-item">
              👷 {log.labour_total} crew on site
            </span>
          )}
          {log.weather_am && (
            <span className="dl-meta-item">
              🌤 {log.weather_am}
              {log.weather_pm ? ` / ${log.weather_pm}` : ""}
              {log.temp_c ? ` · ${log.temp_c}°C` : ""}
            </span>
          )}
          {log.delay_type && (
            <span className="dl-meta-item" style={{ color: "var(--amber)" }}>
              ⚠ Delay: {log.delay_type}
            </span>
          )}
          {(log.notes || log.delay_description) && (
            <button
              className="cl-btn cl-btn--ghost"
              style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 12 }}
              onClick={() => setShowDetail((v) => !v)}
            >
              {showDetail ? "Hide details" : "View details"}
            </button>
          )}
        </div>

        {showDetail && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 14px",
              background: "var(--bg-hover)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
            }}
          >
            {log.delay_description && (
              <p>
                <strong>Delay note:</strong> {log.delay_description}
              </p>
            )}
            {log.notes && (
              <p>
                <strong>Notes:</strong> {log.notes}
              </p>
            )}
            {log.next_day && (
              <p>
                <strong>Plan tomorrow:</strong> {log.next_day}
              </p>
            )}
            {log.linked_incident && (
              <p>
                <strong>Linked incident:</strong> {log.linked_incident}
              </p>
            )}
            {attachments.length > 0 && (
              <div className="dl-photos-grid" style={{ marginTop: 8 }}>
                {attachments.map((att, i) => (
                  <a
                    key={i}
                    href={`${import.meta.env.VITE_API_BASE || "http://localhost:5000"}${att.url || att}`}
                    target="_blank"
                    rel="noreferrer"
                    className="dl-photo-thumb"
                  >
                    📷
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DailyLogs() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  const { data, loading, error, refetch } = useClientAPI(
    "/client/daily-logs?limit=50",
  );

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const logs = data?.logs || [];

  // Unique milestone names for tag filter
  const tags = [
    "all",
    ...new Set(logs.map((l) => l.milestone_name).filter(Boolean)),
  ];

  const filtered = logs.filter((l) => {
    const matchTag = tagFilter === "all" || l.milestone_name === tagFilter;
    const matchSearch =
      (l.work_done || "").toLowerCase().includes(search.toLowerCase()) ||
      fmtDate(l.report_date).toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Progress</div>
          <h1 className="cl-page-title">Daily Site Logs</h1>
          <p className="cl-page-sub">
            {data?.total ?? logs.length} log{logs.length !== 1 ? "s" : ""} ·
            submitted by site engineer
          </p>
        </div>
      </div>

      <div className="cl-toolbar">
        <input
          className="cl-search"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cl-select"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          {tags.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All milestones" : t}
            </option>
          ))}
        </select>
        <span
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginLeft: "auto",
          }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="dl-feed">
        {filtered.length ? (
          filtered.map((log) => <LogEntry key={log.id} log={log} />)
        ) : (
          <div className="cl-empty">
            <div className="cl-empty__icon">📋</div>
            <p>No logs match your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
