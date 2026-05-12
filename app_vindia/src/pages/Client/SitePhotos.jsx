import { useState } from "react";
import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

const SOURCE_PILL = {
  incident: "pill--warning",
  task: "pill--info",
};

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function SitePhotos() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data, loading, error, refetch } = useClientAPI("/client/site-photos");

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const photos = data?.photos || [];

  const filtered = photos.filter((p) => {
    const matchSource =
      sourceFilter === "all" || p.source_type === sourceFilter;
    const matchSearch =
      (p.source_title || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.uploaded_by || "").toLowerCase().includes(search.toLowerCase());
    return matchSource && matchSearch;
  });

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Progress</div>
          <h1 className="cl-page-title">Site Photos</h1>
          <p className="cl-page-sub">
            {photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded
            across all milestones
          </p>
        </div>
      </div>

      <div className="cl-toolbar">
        <input
          className="cl-search"
          placeholder="Search by title or uploader…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cl-select"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="all">All sources</option>
          <option value="incident">Incidents</option>
          <option value="task">Tasks</option>
        </select>
        <span
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginLeft: "auto",
          }}
        >
          {filtered.length} photo{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="cl-empty">
          <div className="cl-empty__icon">🖼️</div>
          <p>No photos match your filter.</p>
        </div>
      ) : (
        <div className="sp-grid">
          {filtered.map((p) => (
            <div key={p.id} className="sp-card">
              <div className="sp-thumb">
                {p.url ? (
                  <img
                    src={`${BASE_URL}${p.url}`}
                    alt={p.source_title || "Site photo"}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                {/* Fallback shown if image fails or no url */}
                <span
                  style={{ fontSize: 36, display: p.url ? "none" : "flex" }}
                >
                  📷
                </span>
              </div>
              <div className="sp-card__body">
                <div className="sp-card__title">
                  {p.source_title || "Site photo"}
                </div>
                <div className="sp-card__meta">
                  {fmtDate(p.uploaded_at)} · {p.uploaded_by || "—"}
                </div>
                <div className="sp-card__tag" style={{ marginTop: 6 }}>
                  <span
                    className={`pill ${SOURCE_PILL[p.source_type] || "pill--neutral"}`}
                  >
                    {p.source_type === "incident" ? "⚠ Incident" : "✅ Task"}
                  </span>
                </div>
              </div>
              {p.url && (
                <a
                  href={`${BASE_URL}${p.url}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "8px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--accent)",
                    borderTop: "1px solid var(--border)",
                    textDecoration: "none",
                  }}
                >
                  View full size ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
