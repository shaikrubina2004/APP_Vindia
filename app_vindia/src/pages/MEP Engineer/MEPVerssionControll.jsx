import { useState } from "react";
import "../../styles/MEPEngineer.css";

/* ═══════════════════════════════════════
   FILE LIST
═══════════════════════════════════════ */
const FILES = [
  {
    key: "hvac3",
    name: "HVAC Level 3",
    sub: "Rev-5 · Today",
    badge: "badge-mep-m",
  },
  {
    key: "plumb",
    name: "Plumbing GF",
    sub: "Rev-3 · Today",
    badge: "badge-mep-p",
  },
  {
    key: "elec",
    name: "Electrical SLD",
    sub: "Rev-5 · Yesterday",
    badge: "badge-mep-e",
  },
  {
    key: "drain",
    name: "Drainage L2",
    sub: "Rev-4 · Yesterday",
    badge: "badge-mep-p",
  },
  {
    key: "hvac1",
    name: "HVAC Level 1",
    sub: "Rev-3 · 2 days ago",
    badge: "badge-mep-m",
  },
  {
    key: "cond",
    name: "Conduit GF",
    sub: "Rev-2 · 3 days ago",
    badge: "badge-mep-e",
  },
  {
    key: "chiller",
    name: "Chiller Plant",
    sub: "Rev-1 · 1 week ago",
    badge: "badge-mep-m",
  },
  {
    key: "fire",
    name: "Fire Fighting",
    sub: "Rev-1 · 2 weeks ago",
    badge: "badge-mep-p",
  },
];

