import { useState, useRef, useEffect } from "react";
import { useProject } from "../../context/ProjectContext";
import ProjectSwitcher from "../../components/project/ProjectSwitcher";
import "../../styles/MEPEngineer.css";

/* ═══════════════════════════════════════
   DRAWINGS DATA
═══════════════════════════════════════ */
const DRAWINGS = {
  p1: [
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
  ],
  p2: [
    {
      id: 1,
      name: "HVAC Layout — Ground Floor",
      disc: "M",
      discLabel: "Mechanical",
      discBadge: "badge-mep-m",
      floor: "Ground Floor",
      date: "3 days ago",
      size: "1.9 MB",
      rev: "Rev-2",
      latest: true,
      flag: false,
    },
    {
      id: 2,
      name: "Electrical SLD",
      disc: "E",
      discLabel: "Electrical",
      discBadge: "badge-mep-e",
      floor: "All Floors",
      date: "5 days ago",
      size: "1.2 MB",
      rev: "Rev-1",
      latest: true,
      flag: false,
    },
    {
      id: 3,
      name: "Plumbing — Ground Floor",
      disc: "P",
      discLabel: "Plumbing",
      discBadge: "badge-mep-p",
      floor: "Ground Floor",
      date: "4 days ago",
      size: "1.5 MB",
      rev: "Rev-2",
      latest: true,
      flag: true,
    },
    {
      id: 4,
      name: "Conduit Routing — GF",
      disc: "E",
      discLabel: "Electrical",
      discBadge: "badge-mep-e",
      floor: "Ground Floor",
      date: "1 week ago",
      size: "1.0 MB",
      rev: "Rev-1",
      latest: true,
      flag: false,
    },
  ],
  p3: [
    {
      id: 1,
      name: "HVAC Schematic",
      disc: "M",
      discLabel: "Mechanical",
      discBadge: "badge-mep-m",
      floor: "Ground Floor",
      date: "1 week ago",
      size: "1.1 MB",
      rev: "Rev-1",
      latest: true,
      flag: false,
    },
    {
      id: 2,
      name: "Plumbing Schematic",
      disc: "P",
      discLabel: "Plumbing",
      discBadge: "badge-mep-p",
      floor: "Ground Floor",
      date: "1 week ago",
      size: "0.9 MB",
      rev: "Rev-1",
      latest: true,
      flag: false,
    },
  ],
};

/* ═══════════════════════════════════════
   VERSION DATA  (keyed by drawing id)
   In production this comes from your API
═══════════════════════════════════════ */
const VERSION_DATA = {
  1: [
    {
      rev: "Rev-4",
      current: true,
      date: "Today · 10:32 AM",
      uploader: "MEP Engineer (You)",
      title: "Duct sizing corrected after structural review",
      note: "Revised duct dimensions in Zone C to avoid structural clash. All team members notified. Previous version archived.",
      adds: ["Zone C duct resize"],
      mods: ["AHU position adjusted"],
      dels: [],
    },
    {
      rev: "Rev-3",
      current: false,
      date: "3 days ago",
      uploader: "MEP Engineer",
      title: "Added exhaust ventilation for stairwell",
      note: "New exhaust vent added as per Architect requirement. Coordinated with Structural for slab penetration.",
      adds: ["Stairwell exhaust"],
      mods: ["Riser routing updated"],
      dels: [],
    },
    {
      rev: "Rev-2",
      current: false,
      date: "1 week ago",
      uploader: "MEP Engineer",
      title: "Client comment — fresh air supply points added",
      note: "Added fresh air supply points per client walkthrough comments.",
      adds: ["Fresh air supply points"],
      mods: [],
      dels: [],
    },
    {
      rev: "Rev-1",
      current: false,
      date: "2 weeks ago",
      uploader: "MEP Engineer",
      title: "Initial issue for coordination",
      note: "First version issued for inter-discipline coordination review.",
      adds: ["Initial drawing"],
      mods: [],
      dels: [],
    },
  ],
  3: [
    {
      rev: "Rev-2",
      current: false,
      date: "5 days ago",
      uploader: "MEP Engineer",
      title: "Clash flagged — coordination pending",
      note: "Structural beam conflict identified in Zone B. Drawing flagged pending resolution with Structural team.",
      adds: [],
      mods: ["Zone B routing adjusted"],
      dels: [],
    },
    {
      rev: "Rev-1",
      current: false,
      date: "2 weeks ago",
      uploader: "MEP Engineer",
      title: "Initial issue for coordination",
      note: "First version issued for coordination.",
      adds: ["Initial drawing"],
      mods: [],
      dels: [],
    },
  ],
  8: [
    {
      rev: "Rev-3",
      current: true,
      date: "Today · 08:20 AM",
      uploader: "MEP Engineer (You)",
      title: "Pipe routing updated after beam layout change",
      note: "Structural issued new beam positions. Pipe routes updated to avoid conflicts on Ground Floor.",
      adds: [],
      mods: ["Cold water main rerouted", "HW return loop"],
      dels: [],
    },
    {
      rev: "Rev-2",
      current: false,
      date: "4 days ago",
      uploader: "MEP Engineer",
      title: "Toilet block added — Type B unit",
      note: "New toilet block added as per Architect layout Rev4.",
      adds: ["Type B toilet block"],
      mods: [],
      dels: [],
    },
    {
      rev: "Rev-1",
      current: false,
      date: "2 weeks ago",
      uploader: "MEP Engineer",
      title: "Initial issue",
      note: "First version for coordination.",
      adds: ["Initial drawing"],
      mods: [],
      dels: [],
    },
  ],
};

