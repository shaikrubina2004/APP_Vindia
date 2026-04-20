import { useState } from "react";
import "../../styles/MEPEngineer.css";

const DRAWINGS = [
  {
    id: 1,
    name: "HVAC Layout — Ground Floor",
    disc: "M",
    discLabel: "Mechanical",
    discBadge: "badge-mep-m",
    floor: "Ground Floor",
    date: "Today",
    size: "2.4 MB",
    rev: "Rev-4",
    latest: true,
    flag: false,
  },
  {
    id: 2,
    name: "HVAC Layout — Level 1",
    disc: "M",
    discLabel: "Mechanical",
    discBadge: "badge-mep-m",
    floor: "Level 1",
    date: "2 days ago",
    size: "2.1 MB",
    rev: "Rev-3",
    latest: true,
    flag: false,
  },
  {
    id: 3,
    name: "HVAC Layout — Level 2",
    disc: "M",
    discLabel: "Mechanical",
    discBadge: "badge-mep-m",
    floor: "Level 2",
    date: "5 days ago",
    size: "1.9 MB",
    rev: "Rev-2",
    latest: false,
    flag: true,
  },
  {
    id: 4,
    name: "Chiller Plant Layout",
    disc: "M",
    discLabel: "Mechanical",
    discBadge: "badge-mep-m",
    floor: "Basement",
    date: "1 week ago",
    size: "3.1 MB",
    rev: "Rev-1",
    latest: true,
    flag: false,
  },
  {
    id: 5,
    name: "Electrical Single Line",
    disc: "E",
    discLabel: "Electrical",
    discBadge: "badge-mep-e",
    floor: "All Floors",
    date: "Yesterday",
    size: "1.6 MB",
    rev: "Rev-5",
    latest: true,
    flag: false,
  },
  {
    id: 6,
    name: "Conduit Routing — GF",
    disc: "E",
    discLabel: "Electrical",
    discBadge: "badge-mep-e",
    floor: "Ground Floor",
    date: "3 days ago",
    size: "1.2 MB",
    rev: "Rev-2",
    latest: true,
    flag: true,
  },
  {
    id: 7,
    name: "Lighting Layout — L1",
    disc: "E",
    discLabel: "Electrical",
    discBadge: "badge-mep-e",
    floor: "Level 1",
    date: "4 days ago",
    size: "0.9 MB",
    rev: "Rev-3",
    latest: true,
    flag: false,
  },
  {
    id: 8,
    name: "Plumbing — Ground Floor",
    disc: "P",
    discLabel: "Plumbing",
    discBadge: "badge-mep-p",
    floor: "Ground Floor",
    date: "Today",
    size: "1.8 MB",
    rev: "Rev-3",
    latest: true,
    flag: false,
  },
  {
    id: 9,
    name: "Drainage — Level 2",
    disc: "P",
    discLabel: "Plumbing",
    discBadge: "badge-mep-p",
    floor: "Level 2",
    date: "Yesterday",
    size: "2.0 MB",
    rev: "Rev-4",
    latest: true,
    flag: false,
  },
  {
    id: 10,
    name: "Water Supply Riser",
    disc: "P",
    discLabel: "Plumbing",
    discBadge: "badge-mep-p",
    floor: "All Floors",
    date: "1 week ago",
    size: "1.4 MB",
    rev: "Rev-2",
    latest: false,
    flag: true,
  },
  {
    id: 11,
    name: "Fire Fighting Layout",
    disc: "P",
    discLabel: "Plumbing",
    discBadge: "badge-mep-p",
    floor: "All Floors",
    date: "2 weeks ago",
    size: "2.6 MB",
    rev: "Rev-1",
    latest: true,
    flag: false,
  },
  {
    id: 12,
    name: "HVAC Level 3 — Revised",
    disc: "M",
    discLabel: "Mechanical",
    discBadge: "badge-mep-m",
    floor: "Level 3",
    date: "Today",
    size: "2.3 MB",
    rev: "Rev-5",
    latest: true,
    flag: true,
  },
];