/* ═══════════════════════════════════════
   VERSION DATA  (keyed by file key)
═══════════════════════════════════════ */
const VERSIONS = {
  hvac3: {
    name: "HVAC Level 3",
    disc: "Mechanical",
    discBadge: "badge-mep-m",
    entries: [
      {
        rev: "Rev-5",
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
        rev: "Rev-4",
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
        rev: "Rev-3",
        current: false,
        date: "1 week ago",
        uploader: "MEP Engineer",
        title: "Initial MEP-Structural coordination pass",
        note: "First coordination with Structural team. Some clashes identified and flagged for resolution.",
        adds: [],
        mods: ["Duct routing Zone A", "Zone B supply air"],
        dels: ["Obsolete branch duct"],
      },
      {
        rev: "Rev-2",
        current: false,
        date: "2 weeks ago",
        uploader: "MEP Engineer",
        title: "Fresh air supply incorporated",
        note: "Added fresh air supply points per client walkthrough comments.",
        adds: ["Fresh air supply points"],
        mods: [],
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
    ],
  },
  plumb: {
    name: "Plumbing GF",
    disc: "Plumbing",
    discBadge: "badge-mep-p",
    entries: [
      {
        rev: "Rev-3",
        current: true,
        date: "Today · 08:20 AM",
        uploader: "MEP Engineer (You)",
        title: "Pipe routing updated after beam layout change",
        note: "Structural issued new beam positions. Pipe routes updated to avoid conflicts on Ground Floor.",
        adds: [],
        mods: ["Cold water main rerouted", "HW return loop adjusted"],
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
        title: "Initial issue for coordination",
        note: "First version issued for coordination.",
        adds: ["Initial drawing"],
        mods: [],
        dels: [],
      },
    ],
  },
  elec: {
    name: "Electrical SLD",
    disc: "Electrical",
    discBadge: "badge-mep-e",
    entries: [
      {
        rev: "Rev-5",
        current: true,
        date: "Yesterday · 04:10 PM",
        uploader: "MEP Engineer (You)",
        title: "Load schedule updated — Level 3 additions",
        note: "Additional electrical loads from Level 3 MEP equipment incorporated into single line diagram.",
        adds: ["Level 3 load schedule"],
        mods: ["Main incomer rating updated"],
        dels: [],
      },
      {
        rev: "Rev-4",
        current: false,
        date: "5 days ago",
        uploader: "MEP Engineer",
        title: "Emergency lighting circuit added",
        note: "Emergency lighting circuit added per fire safety consultant review.",
        adds: ["Emergency lighting circuit"],
        mods: [],
        dels: [],
      },
      {
        rev: "Rev-3",
        current: false,
        date: "10 days ago",
        uploader: "MEP Engineer",
        title: "UPS system incorporated",
        note: "UPS system for server room added to single line diagram.",
        adds: ["UPS system"],
        mods: ["Distribution board DB-3 updated"],
        dels: [],
      },
      {
        rev: "Rev-2",
        current: false,
        date: "2 weeks ago",
        uploader: "MEP Engineer",
        title: "HVAC electrical loads added",
        note: "MEP coordination — HVAC electrical loads incorporated.",
        adds: ["HVAC loads"],
        mods: [],
        dels: [],
      },
      {
        rev: "Rev-1",
        current: false,
        date: "3 weeks ago",
        uploader: "MEP Engineer",
        title: "Initial issue for coordination",
        note: "First version issued.",
        adds: ["Initial drawing"],
        mods: [],
        dels: [],
      },
    ],
  },
  drain: {
    name: "Drainage L2",
    disc: "Plumbing",
    discBadge: "badge-mep-p",
    entries: [
      {
        rev: "Rev-4",
        current: true,
        date: "Yesterday · 09:00 AM",
        uploader: "MEP Engineer (You)",
        title: "Drainage gradient corrected — East Wing",
        note: "Pipe gradient in East Wing adjusted to meet minimum fall requirement of 1:80.",
        adds: [],
        mods: [
          "East Wing gradient corrected",
          "Inspection chamber repositioned",
        ],
        dels: [],
      },
      {
        rev: "Rev-3",
        current: false,
        date: "1 week ago",
        uploader: "MEP Engineer",
        title: "Additional floor drain added — Lobby",
        note: "Floor drain added in Lobby area per Architect instruction.",
        adds: ["Lobby floor drain"],
        mods: [],
        dels: [],
      },
      {
        rev: "Rev-2",
        current: false,
        date: "2 weeks ago",
        uploader: "MEP Engineer",
        title: "Drainage connection to main stack",
        note: "Level 2 drainage connected to main stack. Structural penetration approved.",
        adds: ["Stack connection"],
        mods: [],
        dels: [],
      },
      {
        rev: "Rev-1",
        current: false,
        date: "3 weeks ago",
        uploader: "MEP Engineer",
        title: "Initial issue",
        note: "First version issued for coordination.",
        adds: ["Initial drawing"],
        mods: [],
        dels: [],
      },
    ],
  },
  hvac1: {
    name: "HVAC Level 1",
    disc: "Mechanical",
    discBadge: "badge-mep-m",
    entries: [
      {
        rev: "Rev-3",
        current: true,
        date: "2 days ago",
        uploader: "MEP Engineer",
        title: "FCU positions revised per Architect",
        note: "Fan coil unit positions revised to match updated ceiling grid from Architect Rev5.",
        adds: [],
        mods: ["FCU positions updated", "Supply air grille layout revised"],
        dels: [],
      },
      {
        rev: "Rev-2",
        current: false,
        date: "1 week ago",
        uploader: "MEP Engineer",
        title: "Duct insulation specification added",
        note: "Duct insulation thickness and specification added to drawing notes.",
        adds: ["Insulation spec notes"],
        mods: [],
        dels: [],
      },
      {
        rev: "Rev-1",
        current: false,
        date: "2 weeks ago",
        uploader: "MEP Engineer",
        title: "Initial issue for coordination",
        note: "First version issued.",
        adds: ["Initial drawing"],
        mods: [],
        dels: [],
      },
    ],
  },
  cond: {
    name: "Conduit GF",
    disc: "Electrical",
    discBadge: "badge-mep-e",
    entries: [
      {
        rev: "Rev-2",
        current: true,
        date: "3 days ago",
        uploader: "MEP Engineer",
        title: "Conduit route revised — MEP shaft conflict",
        note: "Conduit route revised to avoid MEP shaft restricted zone. Incident #INC-038 resolved.",
        adds: [],
        mods: ["Conduit route revised", "Junction box repositioned"],
        dels: ["Conflicting conduit segment"],
      },
      {
        rev: "Rev-1",
        current: false,
        date: "2 weeks ago",
        uploader: "MEP Engineer",
        title: "Initial issue for coordination",
        note: "First version issued.",
        adds: ["Initial drawing"],
        mods: [],
        dels: [],
      },
    ],
  },
  chiller: {
    name: "Chiller Plant",
    disc: "Mechanical",
    discBadge: "badge-mep-m",
    entries: [
      {
        rev: "Rev-1",
        current: true,
        date: "1 week ago",
        uploader: "MEP Engineer",
        title: "Initial issue for coordination",
        note: "Chiller plant layout issued for Structural and Architect coordination. Equipment weights provided.",
        adds: ["Initial drawing", "Equipment schedule"],
        mods: [],
        dels: [],
      },
    ],
  },
  fire: {
    name: "Fire Fighting",
    disc: "Plumbing",
    discBadge: "badge-mep-p",
    entries: [
      {
        rev: "Rev-1",
        current: true,
        date: "2 weeks ago",
        uploader: "MEP Engineer",
        title: "Initial issue for coordination",
        note: "Fire fighting layout issued for coordination. Sprinkler head positions subject to ceiling grid confirmation from Architect.",
        adds: ["Initial drawing"],
        mods: [],
        dels: [],
      },
    ],
  },
};

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
  const [sel, setSel] = useState("hvac3");
  const [notified, setNotif] = useState(false);
  const [search, setSearch] = useState("");

  const data = VERSIONS[sel] || VERSIONS.hvac3;

  const filteredFiles = FILES.filter((f) =>
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
          <p>
            MEP Drawing Revisions — Ensure team always uses the latest version
          </p>
        </div>
        <a href="/mep/upload" className="btn-primary">
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
          Upload New Version
        </a>
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
            value: FILES.length,
            ic: "ic-blue",
          },
          {
            icon: "✅",
            label: "Up to Date",
            value: FILES.length,
            ic: "ic-green",
          },
          { icon: "🔔", label: "Notified Today", value: "3", ic: "ic-amber" },
          {
            icon: "🗂️",
            label: "Total Revisions",
            value: Object.values(VERSIONS).reduce(
              (s, v) => s + v.entries.length,
              0,
            ),
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
              {FILES.length} files
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
              <span style={{ color: "var(--primary-blue)" }}>{data.name}</span>
              <span
                className={`badge ${data.discBadge}`}
                style={{ fontSize: 9, marginLeft: 8 }}
              >
                {data.disc}
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
                {data.entries[0]?.rev}
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
                {data.entries.length}
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
                {data.entries[0]?.date}
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
                {data.entries[0]?.uploader}
              </div>
            </div>
          </div>

          <div className="mep-card-body" style={{ paddingTop: 16 }}>
            <div className="ver-timeline">
              {data.entries.map((v, i) => (
                <div className="ver-entry" key={v.rev}>
                  <div className="ver-spine">
                    <div
                      className={`ver-dot ${v.current ? "current" : "old"}`}
                    />
                    {i < data.entries.length - 1 && (
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
                      <button
                        className={v.current ? "btn-primary" : "btn-outline"}
                        style={{ fontSize: 11, padding: "6px 12px" }}
                      >
                        📥 {v.current ? "Download Current" : "Download"}
                      </button>
                      <button
                        className="btn-outline"
                        style={{ fontSize: 11, padding: "6px 12px" }}
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
          🔔 Team notified of latest version — {data.name}{" "}
          {data.entries[0]?.rev}
        </div>
      )}
    </div>
  );
}
