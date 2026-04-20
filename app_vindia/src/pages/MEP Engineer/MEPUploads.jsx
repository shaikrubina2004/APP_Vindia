import { useState, useRef } from "react";
import "../../styles/MEPEngineer.css";

const NOTIFY_TEAMS = [
  {
    key: "arch",
    label: "🏛️ Architect",
    role: "Person 3 — Design lead",
    defaultOn: true,
  },
  {
    key: "struct",
    label: "🏗️ Structural Engineer",
    role: "Person 4 — Coordination",
    defaultOn: true,
  },
  {
    key: "coord",
    label: "📋 Project Coordinator",
    role: "Person 1 — Schedule & milestones",
    defaultOn: true,
  },
  {
    key: "qs",
    label: "📐 Quantity Surveyor",
    role: "Person 6 — BOQ reference",
    defaultOn: false,
  },
  {
    key: "site",
    label: "👷 Site Engineer",
    role: "Person 2 — On-site execution",
    defaultOn: false,
  },
];

const RECENT = [
  { name: "Plumbing GF — Rev-3", time: "Today · 08:20", disc: "badge-mep-p" },
  { name: "HVAC Level 3 — Rev-5", time: "Today · 10:32", disc: "badge-mep-m" },
  { name: "Electrical SLD — Rev-5", time: "Yesterday", disc: "badge-mep-e" },
  { name: "Drainage L2 — Rev-4", time: "Yesterday", disc: "badge-mep-p" },
];

const GUIDELINES = [
  { ok: true, text: "Always increment the revision number before uploading" },
  {
    ok: true,
    text: "Include a clear change note describing what was modified",
  },
  { ok: true, text: "Notify Structural and Architect on every new version" },
  {
    ok: true,
    text: "Check for clashes before marking as Issued for Construction",
  },
  {
    ok: false,
    text: "Old versions are archived — team is directed to latest automatically",
  },
];

const FILE_ICONS = { dwg: "📐", dxf: "📐", pdf: "📄", rvt: "🏗️", ifc: "📐" };

