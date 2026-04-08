import React, { useState, useRef } from "react";
import "../../styles/MEPEngineer.css";

// ── Mock Data ─────────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  {
    id: 1,
    name: "Anita Desai",
    role: "Architect",
    avatar: "A",
    status: "online",
  },
  {
    id: 2,
    name: "Rajesh Kumar",
    role: "Structural Eng.",
    avatar: "R",
    status: "online",
  },
  {
    id: 3,
    name: "Suresh Nair",
    role: "Project Manager",
    avatar: "S",
    status: "away",
  },
  {
    id: 4,
    name: "Priya Sharma",
    role: "Design Engineer",
    avatar: "P",
    status: "offline",
  },
];

const INIT_DRAWINGS = [
  {
    id: 1,
    name: "MEP-MECH-GF-001.pdf",
    type: "Mechanical",
    version: "v3",
    uploadedBy: "You",
    date: "02 Apr 2026",
    size: "4.2 MB",
    versions: [
      { v: "v3", date: "02 Apr 2026", note: "Updated duct routing" },
      { v: "v2", date: "18 Mar 2026", note: "Added fire suppression layout" },
      { v: "v1", date: "05 Mar 2026", note: "Initial upload" },
    ],
  },
  {
    id: 2,
    name: "MEP-ELEC-FF-002.pdf",
    type: "Electrical",
    version: "v2",
    uploadedBy: "You",
    date: "28 Mar 2026",
    size: "3.1 MB",
    versions: [
      { v: "v2", date: "28 Mar 2026", note: "Panel schedule revised" },
      { v: "v1", date: "10 Mar 2026", note: "Initial upload" },
    ],
  },
  {
    id: 3,
    name: "MEP-PLMB-BAS-003.pdf",
    type: "Plumbing",
    version: "v1",
    uploadedBy: "You",
    date: "15 Mar 2026",
    size: "2.8 MB",
    versions: [{ v: "v1", date: "15 Mar 2026", note: "Initial upload" }],
  },
];

const INIT_INCIDENTS = [
  {
    id: "INC-014",
    title: "Duct clashes with beam at Grid C-4",
    priority: "P1",
    status: "Open",
    assignedTo: "Rajesh Kumar",
    createdAt: "2 hrs ago",
    description:
      "Mechanical duct at level 2 clashes with structural beam. Requires redesign.",
    comments: [
      {
        author: "Rajesh Kumar",
        text: "Will review beam drawings and revert.",
        time: "1 hr ago",
      },
    ],
  },
  {
    id: "INC-015",
    title: "Electrical conduit routing conflicts with plumbing riser",
    priority: "P2",
    status: "In Progress",
    assignedTo: "Priya Sharma",
    createdAt: "1 day ago",
    description:
      "Conduit path on 3rd floor overlaps with plumbing riser shaft.",
    comments: [],
  },
  {
    id: "INC-016",
    title: "Missing valve detail on plumbing drawings",
    priority: "P3",
    status: "Resolved",
    assignedTo: "Suresh Nair",
    createdAt: "3 days ago",
    description:
      "Isolation valve details missing from basement plumbing layout.",
    comments: [
      {
        author: "You",
        text: "Updated drawing v2 with valve details.",
        time: "2 days ago",
      },
    ],
  },
];

const INIT_LOGS = [
  {
    id: 1,
    date: "07 Apr 2026",
    activity: "Completed duct installation at Level 2 — Grid A to D",
    type: "Mechanical",
    author: "You",
  },
  {
    id: 2,
    date: "06 Apr 2026",
    activity: "Electrical conduit pulling done on 3rd floor east wing",
    type: "Electrical",
    author: "You",
  },
  {
    id: 3,
    date: "05 Apr 2026",
    activity: "Plumbing pressure test passed — Block B basement",
    type: "Plumbing",
    author: "You",
  },
  {
    id: 4,
    date: "04 Apr 2026",
    activity: "Coordinated with structural team on beam clash at Grid C-4",
    type: "Coordination",
    author: "You",
  },
];