/* fallback versions for drawings without specific data */
function getDefaultVersions(drawing) {
  return [
    {
      rev: drawing.rev,
      current: true,
      date: drawing.date,
      uploader: "MEP Engineer (You)",
      title: `Latest revision — ${drawing.name}`,
      note: "Updated after coordination review with Architect and Structural team.",
      adds: [],
      mods: ["Routing updated per latest coordination"],
      dels: [],
    },
    {
      rev: "Rev-2",
      current: false,
      date: "1 week ago",
      uploader: "MEP Engineer",
      title: "Intermediate revision",
      note: "Changes incorporated after site inspection.",
      adds: [],
      mods: ["Minor adjustments"],
      dels: [],
    },
    {
      rev: "Rev-1",
      current: false,
      date: "3 weeks ago",
      uploader: "MEP Engineer",
      title: "Initial issue for coordination",
      note: "First version issued for inter-discipline coordination review.",
      adds: ["Initial drawing"],
      mods: [],
      dels: [],
    },
  ];
}

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
  const versions = VERSION_DATA[drawing.id] || getDefaultVersions(drawing);

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
                    <button
                      className={v.current ? "btn-primary" : "btn-outline"}
                      style={{ padding: "5px 12px", fontSize: 11 }}
                    >
                      📥 {v.current ? "Download Current" : "Download"}
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: "5px 12px", fontSize: 11 }}
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
            href="/mep/upload"
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
  if (!activeProject) return null; // ← add this line

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const drawings = DRAWINGS[activeProject.id] || [];
  const [versionsFor, setVersionsFor] = useState(null); /* drawing obj | null */

  const visible = drawings.filter((d) => {
    const mDisc = filter === "all" || d.disc === filter;
    const mSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.floor.toLowerCase().includes(search.toLowerCase());
    return mDisc && mSearch;
  });

  const counts = {
    all: drawings.length,
    M: drawings.filter((d) => d.disc === "M").length,
    E: drawings.filter((d) => d.disc === "E").length,
    P: drawings.filter((d) => d.disc === "P").length,
  };

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
            value: drawings.filter((d) => d.latest).length,
            ic: "ic-green",
          },
          {
            icon: "🕐",
            label: "Outdated",
            value: drawings.filter((d) => !d.latest).length,
            ic: "ic-amber",
          },
          {
            icon: "🚩",
            label: "Clash Flagged",
            value: drawings.filter((d) => d.flag).length,
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
      <div className="records-list">
        {visible.length === 0 && (
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
              >
                👁 View
              </button>
              <button
                className="btn-outline"
                style={{ padding: "6px 12px", fontSize: 11 }}
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
