import { useState } from "react";
import "../../styles/Client.css";

const LOGS = [
  {
    id: 1,
    engineer: "Ravi Kumar",
    role: "Site Engineer",
    date: "May 9, 2024",
    time: "6:30 PM",
    photos: 6,
    weather: "Partly cloudy · 31°C",
    crew: 24,
    tag: "Structural frame",
    summary:
      "Column casting completed for F4 north side. Shuttering removed for F3 slab. Concrete pour scheduled for F4 south tomorrow 7 AM. Steel reinforcement for F5 columns procured and stacked on site.",
  },
  {
    id: 2,
    engineer: "Ravi Kumar",
    role: "Site Engineer",
    date: "May 8, 2024",
    time: "6:15 PM",
    photos: 4,
    weather: "Clear · 33°C",
    crew: 21,
    tag: "MEP rough-in",
    summary:
      "Plumbing rough-in delayed — materials not delivered. Raised procurement request to PM. Electrical conduit work on F5 progressing well, estimated 80% complete. Coordination meeting with MEP team held at site.",
  },
  {
    id: 3,
    engineer: "Ravi Kumar",
    role: "Site Engineer",
    date: "May 7, 2024",
    time: "5:45 PM",
    photos: 3,
    weather: "Hot · 35°C",
    crew: 26,
    tag: "Safety",
    summary:
      "Safety inspection completed by officer Suresh. All workers confirmed with helmets & harness. One near-miss reported at F4 scaffolding level — incident INC-039 filed. Toolbox talk conducted after incident.",
  },
  {
    id: 4,
    engineer: "Ravi Kumar",
    role: "Site Engineer",
    date: "May 6, 2024",
    time: "6:00 PM",
    photos: 5,
    weather: "Overcast · 29°C",
    crew: 23,
    tag: "Structural frame",
    summary:
      "F4 north column formwork erected. Concrete mix design approved by QC. Ready for pour pending slab inspection sign-off. Backfilling on south side completed and compacted.",
  },
  {
    id: 5,
    engineer: "Ravi Kumar",
    role: "Site Engineer",
    date: "May 5, 2024",
    time: "5:30 PM",
    photos: 7,
    weather: "Sunny · 34°C",
    crew: 28,
    tag: "Structural frame",
    summary:
      "Major milestone — F3 slab pour completed successfully. Total concrete poured: 42 cubic metres. No cold joints observed. Curing compound applied. Photos uploaded for QC records.",
  },
];

function LogEntry({ log }) {
  const [showPhotos, setShowPhotos] = useState(false);
  const isSafety = log.tag === "Safety";
  return (
    <div className={`dl-entry ${isSafety ? "dl-entry--safety" : ""}`}>
      <div className="dl-entry__header">
        <div className="dl-entry__who">
          <div className="dl-avatar">
            {log.engineer
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <div className="dl-name">{log.engineer}</div>
            <div className="dl-role">{log.role}</div>
          </div>
        </div>
        <div className="dl-entry__right">
          <span className="dl-date">
            {log.date} · {log.time}
          </span>
          <span className={`dl-tag ${isSafety ? "dl-tag--safety" : ""}`}>
            {log.tag}
          </span>
        </div>
      </div>
      <div className="dl-body">
        <p className="dl-summary">{log.summary}</p>
        <div className="dl-meta-row">
          <span className="dl-meta-item">📷 {log.photos} photos</span>
          <span className="dl-meta-item">👷 {log.crew} crew on site</span>
          <span className="dl-meta-item">🌤 {log.weather}</span>
          {log.photos > 0 && (
            <button
              className="cl-btn cl-btn--ghost"
              style={{
                marginLeft: "auto",
                padding: "4px 12px",
                fontSize: "12px",
              }}
              onClick={() => setShowPhotos((v) => !v)}
            >
              {showPhotos ? "Hide photos" : "View photos"}
            </button>
          )}
        </div>
        {showPhotos && (
          <div className="dl-photos-grid">
            {Array.from({ length: log.photos }).map((_, i) => (
              <div key={i} className="dl-photo-thumb">
                📷
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DailyLogs() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  const tags = ["all", ...new Set(LOGS.map((l) => l.tag))];
  const filtered = LOGS.filter(
    (l) =>
      (tagFilter === "all" || l.tag === tagFilter) &&
      (l.summary.toLowerCase().includes(search.toLowerCase()) ||
        l.date.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Progress</div>
          <h1 className="cl-page-title">Daily Site Logs</h1>
          <p className="cl-page-sub">
            Submitted by site engineer after each working day
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
              {t === "all" ? "All tags" : t}
            </option>
          ))}
        </select>
      </div>

      <div className="dl-feed">
        {filtered.length ? (
          filtered.map((log) => <LogEntry key={log.id} log={log} />)
        ) : (
          <div className="cl-empty">
            <div className="cl-empty__icon">📋</div>No logs match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
