import { useState, useEffect } from "react";
import { useProject } from "../../context/ProjectContext";
import { API } from "../../services/authService";
import ProjectSwitcher from "../../components/project/ProjectSwitcher";
import "../../styles/MEPEngineer.css";

/* ═══════════════════════════════════════
   FILE LIST
═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   VERSION DATA  (keyed by file key)
═══════════════════════════════════════ */

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
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function MEPVersionControl() {
  const { activeProject } = useProject();

  const [sel, setSel] = useState(null);
  const [notified, setNotif] = useState(false);
  const [search, setSearch] = useState("");
  const [rawDrawings, setRawDrawings] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loadingDrawings, setLoadingDrawings] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.id;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!activeProject) return;
    setLoadingDrawings(true);
    API.get(`/drawings/project/${activeProject.id}`)
      .then((res) => {
        const myDrawings = currentUserId
          ? res.data.filter((d) => d.created_by === currentUserId)
          : res.data;
        setRawDrawings(myDrawings);
        if (myDrawings.length > 0 && !sel) {
          setSel(myDrawings[0].id);
        }
      })
      .catch((err) => console.error("Failed to load drawings:", err))
      .finally(() => setLoadingDrawings(false));
  }, [activeProject]);

  useEffect(() => {
    if (!sel) return;
    setLoadingVersions(true);
    API.get(`/drawings/${sel}/versions`)
      .then((res) => {
        const mapped = res.data.map((v) => ({
          ...v,
          rev: v.revision_number,
          current: v.is_latest,
          uploader: v.uploaded_by_name || "Unknown",
          note: v.change_notes || "—",
          date: new Date(v.uploaded_at).toLocaleDateString(),
          adds: [],
          mods: [],
          dels: [],
        }));
        setVersions(mapped);
      })
      .catch(() => setVersions([]))
      .finally(() => setLoadingVersions(false));
  }, [sel]);

  if (!activeProject) return null;

  const files = rawDrawings.map((d) => ({
    key: d.id,
    name: d.name,
    sub: `${d.revision_number || "—"} · ${d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : "—"}`,
    badge:
      d.sub_discipline === "Mechanical"
        ? "badge-mep-m"
        : d.sub_discipline === "Electrical"
          ? "badge-mep-e"
          : "badge-mep-p",
    disc: d.sub_discipline,
    discBadge:
      d.sub_discipline === "Mechanical"
        ? "badge-mep-m"
        : d.sub_discipline === "Electrical"
          ? "badge-mep-e"
          : "badge-mep-p",
  }));

  const selectedFile = files.find((f) => f.key === sel);
  const currentVersion = versions.find((v) => v.current);

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const notify = () => {
    setNotif(true);
    setTimeout(() => setNotif(false), 2500);
  };

  /* badge label helper */
  const badgeLabel = (badge) =>
    badge.includes("-m") ? "Mech" : badge.includes("-e") ? "Elec" : "Plumb";

  return (
    <div className="mep-page">
      {/* ── HEADER ── */}
      <div className="mep-header">
        <div>
          <h1>Version Control</h1>
          <p>MEP Drawing Revisions — Team always uses the latest version</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ProjectSwitcher />
          <a href="/mep/upload" className="btn-primary">
            ⬆️ Upload New Version
          </a>
        </div>
      </div>

      {/* ── NEW VERSION ALERT ── */}
      <div className="alert alert-blue">
        <span className="alert-icon">📢</span>
        <span>
          <strong>New version uploaded:</strong> HVAC Level 3 — Rev-5 was
          uploaded today at 10:32 AM. All team members have been notified
          automatically.
        </span>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="stats-row">
        {[
          {
            icon: "📁",
            label: "Total Files",
            value: files.length,
            ic: "ic-blue",
          },
          {
            icon: "✅",
            label: "Up to Date",
            value: files.length,
            ic: "ic-green",
          },
          { icon: "🔔", label: "Notified Today", value: "—", ic: "ic-amber" },
          {
            icon: "🗂️",
            label: "Total Revisions",
            value: versions.length,
            ic: "ic-purple",
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

      {/* ── TWO PANEL LAYOUT ── */}
      <div className="grid-sidebar" style={{ alignItems: "start" }}>
        {/* ── LEFT: FILE LIST ── */}
        <div className="mep-card">
          <div className="mep-card-head">
            <span className="card-title">📁 Drawing Files</span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              {files.length} files
            </span>
          </div>

          {/* search inside file list */}
          <div style={{ padding: "10px 12px 0" }}>
            <div className="search-box" style={{ minWidth: "unset" }}>
              <svg
                width="12"
                height="12"
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
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mep-card-body" style={{ padding: "10px 12px" }}>
            <div className="file-list">
              {filteredFiles.map((f) => (
                <div
                  key={f.key}
                  className={`file-item${sel === f.key ? " selected" : ""}`}
                  onClick={() => setSel(f.key)}
                >
                  <span className="file-item-icon">📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="file-item-name">{f.name}</div>
                    <div className="file-item-sub">{f.sub}</div>
                  </div>
                  <span
                    className={`badge ${f.badge} file-item-badge`}
                    style={{ fontSize: 9 }}
                  >
                    {badgeLabel(f.badge)}
                  </span>
                </div>
              ))}

              {filteredFiles.length === 0 && (
                <div
                  style={{
                    padding: "20px 0",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  No files match your search.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: VERSION TIMELINE ── */}
        <div className="mep-card">
          <div className="mep-card-head">
            <span className="card-title">
              🗂️ Version History —{" "}
              <span style={{ color: "var(--primary-blue)" }}>
                {selectedFile?.name || "—"}
              </span>
              <span
                className={`badge ${selectedFile?.discBadge || ""}`}
                style={{ fontSize: 9, marginLeft: 8 }}
              >
                {selectedFile?.disc || ""}
              </span>
            </span>
            <button
              className="btn-outline"
              style={{ fontSize: 11, padding: "6px 12px" }}
              onClick={notify}
            >
              🔔 Notify Team
            </button>
          </div>

          {/* current version summary bar */}
          <div
            style={{
              margin: "0 18px 0",
              background: "rgba(30,90,150,0.05)",
              border: "1px solid rgba(30,90,150,0.14)",
              borderRadius: 8,
              padding: "10px 14px",
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  marginBottom: 2,
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
                {currentVersion?.rev || "—"}{" "}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  marginBottom: 2,
                }}
              >
                Total Revisions
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {versions.length}{" "}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  marginBottom: 2,
                }}
              >
                Last Updated
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {currentVersion?.date || "—"}
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  marginBottom: 2,
                }}
              >
                Uploaded By
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {currentVersion?.uploader || "—"}
              </div>
            </div>
          </div>

          <div className="mep-card-body" style={{ paddingTop: 16 }}>
            {loadingVersions && (
              <p style={{ padding: 16, fontSize: 13 }}>Loading versions...</p>
            )}
            <div className="ver-timeline">
              {versions.map((v, i) => (
                <div className="ver-entry" key={v.rev}>
                  <div className="ver-spine">
                    <div
                      className={`ver-dot ${v.current ? "current" : "old"}`}
                    />
                    {i < versions.length - 1 && (
                      <div className="ver-connector" />
                    )}
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
                    <div className="ver-changes">
                      {v.adds.map((a) => (
                        <ChangeChip key={a} label={a} type="add" />
                      ))}
                      {v.mods.map((m) => (
                        <ChangeChip key={m} label={m} type="mod" />
                      ))}
                      {v.dels.map((d) => (
                        <ChangeChip key={d} label={d} type="del" />
                      ))}
                    </div>
                    <div className="ver-actions">
                      <a
                        href={`http://localhost:5000${v.file_url}`}
                        download
                        className={v.current ? "btn-primary" : "btn-outline"}
                        style={{
                          fontSize: 11,
                          padding: "6px 12px",
                          textDecoration: "none",
                        }}
                      >
                        📥 {v.current ? "Download Current" : "Download"}
                      </a>
                      <button
                        className="btn-outline"
                        style={{ fontSize: 11, padding: "6px 12px" }}
                        onClick={() =>
                          window.open(
                            `http://localhost:5000${v.file_url}`,
                            "_blank",
                          )
                        }
                      >
                        👁 View
                      </button>
                      {v.current && (
                        <button
                          className="btn-outline"
                          style={{ fontSize: 11, padding: "6px 12px" }}
                          onClick={notify}
                        >
                          🔔 Notify Team
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TOAST ── */}
      {notified && (
        <div className="toast">
          🔔 Team notified of latest version — {selectedFile?.name}{" "}
          {currentVersion?.rev}
        </div>
      )}
    </div>
  );
}
