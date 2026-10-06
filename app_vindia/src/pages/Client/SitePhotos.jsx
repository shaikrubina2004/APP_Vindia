import { useCallback, useEffect, useState } from "react";
import { API } from "../../services/authService";
import { withClientProject, assetUrl, PageLoader, PageError, fmtDate } from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

const PAGE = 24;
const SOURCE_PILL = { incident: "pill--warning", task: "pill--info" };

export default function SitePhotos() {
  const [photos, setPhotos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  const load = useCallback(async (offset) => {
    offset === 0 ? setLoading(true) : setBusy(true);
    setError(null);
    try {
      const res = await API.get(withClientProject(`/client/site-photos?limit=${PAGE}&offset=${offset}`));
      setPhotos((prev) => (offset === 0 ? res.data.photos : [...prev, ...res.data.photos]));
      setTotal(res.data.total);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load photos.");
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  if (loading) return <PageLoader />;
  if (error && photos.length === 0) return <PageError message={error} onRetry={() => load(0)} />;

  const filtered = photos.filter((p) => {
    const matchSource = sourceFilter === "all" || p.source_type === sourceFilter;
    const q = search.toLowerCase();
    const matchSearch = (p.source_title || "").toLowerCase().includes(q) || (p.uploaded_by || "").toLowerCase().includes(q);
    return matchSource && matchSearch;
  });

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Progress</div>
          <h1 className="cl-page-title">Site Photos</h1>
          <p className="cl-page-sub">
            {total} photo{total !== 1 ? "s" : ""} from site progress and your own incident reports
          </p>
        </div>
      </div>

      <div className="cl-toolbar">
        <input className="cl-search" placeholder="Search by title or uploader…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="cl-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">All sources</option>
          <option value="task">Site progress</option>
          <option value="incident">My incidents</option>
        </select>
        <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: "auto" }}>
          Showing {filtered.length} of {photos.length} loaded
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="cl-empty">
          <div className="cl-empty__icon">🖼️</div>
          <p>{photos.length ? "No photos match your filter." : "No photos have been shared yet."}</p>
        </div>
      ) : (
        <div className="sp-grid">
          {filtered.map((p) => (
            <div key={p.photo_key || `${p.source_type}-${p.id}`} className="sp-card">
              <div className="sp-thumb">
                {p.url ? (
                  <img
                    src={assetUrl(p.url)}
                    alt={p.source_title || "Site photo"}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <span style={{ fontSize: 36, display: p.url ? "none" : "flex" }}>📷</span>
              </div>
              <div className="sp-card__body">
                <div className="sp-card__title">{p.source_title || "Site photo"}</div>
                <div className="sp-card__meta">{fmtDate(p.uploaded_at)} · {p.uploaded_by || "—"}</div>
                <div className="sp-card__tag" style={{ marginTop: 6 }}>
                  <span className={`pill ${SOURCE_PILL[p.source_type] || "pill--neutral"}`}>
                    {p.source_type === "incident" ? "⚠ My incident" : "✅ Site progress"}
                  </span>
                </div>
              </div>
              {p.url && (
                <a href={assetUrl(p.url)} target="_blank" rel="noreferrer" className="sp-fullsize">
                  View full size ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length < total && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="cl-btn cl-btn--ghost" disabled={busy} onClick={() => load(photos.length)}>
            {busy ? "Loading…" : `Load more (${total - photos.length} left)`}
          </button>
          {error && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
