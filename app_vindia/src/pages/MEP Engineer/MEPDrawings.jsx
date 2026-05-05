import { useState, useRef, useEffect } from "react";
import { useProject } from "../../context/ProjectContext";
import { API } from "../../services/authService";
import ProjectSwitcher from "../../components/project/ProjectSwitcher";
import "../../styles/MEPEngineer.css";

/* ═══════════════════════════════════════
   DRAWINGS DATA
═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   VERSION DATA  (keyed by drawing id)
   In production this comes from your API
═══════════════════════════════════════ */

/* fallback versions for drawings without specific data */

const downloadFile = async (fileUrl, fileName) => {
  try {
    const response = await fetch(`http://localhost:5000${fileUrl}`);
    const blob = await response.blob();
    const ext = fileUrl.split(".").pop().toLowerCase();
    const forcedBlob = new Blob([blob], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(forcedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      (fileName || fileUrl.split("/").pop()) +
      (fileName && !fileName.includes(".") ? `.${ext}` : "");
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download failed:", err);
  }
};

const DISC_ICON = { M: "🔧", E: "⚡", P: "🚿" };
const FILTERS = [
  { key: "all", label: "All" },
  { key: "M", label: "🔧 Mechanical" },
  { key: "E", label: "⚡ Electrical" },
  { key: "P", label: "🚿 Plumbing" },
];

/* ═══════════════════════════════════════
   CHANGE CHIP
═══════════════════════════════════════ */
function ChangeChip({ label, type }) {
  const cls = type === "add" ? "cc-add" : type === "mod" ? "cc-mod" : "cc-del";
  const pre = type === "add" ? "+ " : type === "mod" ? "~ " : "− ";
  return (
    <span className={`badge ${cls}`} style={{ fontSize: 9 }}>
      {pre}
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════
   SLIDE-OUT VERSIONS PANEL
═══════════════════════════════════════ */
function VersionsPanel({ drawing, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loadingV, setLoadingV] = useState(true);
  const [clashDetails, setClashDetails] = useState([]);

  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.id;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    API.get(`/drawings/clashes/${drawing.id}`)
      .then((res) => setClashDetails(res.data))
      .catch(() => setClashDetails([]));
  }, [drawing.id]);

  useEffect(() => {
    API.get(`/drawings/${drawing.id}/versions`)
      .then((res) => {
        const mapped = res.data.map((v) => ({
          ...v,
          rev: v.revision_number,
          current: v.is_latest,
          uploader: v.uploaded_by_name || "Unknown",
          title: v.title,
          note: v.change_notes || "—",
          date: new Date(v.uploaded_at).toLocaleDateString(),
          adds: [],
          mods: [],
          dels: [],
        }));
        setVersions(mapped);
      })
      .catch(() => setVersions([]))
      .finally(() => setLoadingV(false));
  }, [drawing.id]);

  /* close on Escape key */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* dimmed backdrop — click to close */}
      <div className="slideout-overlay" onClick={onClose} />

      {/* panel */}
      <div className="slideout-panel">
        {/* head */}
        <div className="slideout-head">
          <div>
            <h3>🗂️ Version History</h3>
            <p>
              <span
                className={`badge ${drawing.discBadge}`}
                style={{ marginRight: 6 }}
              >
                {drawing.discLabel}
              </span>
              {drawing.name} · {drawing.floor}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* body */}
        <div className="slideout-body">
          {loadingV && (
            <p style={{ padding: 16, fontSize: 13 }}>Loading versions...</p>
          )}
          {!loadingV && versions.length === 0 && (
            <p style={{ padding: 16, fontSize: 13 }}>No versions found.</p>
          )}
          {/* current version highlight box */}
          <div
            style={{
              background: "rgba(30,90,150,0.06)",
              border: "1px solid rgba(30,90,150,0.15)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  marginBottom: 3,
                }}
              >
                Current Version
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--primary-blue)",
                  fontFamily: "Monaco,monospace",
                }}
              >
                {drawing.rev}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <span
                className={`status-pill ${drawing.latest ? "pill-latest" : "pill-open"}`}
              >
                {drawing.latest ? "Latest" : "Outdated"}
              </span>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                }}
              >
                Last updated: {drawing.date}
              </div>
            </div>
          </div>

          {/* version count label */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              marginBottom: 10,
            }}
          >
            Full Revision History — {versions.length} version
            {versions.length > 1 ? "s" : ""}
          </div>

          {/* timeline */}
          <div className="ver-timeline">
            {versions.map((v, i) => (
              <div className="ver-entry" key={v.rev}>
                <div className="ver-spine">
                  <div className={`ver-dot ${v.current ? "current" : "old"}`} />
                  {i < versions.length - 1 && <div className="ver-connector" />}
                </div>
                <div className="ver-content">
                  <div className="ver-head">
                    <span className="ver-rev">{v.rev}</span>
                    <span
                      className={`status-pill ${v.current ? "pill-latest" : "pill-archived"}`}
                    >
                      {v.current ? "✓ Current" : "Archived"}
                    </span>
                    <span className="ver-date">{v.date}</span>
                  </div>
                  <div className="ver-uploader">👤 {v.uploader}</div>
                  <div className="ver-title">{v.title}</div>
                  <div className="ver-note">{v.note}</div>

                  {clashDetails
                    .filter(
                      (c) => c.version_id_1 === v.id || c.version_id_2 === v.id,
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: "rgba(200,50,50,0.06)",
                          border: "1px solid rgba(200,50,50,0.2)",
                          borderRadius: 6,
                          padding: "8px 10px",
                          marginBottom: 8,
                          fontSize: 11,
                          lineHeight: 1.6,
                        }}
                      >
                        <strong>🚩 {c.clash_type}</strong> — {c.description}
                        <br />
                        <span style={{ color: "var(--text-secondary)" }}>
                          Conflicts with:{" "}
                          <strong>
                            {c.drawing_1_id === drawing.id
                              ? c.drawing_2_name
                              : c.drawing_1_name}
                          </strong>
                          {" · "}Raised by: <strong>{c.raised_by_name}</strong>
                          {" · "}
                          {new Date(c.created_at).toLocaleDateString()}
                          {" · "}Status: <strong>{c.status}</strong>
                        </span>
                        {currentUserId &&
                          c.raised_by_id === currentUserId &&
                          c.status === "Open" && (
                            <div style={{ marginTop: 6 }}>
                              <button
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 10,
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  API.put(`/drawings/clashes/${c.id}/resolve`)
                                    .then(() => {
                                      setClashDetails((prev) =>
                                        prev.map((x) =>
                                          x.id === c.id
                                            ? { ...x, status: "Resolved" }
                                            : x,
                                        ),
                                      );
                                    })
                                    .catch(() => {});
                                }}
                              >
                                ✓ Mark Resolved
                              </button>
                            </div>
                          )}
                      </div>
                    ))}

                  <div className="ver-changes">
                    {(v.adds || []).map((a) => (
                      <ChangeChip key={a} label={a} type="add" />
                    ))}
                    {(v.mods || []).map((m) => (
                      <ChangeChip key={m} label={m} type="mod" />
                    ))}
                    {(v.dels || []).map((d) => (
                      <ChangeChip key={d} label={d} type="del" />
                    ))}
                  </div>
                  <div className="ver-actions">
                    <button
                      className={v.current ? "btn-primary" : "btn-outline"}
                      style={{ padding: "5px 12px", fontSize: 11 }}
                      onClick={() =>
                        downloadFile(v.file_url, `${drawing.name}-${v.rev}`)
                      }
                    >
                      📥 {v.current ? "Download Current" : "Download"}
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: "5px 12px", fontSize: 11 }}
                      onClick={() =>
                        window.open(
                          `http://localhost:5000${v.file_url}`,
                          "_blank",
                        )
                      }
                    >
                      👁 View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* foot */}
        <div className="slideout-foot">
          <a
            href="/mep/version-control"
            className="btn-outline"
            style={{ flex: 1, justifyContent: "center" }}
          >
            Open Full Version Control
          </a>
          <a
            href={`/mep/upload?drawing_id=${drawing.id}&drawing_name=${encodeURIComponent(drawing.name)}`}
            className="btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            ⬆️ Upload New Version
          </a>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function MEPDrawings() {
  const { activeProject } = useProject();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [versionsFor, setVersionsFor] = useState(null);

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    API.get(`/drawings/project/${activeProject.id}`)
      .then((res) => {
        const currentUserId = (() => {
          try {
            return JSON.parse(localStorage.getItem("user"))?.id;
          } catch {
            return null;
          }
        })();
        const filtered = currentUserId
          ? res.data.filter((d) => d.created_by === currentUserId)
          : res.data;
        setDrawings(filtered);
      })
      .catch((err) => console.error("Failed to load drawings:", err))
      .finally(() => setLoading(false));
  }, [activeProject]);

  const mapped = drawings.map((d) => ({
    ...d,
    disc:
      d.sub_discipline === "Mechanical"
        ? "M"
        : d.sub_discipline === "Electrical"
          ? "E"
          : d.sub_discipline === "Plumbing"
            ? "P"
            : d.discipline === "ARCH"
              ? "A"
              : "S",
    discLabel: d.sub_discipline,
    discBadge:
      d.sub_discipline === "Mechanical"
        ? "badge-mep-m"
        : d.sub_discipline === "Electrical"
          ? "badge-mep-e"
          : d.sub_discipline === "Plumbing"
            ? "badge-mep-p"
            : d.discipline === "ARCH"
              ? "badge-arch"
              : "badge-str",
    floor: d.floor_name,
    date: new Date(d.uploaded_at).toLocaleDateString(),
    size: d.file_size || "—",
    rev: d.revision_number || "—",
    latest: d.status !== "Superseded",
    flag: d.has_clash,
  }));

  const visible = mapped.filter((d) => {
    const mDisc = filter === "all" || d.disc === filter;
    const mSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.floor.toLowerCase().includes(search.toLowerCase());
    return mDisc && mSearch;
  });

  const counts = {
    all: mapped.length,
    M: mapped.filter((d) => d.disc === "M").length,
    E: mapped.filter((d) => d.disc === "E").length,
    P: mapped.filter((d) => d.disc === "P").length,
  };
  if (!activeProject) return null;

  return (
    <div className="mep-page">
      {/* ── HEADER ── */}
      <div className="mep-header">
        <div>
          <h1>MEP Drawings</h1>
          <p>Mechanical · Electrical · Plumbing — All Drawing Sets</p>
        </div>
        <div className="mep-header-actions">
          <ProjectSwitcher />
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

      {/* ── STAT CARDS ── */}
      <div className="stats-row">
        {[
          {
            icon: "📐",
            label: "Total Drawings",
            value: drawings.length,
            ic: "ic-blue",
          },
          {
            icon: "✅",
            label: "Latest Version",
            value: mapped.filter((d) => d.latest).length,
            ic: "ic-green",
          },
          {
            icon: "🕐",
            label: "Outdated",
            value: mapped.filter((d) => !d.latest).length,
            ic: "ic-amber",
          },
          {
            icon: "🚩",
            label: "Clash Flagged",
            value: mapped.filter((d) => d.flag).length,
            ic: "ic-red",
          },
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

      {/* ── FILTER + SEARCH BAR ── */}
      <div className="controls-bar">
        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-chip${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} ({counts[f.key]})
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
            placeholder="Search by name or floor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── DRAWING ROWS ── */}
      {/* ── DRAWING ROWS ── */}
      <div className="records-list">
        {loading && (
          <div className="no-records">
            <p>Loading drawings...</p>
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div className="no-records">
            <p>No drawings match your search.</p>
          </div>
        )}

        {visible.map((d) => (
          <div
            key={d.id}
            className={`record-row ${
              d.disc === "M"
                ? "bl-blue"
                : d.disc === "E"
                  ? "bl-purple"
                  : "bl-green"
            }`}
          >
            {/* discipline avatar */}
            <div className="row-avatar">
              <span className="row-avatar-icon">{DISC_ICON[d.disc]}</span>
            </div>

            {/* name + tags */}
            <div className="row-main" style={{ width: 230, flex: "none" }}>
              <span className="row-name">{d.name}</span>
              <div
                style={{
                  display: "flex",
                  gap: 5,
                  marginTop: 3,
                  flexWrap: "wrap",
                }}
              >
                <span className={`badge ${d.discBadge}`}>{d.discLabel}</span>
                {d.flag && <span className="badge badge-red">🚩 Clash</span>}
              </div>
            </div>

            <div className="row-divider" />

            <div className="row-meta" style={{ width: 96 }}>
              <span className="row-meta-label">Floor</span>
              <span className="row-meta-value">{d.floor}</span>
            </div>

            <div className="row-divider" />

            <div className="row-meta" style={{ width: 68 }}>
              <span className="row-meta-label">Revision</span>
              <span className="row-meta-value row-meta-mono row-meta-blue">
                {d.rev}
              </span>
            </div>

            <div className="row-divider" />

            <div className="row-meta" style={{ width: 58 }}>
              <span className="row-meta-label">Size</span>
              <span className="row-meta-value row-meta-mono">{d.size}</span>
            </div>

            <div className="row-divider" />

            <div className="row-meta" style={{ width: 86 }}>
              <span className="row-meta-label">Uploaded</span>
              <span className="row-meta-value">{d.date}</span>
            </div>

            <div className="row-divider" />

            <div className="row-meta" style={{ width: 66 }}>
              <span className="row-meta-label">Status</span>
              <span
                className={`status-pill ${d.latest ? "pill-latest" : "pill-open"}`}
              >
                {d.latest ? "Latest" : "Outdated"}
              </span>
            </div>

            <div className="row-spacer" />

            {/* actions */}
            <div className="row-actions">
              <button
                className="btn-outline"
                style={{ padding: "6px 12px", fontSize: 11 }}
                onClick={() =>
                  window.open(`http://localhost:5000${d.file_url}`, "_blank")
                }
              >
                👁 View
              </button>
              <button
                className="btn-outline"
                style={{ padding: "6px 12px", fontSize: 11 }}
                onClick={() => downloadFile(d.file_url, d.name)}
              >
                ⬇ Download
              </button>
              {/* ── Versions button opens slide-out panel ── */}
              <button
                className="btn-primary"
                style={{ padding: "7px 14px", fontSize: 11 }}
                onClick={() => setVersionsFor(d)}
              >
                🗂 Versions
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── SLIDE-OUT VERSIONS PANEL ── */}
      {versionsFor && (
        <VersionsPanel
          drawing={versionsFor}
          onClose={() => setVersionsFor(null)}
        />
      )}
    </div>
  );
}