const DISC_ICON = { M: "🔧", E: "⚡", P: "🚿" };
const FILTERS = [
  { key: "all", label: "All (12)" },
  { key: "M", label: "🔧 Mechanical (4)" },
  { key: "E", label: "⚡ Electrical (3)" },
  { key: "P", label: "🚿 Plumbing (5)" },
];

export default function MEPDrawings() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const visible = DRAWINGS.filter((d) => {
    const mDisc = filter === "all" || d.disc === filter;
    const mSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.floor.toLowerCase().includes(search.toLowerCase());
    return mDisc && mSearch;
  });

  return (
    <div className="mep-page">
      {/* ── Header ── */}
      <div className="mep-header">
        <div>
          <h1>MEP Drawings</h1>
          <p>Mechanical · Electrical · Plumbing — All Drawing Sets</p>
        </div>
        <div className="mep-header-actions">
          <button className="btn-outline">📥 Download All</button>
          <a href="/mep/upload" className="btn-primary">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Upload Drawing
          </a>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-row">
        {[
          { icon: "📐", label: "Total Drawings", value: "24", ic: "ic-blue" },
          { icon: "✅", label: "Latest Version", value: "18", ic: "ic-green" },
          { icon: "🕐", label: "Pending Review", value: "6", ic: "ic-amber" },
          { icon: "🚩", label: "Clash Flagged", value: "3", ic: "ic-red" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon-wrap ${s.ic}`}>{s.icon}</div>
            <div className="stat-info">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter / Search Bar ── */}
      <div className="controls-bar">
        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-chip${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="controls-spacer" />
        <span className="controls-count">{visible.length} drawings</span>
        <div className="search-box">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search drawings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Drawing Rows (attendance-style) ── */}
      <div className="records-list">
        {visible.length === 0 && (
          <div className="no-records">
            <p>No drawings match your search.</p>
          </div>
        )}

        {visible.map((d) => (
          <div
            key={d.id}
            className={`record-row ${d.disc === "M" ? "bl-blue" : d.disc === "E" ? "bl-purple" : "bl-green"}`}
          >
            {/* Icon avatar */}
            <div className="row-avatar">
              <span className="row-avatar-icon">{DISC_ICON[d.disc]}</span>
            </div>

            {/* Name + discipline pill */}
            <div className="row-main" style={{ width: 220, flex: "none" }}>
              <span className="row-name">{d.name}</span>
              <div style={{ display: "flex", gap: 5, marginTop: 3 }}>
                <span className={`badge ${d.discBadge}`}>{d.discLabel}</span>
                {d.flag && <span className="badge badge-red">🚩 Clash</span>}
              </div>
            </div>

            <div className="row-divider" />
            <div className="row-meta" style={{ width: 90 }}>
              <span className="row-meta-label">Floor</span>
              <span className="row-meta-value row-meta-mono">{d.floor}</span>
            </div>

            <div className="row-divider" />
            <div className="row-meta" style={{ width: 70 }}>
              <span className="row-meta-label">Revision</span>
              <span className="row-meta-value row-meta-mono row-meta-blue">
                {d.rev}
              </span>
            </div>

            <div className="row-divider" />
            <div className="row-meta" style={{ width: 60 }}>
              <span className="row-meta-label">Size</span>
              <span className="row-meta-value row-meta-mono">{d.size}</span>
            </div>

            <div className="row-divider" />
            <div className="row-meta" style={{ width: 80 }}>
              <span className="row-meta-label">Uploaded</span>
              <span className="row-meta-value">{d.date}</span>
            </div>

            <div className="row-divider" />
            <div className="row-meta" style={{ width: 70 }}>
              <span className="row-meta-label">Status</span>
              <span
                className={`status-pill ${d.latest ? "pill-latest" : "pill-open"}`}
              >
                {d.latest ? "Latest" : "Outdated"}
              </span>
            </div>

            <div className="row-spacer" />

            <div className="row-actions">
              <button
                className="btn-outline"
                style={{ padding: "6px 12px", fontSize: 11 }}
              >
                👁 View
              </button>
              <button
                className="btn-outline"
                style={{ padding: "6px 12px", fontSize: 11 }}
              >
                ⬇ Download
              </button>
              <button
                className="btn-primary"
                style={{ padding: "7px 14px", fontSize: 11 }}
              >
                🗂 Versions
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