export default function MEPUpload() {
  const [queued, setQueued] = useState([]);
  const [notify, setNotify] = useState(() => {
    const n = {};
    NOTIFY_TEAMS.forEach((t) => {
      n[t.key] = t.defaultOn;
    });
    return n;
  });
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (files) => {
    const items = Array.from(files).map((f) => ({
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(1) + " MB",
      prog: 0,
    }));
    setQueued((p) => [...p, ...items]);
  };
  const removeFile = (i) => setQueued((p) => p.filter((_, idx) => idx !== i));

  const startUpload = () => {
    if (!queued.length) return;
    setUploading(true);
    setProgress(0);
    const iv = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 14;
        if (next >= 100) {
          clearInterval(iv);
          setTimeout(() => {
            setUploading(false);
            setQueued([]);
            setProgress(0);
            setToast(true);
            setTimeout(() => setToast(false), 3500);
          }, 300);
          return 100;
        }
        return next;
      });
    }, 120);
  };

  const toggleNotify = (key) => setNotify((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="mep-page">
      {/* ── Header ── */}
      <div className="mep-header">
        <div>
          <h1>Upload Drawings</h1>
          <p>MEP drawing upload with version control and team notifications</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Drop Zone */}
          <div
            className={`upload-zone${dragging ? " drag" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current.click()}
          >
            <span className="upload-zone-icon">📤</span>
            <h3>Drop MEP Drawings Here</h3>
            <p>
              <strong>Click to browse</strong> or drag and drop files
            </p>
            <div className="upload-types">
              {[".DWG", ".DXF", ".PDF", ".RVT", ".IFC"].map((e) => (
                <span key={e} className="upload-type-tag">
                  {e}
                </span>
              ))}
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".dwg,.dxf,.pdf,.rvt,.ifc"
              style={{ display: "none" }}
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* Queue */}
          {queued.length > 0 && (
            <div className="mep-card">
              <div className="mep-card-head">
                <span className="card-title">📁 Files Queued</span>
                <span className="badge badge-blue">
                  {queued.length} file{queued.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="mep-card-body">
                <div className="queue-list">
                  {queued.map((f, i) => {
                    const ext = f.name.split(".").pop().toLowerCase();
                    const pct = Math.min(Math.round(progress), 100);
                    return (
                      <div className="queue-item" key={i}>
                        <span className="qi-icon">
                          {FILE_ICONS[ext] || "📄"}
                        </span>
                        <div style={{ flex: "none" }}>
                          <span className="qi-name">{f.name}</span>
                          <span className="qi-size">{f.size}</span>
                        </div>
                        {uploading ? (
                          <>
                            <div className="qi-prog">
                              <div
                                className="qi-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="qi-pct">{pct}%</span>
                          </>
                        ) : (
                          <>
                            <div style={{ flex: 1 }} />
                            <button
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                              onClick={() => removeFile(i)}
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Details form — attendance inline-edit style */}
          <div className="mep-card">
            <div className="mep-card-head">
              <span className="card-title">📋 Drawing Details</span>
            </div>
            <div className="mep-card-body">
              <div className="edit-form-grid">
                <div className="edit-form-group">
                  <label>
                    Discipline <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select className="edit-form-input">
                    <option value="">Select</option>
                    {[
                      "Mechanical (HVAC)",
                      "Electrical",
                      "Plumbing",
                      "All MEP",
                    ].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="edit-form-group">
                  <label>
                    Revision Number{" "}
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="edit-form-input"
                    placeholder="e.g. Rev-5"
                  />
                </div>
                <div className="edit-form-group">
                  <label>
                    Zone / Floor{" "}
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select className="edit-form-input">
                    <option value="">Select</option>
                    {[
                      "Basement",
                      "Ground Floor",
                      "Level 1",
                      "Level 2",
                      "Level 3",
                      "All Floors",
                      "Rooftop",
                    ].map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </div>
                <div className="edit-form-group">
                  <label>Drawing Status</label>
                  <select className="edit-form-input">
                    {[
                      "Issued for Coordination",
                      "Issued for Construction",
                      "For Review",
                      "As-Built",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="edit-form-group" style={{ marginTop: 12 }}>
                <label>
                  Change Notes / Revision Summary{" "}
                  <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <textarea
                  className="edit-form-input"
                  style={{ minHeight: 76, resize: "vertical" }}
                  placeholder="Describe what changed in this revision — location, scope, reason..."
                />
              </div>

              {/* Upload progress bar */}
              {uploading && (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    <span>⬆️ Uploading...</span>
                    <span
                      style={{
                        color: "var(--primary-blue)",
                        fontFamily: "Monaco,monospace",
                      }}
                    >
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="prog-track">
                    <div
                      className="prog-fill prog-blue"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mep-card-foot">
              <button className="btn-outline">Save Draft</button>
              <button
                className="btn-primary"
                onClick={startUpload}
                disabled={uploading || queued.length === 0}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                {uploading
                  ? `Uploading… ${Math.round(progress)}%`
                  : "Upload & Notify Team"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Notify */}
          <div className="mep-card">
            <div className="mep-card-head">
              <span className="card-title">🔔 Notify Teams on Upload</span>
            </div>
            <div className="mep-card-body">
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                }}
              >
                Select which teams receive an alert when this drawing is
                uploaded.
              </p>
              <div className="notify-list">
                {NOTIFY_TEAMS.map((t) => (
                  <label
                    key={t.key}
                    className="notify-item"
                    onClick={() => toggleNotify(t.key)}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={notify[t.key]}
                      style={{
                        width: 15,
                        height: 15,
                        accentColor: "var(--primary-blue)",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div className="notify-team">{t.label}</div>
                      <div className="notify-role">{t.role}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="mep-card">
            <div className="mep-card-head">
              <span className="card-title">📌 Upload Guidelines</span>
            </div>
            <div className="mep-card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {GUIDELINES.map((g, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 9,
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>{g.ok ? "✅" : "⚠️"}</span>
                    <span>{g.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent uploads — attendance row style */}
          <div className="mep-card">
            <div className="mep-card-head">
              <span className="card-title">🕐 Recent Uploads</span>
            </div>
            <div className="mep-card-body" style={{ padding: 0 }}>
              <div className="records-list" style={{ gap: 0 }}>
                {RECENT.map((r, i) => (
                  <div
                    key={i}
                    className="record-row bl-blue"
                    style={{
                      borderRadius: 0,
                      borderBottom:
                        i < RECENT.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                    }}
                  >
                    <div className="row-avatar" style={{ fontSize: 18 }}>
                      📄
                    </div>
                    <div className="row-main">
                      <span className="row-name">{r.name}</span>
                    </div>
                    <div className="row-spacer" />
                    <span
                      className={`badge ${r.disc}`}
                      style={{ marginRight: 8, fontSize: 9 }}
                    >
                      {r.disc.includes("-m")
                        ? "Mech"
                        : r.disc.includes("-e")
                          ? "Elec"
                          : "Plumb"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast toast-success">
          ✅ Drawing uploaded! All selected teams have been notified.
        </div>
      )}
    </div>
  );
}
