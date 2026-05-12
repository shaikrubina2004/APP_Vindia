import { useState } from "react";
import "../../styles/Client.css";

const PHOTOS = [
  {
    id: 1,
    title: "F4 column casting – north",
    date: "May 9, 2024",
    tag: "Structural frame",
    milestone: "Structural frame – floors 1–5",
    uploader: "Ravi Kumar",
  },
  {
    id: 2,
    title: "F3 slab shuttering removal",
    date: "May 9, 2024",
    tag: "Structural frame",
    milestone: "Structural frame – floors 1–5",
    uploader: "Ravi Kumar",
  },
  {
    id: 3,
    title: "Electrical conduit – F5",
    date: "May 8, 2024",
    tag: "MEP rough-in",
    milestone: "MEP rough-in",
    uploader: "Ravi Kumar",
  },
  {
    id: 4,
    title: "Safety inspection – F4",
    date: "May 7, 2024",
    tag: "Safety",
    milestone: "Structural frame – floors 1–5",
    uploader: "Suresh",
  },
  {
    id: 5,
    title: "Scaffolding near-miss site",
    date: "May 7, 2024",
    tag: "Safety",
    milestone: "Structural frame – floors 1–5",
    uploader: "Suresh",
  },
  {
    id: 6,
    title: "F4 formwork erected",
    date: "May 6, 2024",
    tag: "Structural frame",
    milestone: "Structural frame – floors 1–5",
    uploader: "Ravi Kumar",
  },
  {
    id: 7,
    title: "South side backfill",
    date: "May 6, 2024",
    tag: "Structural frame",
    milestone: "Structural frame – floors 1–5",
    uploader: "Ravi Kumar",
  },
  {
    id: 8,
    title: "F3 slab pour – in progress",
    date: "May 5, 2024",
    tag: "Structural frame",
    milestone: "Structural frame – floors 1–5",
    uploader: "Ravi Kumar",
  },
  {
    id: 9,
    title: "Concrete pump on site",
    date: "May 5, 2024",
    tag: "Structural frame",
    milestone: "Structural frame – floors 1–5",
    uploader: "Ravi Kumar",
  },
  {
    id: 10,
    title: "Foundation completed",
    date: "Mar 14, 2024",
    tag: "Foundation",
    milestone: "Foundation & excavation",
    uploader: "Ravi Kumar",
  },
  {
    id: 11,
    title: "PCC layer – finished",
    date: "Mar 10, 2024",
    tag: "Foundation",
    milestone: "Foundation & excavation",
    uploader: "Ravi Kumar",
  },
  {
    id: 12,
    title: "Excavation complete",
    date: "Feb 18, 2024",
    tag: "Foundation",
    milestone: "Foundation & excavation",
    uploader: "Ravi Kumar",
  },
];

const TAG_COLORS = {
  "Structural frame": "pill--info",
  "MEP rough-in": "pill--warning",
  Safety: "pill--danger",
  Foundation: "pill--success",
};

// Emoji stand-ins for photo thumbnails (replace with real <img> when connected to API)
const THUMB_EMOJIS = {
  "Structural frame": "🏗️",
  "MEP rough-in": "🔧",
  Safety: "⛑️",
  Foundation: "🪨",
};

export default function SitePhotos() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  const tags = ["all", ...new Set(PHOTOS.map((p) => p.tag))];
  const filtered = PHOTOS.filter(
    (p) =>
      (tagFilter === "all" || p.tag === tagFilter) &&
      p.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Progress</div>
          <h1 className="cl-page-title">Site Photos</h1>
          <p className="cl-page-sub">
            {PHOTOS.length} photos uploaded across all milestones
          </p>
        </div>
      </div>

      <div className="cl-toolbar">
        <input
          className="cl-search"
          placeholder="Search photos…"
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
        <span
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginLeft: "auto",
          }}
        >
          {filtered.length} photos
        </span>
      </div>

      {filtered.length ? (
        <div className="sp-grid">
          {filtered.map((p) => (
            <div key={p.id} className="sp-card">
              <div className="sp-thumb">
                <span style={{ fontSize: 40 }}>
                  {THUMB_EMOJIS[p.tag] || "📷"}
                </span>
              </div>
              <div className="sp-card__body">
                <div className="sp-card__title">{p.title}</div>
                <div className="sp-card__meta">
                  {p.date} · {p.uploader}
                </div>
                <div className="sp-card__tag">
                  <span
                    className={`pill ${TAG_COLORS[p.tag] || "pill--neutral"}`}
                  >
                    {p.tag}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cl-empty">
          <div className="cl-empty__icon">🖼️</div>No photos match your filter.
        </div>
      )}
    </div>
  );
}