const TYPE_COLOR = {
  Mechanical: { bg: "#e6f1fb", color: "#185fa5" },
  Electrical: { bg: "#faeeda", color: "#854f0b" },
  Plumbing: { bg: "#eaf3de", color: "#3b6d11" },
  Coordination: { bg: "#ede9fe", color: "#6d28d9" },
};

const PRIORITY_CFG = {
  P1: { bg: "#fde8e8", color: "#dc2626", label: "🔴 P1" },
  P2: { bg: "#fef3d0", color: "#a16207", label: "🟡 P2" },
  P3: { bg: "#dcfce7", color: "#166534", label: "🟢 P3" },
};

const STATUS_CFG = {
  Open: { bg: "#f0f4ff", color: "#3b5bdb" },
  "In Progress": { bg: "#fef9c3", color: "#a16207" },
  Resolved: { bg: "#dcfce7", color: "#166534" },
  Closed: { bg: "#f1f5f9", color: "#64748b" },
};

function timeNow() {
  return new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MEPEngineer() {
  const [activeTab, setActiveTab] = useState("drawings");
  const [drawings, setDrawings] = useState(INIT_DRAWINGS);
  const [incidents, setIncidents] = useState(INIT_INCIDENTS);
  const [logs, setLogs] = useState(INIT_LOGS);

  // Drawing upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    type: "Mechanical",
    note: "",
    file: null,
  });
  const [expandedDrw, setExpandedDrw] = useState(null);
  const fileRef = useRef(null);

  // Incident
  const [showIncForm, setShowIncForm] = useState(false);
  const [incForm, setIncForm] = useState({
    title: "",
    description: "",
    priority: "P2",
    assignedTo: "",
  });
  const [selectedInc, setSelectedInc] = useState(null);
  const [incComment, setIncComment] = useState("");

  // Daily log
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ activity: "", type: "Mechanical" });

  // ── Drawing upload handler ─────────────────────────────────────────────────
  const handleUpload = () => {
    if (!uploadForm.name.trim()) return;
    const existing = drawings.find(
      (d) => d.name === uploadForm.name && d.type === uploadForm.type,
    );
    if (existing) {
      const newV = `v${existing.versions.length + 1}`;
      setDrawings(
        drawings.map((d) =>
          d.id === existing.id
            ? {
                ...d,
                version: newV,
                date: timeNow(),
                versions: [
                  {
                    v: newV,
                    date: timeNow(),
                    note: uploadForm.note || "Updated",
                  },
                  ...d.versions,
                ],
              }
            : d,
        ),
      );
    } else {
      const newDrw = {
        id: Date.now(),
        name: uploadForm.name,
        type: uploadForm.type,
        version: "v1",
        uploadedBy: "You",
        date: timeNow(),
        size: "—",
        versions: [
          {
            v: "v1",
            date: timeNow(),
            note: uploadForm.note || "Initial upload",
          },
        ],
      };
      setDrawings([newDrw, ...drawings]);
    }
    setUploadForm({ name: "", type: "Mechanical", note: "", file: null });
    setShowUpload(false);
  };

  // ── Incident handlers ──────────────────────────────────────────────────────
  const handleCreateInc = () => {
    if (!incForm.title.trim()) return;
    const newInc = {
      id: `INC-${String(incidents.length + 17).padStart(3, "0")}`,
      title: incForm.title,
      description: incForm.description,
      priority: incForm.priority,
      status: "Open",
      assignedTo: incForm.assignedTo || "Unassigned",
      createdAt: "Just now",
      comments: [],
    };
    setIncidents([newInc, ...incidents]);
    setIncForm({ title: "", description: "", priority: "P2", assignedTo: "" });
    setShowIncForm(false);
  };

  const addIncComment = (id) => {
    if (!incComment.trim()) return;
    setIncidents(
      incidents.map((inc) =>
        inc.id !== id
          ? inc
          : {
              ...inc,
              comments: [
                ...inc.comments,
                { author: "You", text: incComment, time: "Just now" },
              ],
            },
      ),
    );
    setSelectedInc((prev) =>
      prev
        ? {
            ...prev,
            comments: [
              ...prev.comments,
              { author: "You", text: incComment, time: "Just now" },
            ],
          }
        : prev,
    );
    setIncComment("");
  };

  const advanceIncStatus = (id) => {
    const flow = ["Open", "In Progress", "Resolved", "Closed"];
    setIncidents(
      incidents.map((inc) => {
        if (inc.id !== id) return inc;
        const idx = flow.indexOf(inc.status);
        return idx < flow.length - 1 ? { ...inc, status: flow[idx + 1] } : inc;
      }),
    );
    setSelectedInc((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            status:
              flow[Math.min(flow.indexOf(prev.status) + 1, flow.length - 1)],
          }
        : prev,
    );
  };

  // ── Daily log handler ──────────────────────────────────────────────────────
  const handleAddLog = () => {
    if (!logForm.activity.trim()) return;
    setLogs([
      {
        id: Date.now(),
        date: timeNow(),
        activity: logForm.activity,
        type: logForm.type,
        author: "You",
      },
      ...logs,
    ]);
    setLogForm({ activity: "", type: "Mechanical" });
    setShowLogForm(false);
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "drawings", label: "Drawings", icon: "📐" },
    { id: "coordination", label: "Coordination", icon: "🤝" },
    {
      id: "incidents",
      label: "Incidents",
      icon: "🚨",
      count: incidents.filter((i) => i.status === "Open").length,
    },
    { id: "logs", label: "Daily Log", icon: "📋" },
  ];

  return (
    <div className="mep-page">
      {/* ── Top Header ── */}
      <div className="mep-header">
        <div className="mep-header-left">
          <div className="mep-role-badge">MEP</div>
          <div>
            <h1>MEP Engineer Dashboard</h1>
            <p>Mechanical · Electrical · Plumbing — Greenfield Towers</p>
          </div>
        </div>
        <div className="mep-header-stats">
          <div className="mep-stat">
            <span className="mep-stat-val">{drawings.length}</span>
            <span className="mep-stat-lbl">Drawings</span>
          </div>
          <div className="mep-stat">
            <span className="mep-stat-val">
              {
                incidents.filter((i) =>
                  ["Open", "In Progress"].includes(i.status),
                ).length
              }
            </span>
            <span className="mep-stat-lbl">Open Issues</span>
          </div>
          <div className="mep-stat">
            <span className="mep-stat-val">{logs.length}</span>
            <span className="mep-stat-lbl">Log Entries</span>
          </div>
          <div className="mep-stat">
            <span className="mep-stat-val">
              {TEAM_MEMBERS.filter((t) => t.status === "online").length}
            </span>
            <span className="mep-stat-lbl">Online Now</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mep-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`mep-tab ${activeTab === t.id ? "mep-tab-active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span>{t.icon}</span>
            {t.label}
            {t.count > 0 && <span className="mep-tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1 — DRAWINGS (Document Version Control)
      ══════════════════════════════════════════════════════ */}
      {activeTab === "drawings" && (
        <div className="mep-content">
          <div className="mep-section-header">
            <div>
              <h2>MEP Drawings</h2>
              <p>Upload and manage versioned MEP design documents</p>
            </div>
            <button
              className="mep-primary-btn"
              onClick={() => setShowUpload(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Upload Drawing
            </button>
          </div>

          {/* Upload form */}
          {showUpload && (
            <div className="mep-form-card">
              <div className="mep-form-header">
                <h3>Upload / Update Drawing</h3>
                <button
                  className="mep-close"
                  onClick={() => setShowUpload(false)}
                >
                  ×
                </button>
              </div>
              <div className="mep-form-grid">
                <div className="mep-form-group">
                  <label>File Name *</label>
                  <input
                    className="mep-input"
                    placeholder="e.g. MEP-MECH-GF-001.pdf"
                    value={uploadForm.name}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="mep-form-group">
                  <label>Type</label>
                  <select
                    className="mep-input"
                    value={uploadForm.type}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, type: e.target.value })
                    }
                  >
                    <option>Mechanical</option>
                    <option>Electrical</option>
                    <option>Plumbing</option>
                  </select>
                </div>
                <div className="mep-form-group mep-span2">
                  <label>Version Note</label>
                  <input
                    className="mep-input"
                    placeholder="What changed in this version?"
                    value={uploadForm.note}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, note: e.target.value })
                    }
                  />
                </div>
                <div className="mep-form-group mep-span2">
                  <label>Attach File</label>
                  <div
                    className="mep-file-drop"
                    onClick={() => fileRef.current.click()}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>
                      {uploadForm.file
                        ? uploadForm.file.name
                        : "Click to upload PDF / DWG"}
                    </span>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.dwg,.dxf"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, file: e.target.files[0] })
                    }
                  />
                </div>
              </div>
              <div className="mep-form-actions">
                <button
                  className="mep-cancel-btn"
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </button>
                <button className="mep-primary-btn" onClick={handleUpload}>
                  Upload
                </button>
              </div>
            </div>
          )}

          {/* Drawing list */}
          <div className="mep-drawing-list">
            {drawings.map((drw) => {
              const tc = TYPE_COLOR[drw.type] || TYPE_COLOR.Mechanical;
              const expanded = expandedDrw === drw.id;
              return (
                <div key={drw.id} className="mep-drawing-card">
                  <div
                    className="mep-drawing-row"
                    onClick={() => setExpandedDrw(expanded ? null : drw.id)}
                  >
                    <div className="mep-drawing-icon">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="mep-drawing-info">
                      <span className="mep-drawing-name">{drw.name}</span>
                      <div className="mep-drawing-meta">
                        <span
                          className="mep-type-chip"
                          style={{ background: tc.bg, color: tc.color }}
                        >
                          {drw.type}
                        </span>
                        <span className="mep-version-chip">{drw.version}</span>
                        <span className="mep-meta-txt">
                          by {drw.uploadedBy}
                        </span>
                        <span className="mep-meta-txt">{drw.date}</span>
                        <span className="mep-meta-txt">{drw.size}</span>
                      </div>
                    </div>
                    <div className="mep-drawing-actions">
                      <button className="mep-icon-btn" title="Download">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      <button
                        className="mep-icon-btn mep-expand-btn"
                        style={{ transform: expanded ? "rotate(180deg)" : "" }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Version history */}
                  {expanded && (
                    <div className="mep-version-history">
                      <span className="mep-vh-title">Version History</span>
                      {drw.versions.map((v, i) => (
                        <div
                          key={i}
                          className={`mep-version-row ${i === 0 ? "mep-version-latest" : ""}`}
                        >
                          <span className="mep-v-badge">{v.v}</span>
                          <span className="mep-v-note">{v.note}</span>
                          <span className="mep-v-date">{v.date}</span>
                          {i === 0 && (
                            <span className="mep-latest-tag">Latest</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2 — COORDINATION (Cross-team)
      ══════════════════════════════════════════════════════ */}
      {activeTab === "coordination" && (
        <div className="mep-content">
          <div className="mep-section-header">
            <div>
              <h2>Cross-Team Coordination</h2>
              <p>Coordinate with Architect, Structural and Design teams</p>
            </div>
          </div>

          <div className="mep-coord-grid">
            {/* Team members */}
            <div className="mep-card">
              <h3 className="mep-card-title">Team Members</h3>
              <div className="mep-team-list">
                {TEAM_MEMBERS.map((m) => (
                  <div key={m.id} className="mep-team-row">
                    <div className="mep-team-avatar">
                      {m.avatar}
                      <span className={`mep-status-dot mep-dot-${m.status}`} />
                    </div>
                    <div className="mep-team-info">
                      <span className="mep-team-name">{m.name}</span>
                      <span className="mep-team-role">{m.role}</span>
                    </div>
                    <span className={`mep-online-badge mep-ob-${m.status}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Responsibilities */}
            <div className="mep-card">
              <h3 className="mep-card-title">My Responsibilities</h3>
              <div className="mep-resp-list">
                {[
                  {
                    icon: "📐",
                    text: "Coordinate with Architect, Structural & Design teams",
                  },
                  {
                    icon: "📁",
                    text: "Upload MEP drawings with version control",
                  },
                  {
                    icon: "✅",
                    text: "Ensure MEP designs are compatible with structural layouts",
                  },
                  {
                    icon: "🚨",
                    text: "Raise and respond to cross-team coordination incidents",
                  },
                  {
                    icon: "📋",
                    text: "Post daily progress on MEP installation activities",
                  },
                ].map((r, i) => (
                  <div key={i} className="mep-resp-row">
                    <span className="mep-resp-icon">{r.icon}</span>
                    <span className="mep-resp-text">{r.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compatibility checklist */}
            <div className="mep-card mep-span2">
              <h3 className="mep-card-title">Design Compatibility Checklist</h3>
              <div className="mep-check-grid">
                {[
                  {
                    label: "Mechanical ducts vs structural beams",
                    status: "issue",
                  },
                  {
                    label: "Electrical conduit routing — all floors",
                    status: "ok",
                  },
                  {
                    label: "Plumbing risers vs column positions",
                    status: "ok",
                  },
                  {
                    label: "MEP shaft openings vs architectural plan",
                    status: "ok",
                  },
                  {
                    label: "Fire suppression vs ceiling height",
                    status: "review",
                  },
                  {
                    label: "Cable tray routing — Level 3 east wing",
                    status: "review",
                  },
                ].map((c, i) => (
                  <div key={i} className="mep-check-row">
                    <span className={`mep-check-icon mep-ci-${c.status}`}>
                      {c.status === "ok"
                        ? "✔"
                        : c.status === "issue"
                          ? "✕"
                          : "⟳"}
                    </span>
                    <span className="mep-check-label">{c.label}</span>
                    <span className={`mep-check-badge mep-cb-${c.status}`}>
                      {c.status === "ok"
                        ? "Compatible"
                        : c.status === "issue"
                          ? "Clash"
                          : "Review"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3 — INCIDENTS (Incident Queue)
      ══════════════════════════════════════════════════════ */}
      {activeTab === "incidents" && (
        <div className="mep-content">
          <div className="mep-section-header">
            <div>
              <h2>Incident Queue</h2>
              <p>Raise and track MEP coordination incidents</p>
            </div>
            <button
              className="mep-primary-btn"
              onClick={() => setShowIncForm(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Raise Incident
            </button>
          </div>

          {/* Create incident form */}
          {showIncForm && (
            <div className="mep-form-card">
              <div className="mep-form-header">
                <h3>Raise New Incident</h3>
                <button
                  className="mep-close"
                  onClick={() => setShowIncForm(false)}
                >
                  ×
                </button>
              </div>
              <div className="mep-form-grid">
                <div className="mep-form-group mep-span2">
                  <label>Title *</label>
                  <input
                    className="mep-input"
                    placeholder="Brief description of the issue..."
                    value={incForm.title}
                    onChange={(e) =>
                      setIncForm({ ...incForm, title: e.target.value })
                    }
                  />
                </div>
                <div className="mep-form-group mep-span2">
                  <label>Description</label>
                  <textarea
                    className="mep-input mep-textarea"
                    rows={3}
                    placeholder="Detailed explanation..."
                    value={incForm.description}
                    onChange={(e) =>
                      setIncForm({ ...incForm, description: e.target.value })
                    }
                  />
                </div>
                <div className="mep-form-group">
                  <label>Priority</label>
                  <select
                    className="mep-input"
                    value={incForm.priority}
                    onChange={(e) =>
                      setIncForm({ ...incForm, priority: e.target.value })
                    }
                  >
                    <option value="P1">🔴 P1 — Urgent</option>
                    <option value="P2">🟡 P2 — Medium</option>
                    <option value="P3">🟢 P3 — Low</option>
                  </select>
                </div>
                <div className="mep-form-group">
                  <label>Assign To</label>
                  <select
                    className="mep-input"
                    value={incForm.assignedTo}
                    onChange={(e) =>
                      setIncForm({ ...incForm, assignedTo: e.target.value })
                    }
                  >
                    <option value="">Select team member</option>
                    {TEAM_MEMBERS.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} — {m.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mep-form-actions">
                <button
                  className="mep-cancel-btn"
                  onClick={() => setShowIncForm(false)}
                >
                  Cancel
                </button>
                <button className="mep-primary-btn" onClick={handleCreateInc}>
                  Raise Incident
                </button>
              </div>
            </div>
          )}

          <div className="mep-inc-layout">
            {/* Incident list */}
            <div className="mep-inc-list">
              {incidents.map((inc) => {
                const pc = PRIORITY_CFG[inc.priority];
                const sc = STATUS_CFG[inc.status] || STATUS_CFG["Open"];
                const active = selectedInc?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    className={`mep-inc-card ${active ? "mep-inc-active" : ""}`}
                    onClick={() => setSelectedInc(active ? null : inc)}
                  >
                    <div className="mep-inc-top">
                      <span className="mep-inc-id">{inc.id}</span>
                      <span
                        className="mep-p-badge"
                        style={{ background: pc.bg, color: pc.color }}
                      >
                        {pc.label}
                      </span>
                      <span
                        className="mep-s-badge"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {inc.status}
                      </span>
                    </div>
                    <p className="mep-inc-title">{inc.title}</p>
                    <div className="mep-inc-foot">
                      <span>👤 {inc.assignedTo}</span>
                      <span>{inc.createdAt}</span>
                      <span>💬 {inc.comments.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Incident detail */}
            {selectedInc ? (
              <div className="mep-inc-detail">
                <div className="mep-inc-detail-header">
                  <span className="mep-inc-id">{selectedInc.id}</span>
                  <button
                    className="mep-close"
                    onClick={() => setSelectedInc(null)}
                  >
                    ×
                  </button>
                </div>
                <h3 className="mep-inc-detail-title">{selectedInc.title}</h3>
                <div className="mep-inc-detail-meta">
                  <span
                    className="mep-p-badge"
                    style={{
                      background: PRIORITY_CFG[selectedInc.priority].bg,
                      color: PRIORITY_CFG[selectedInc.priority].color,
                    }}
                  >
                    {PRIORITY_CFG[selectedInc.priority].label}
                  </span>
                  <span
                    className="mep-s-badge"
                    style={{
                      background: STATUS_CFG[selectedInc.status]?.bg,
                      color: STATUS_CFG[selectedInc.status]?.color,
                    }}
                  >
                    {selectedInc.status}
                  </span>
                  <span className="mep-meta-txt">
                    👤 {selectedInc.assignedTo}
                  </span>
                </div>
                <p className="mep-inc-desc">{selectedInc.description}</p>
                {selectedInc.status !== "Closed" && (
                  <button
                    className="mep-advance-btn"
                    onClick={() => advanceIncStatus(selectedInc.id)}
                  >
                    Move to:{" "}
                    {
                      ["Open", "In Progress", "Resolved", "Closed"][
                        ["Open", "In Progress", "Resolved", "Closed"].indexOf(
                          selectedInc.status,
                        ) + 1
                      ]
                    }
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )}
                <div className="mep-comments">
                  <span className="mep-comments-title">
                    Comments ({selectedInc.comments.length})
                  </span>
                  {selectedInc.comments.length === 0 && (
                    <p className="mep-no-comments">No comments yet.</p>
                  )}
                  {selectedInc.comments.map((c, i) => (
                    <div key={i} className="mep-comment">
                      <div className="mep-comment-avatar">
                        {c.author.charAt(0)}
                      </div>
                      <div className="mep-comment-body">
                        <div className="mep-comment-top">
                          <span className="mep-comment-author">{c.author}</span>
                          <span className="mep-meta-txt">{c.time}</span>
                        </div>
                        <p className="mep-comment-text">{c.text}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mep-comment-input-row">
                    <input
                      className="mep-input mep-comment-input"
                      placeholder="Add a comment..."
                      value={incComment}
                      onChange={(e) => setIncComment(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && addIncComment(selectedInc.id)
                      }
                    />
                    <button
                      className="mep-send-btn"
                      onClick={() => addIncComment(selectedInc.id)}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mep-inc-detail mep-inc-empty">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p>Select an incident to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 4 — DAILY LOG
      ══════════════════════════════════════════════════════ */}
      {activeTab === "logs" && (
        <div className="mep-content">
          <div className="mep-section-header">
            <div>
              <h2>Daily Progress Log</h2>
              <p>Post daily MEP installation activity updates</p>
            </div>
            <button
              className="mep-primary-btn"
              onClick={() => setShowLogForm(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Log Entry
            </button>
          </div>

          {showLogForm && (
            <div className="mep-form-card">
              <div className="mep-form-header">
                <h3>New Log Entry — {timeNow()}</h3>
                <button
                  className="mep-close"
                  onClick={() => setShowLogForm(false)}
                >
                  ×
                </button>
              </div>
              <div className="mep-form-grid">
                <div className="mep-form-group">
                  <label>Activity Type</label>
                  <select
                    className="mep-input"
                    value={logForm.type}
                    onChange={(e) =>
                      setLogForm({ ...logForm, type: e.target.value })
                    }
                  >
                    <option>Mechanical</option>
                    <option>Electrical</option>
                    <option>Plumbing</option>
                    <option>Coordination</option>
                  </select>
                </div>
                <div className="mep-form-group mep-span2">
                  <label>Activity Description *</label>
                  <textarea
                    className="mep-input mep-textarea"
                    rows={3}
                    placeholder="Describe today's MEP work progress..."
                    value={logForm.activity}
                    onChange={(e) =>
                      setLogForm({ ...logForm, activity: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mep-form-actions">
                <button
                  className="mep-cancel-btn"
                  onClick={() => setShowLogForm(false)}
                >
                  Cancel
                </button>
                <button className="mep-primary-btn" onClick={handleAddLog}>
                  Save Entry
                </button>
              </div>
            </div>
          )}

          <div className="mep-log-list">
            {logs.map((log) => {
              const tc = TYPE_COLOR[log.type] || TYPE_COLOR.Mechanical;
              return (
                <div key={log.id} className="mep-log-card">
                  <div className="mep-log-left">
                    <div
                      className="mep-log-dot"
                      style={{ background: tc.color }}
                    />
                    <div className="mep-log-line" />
                  </div>
                  <div className="mep-log-body">
                    <div className="mep-log-top">
                      <span
                        className="mep-type-chip"
                        style={{ background: tc.bg, color: tc.color }}
                      >
                        {log.type}
                      </span>
                      <span className="mep-log-date">{log.date}</span>
                      <span className="mep-meta-txt">by {log.author}</span>
                    </div>
                    <p className="mep-log-activity">{log.activity}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
