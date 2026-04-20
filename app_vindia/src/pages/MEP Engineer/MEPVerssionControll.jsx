import { useState } from "react";
import "../../styles/MEPEngineer.css";

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
];

const VERSIONS = {
  hvac3: {
    name: "HVAC Level 3",
    entries: [
      {
        rev: "Rev-5",
        current: true,
        date: "Today · 10:32 AM",
        title: "Duct sizing corrected after structural review",
        note: "Revised duct dimensions in Zone C to avoid structural clash. All team members notified.",
        adds: ["Zone C duct resize"],
        mods: ["AHU position adjusted"],
        dels: [],
        uploader: "MEP Engineer (You)",
      },
      {
        rev: "Rev-4",
        current: false,
        date: "3 days ago",
        title: "Added exhaust ventilation for stairwell",
        note: "New exhaust vent added as per Architect requirement. Coordinated with Structural.",
        adds: ["Stairwell exhaust"],
        mods: ["Riser routing updated"],
        dels: [],
        uploader: "MEP Engineer",
      },
      {
        rev: "Rev-3",
        current: false,
        date: "1 week ago",
        title: "Initial MEP-Structural coordination pass",
        note: "First coordination with Structural team. Some clashes identified and flagged.",
        adds: [],
        mods: ["Duct routing Zone A", "Zone B supply air"],
        dels: ["Obsolete branch duct"],
        uploader: "MEP Engineer",
      },
      {
        rev: "Rev-2",
        current: false,
        date: "2 weeks ago",
        title: "Fresh air supply incorporated",
        note: "Added fresh air supply points per client walkthrough comments.",
        adds: ["Fresh air supply points"],
        mods: [],
        dels: [],
        uploader: "MEP Engineer",
      },
      {
        rev: "Rev-1",
        current: false,
        date: "3 weeks ago",
        title: "Initial issue for coordination",
        note: "First version issued for inter-discipline coordination review.",
        adds: ["Initial drawing"],
        mods: [],
        dels: [],
        uploader: "MEP Engineer",
      },
    ],
  },
  plumb: {
    name: "Plumbing GF",
    entries: [
      {
        rev: "Rev-3",
        current: true,
        date: "Today · 08:20 AM",
        title: "Pipe routing updated after beam change",
        note: "Structural issued new beam positions. Pipe routes updated to avoid conflicts.",
        adds: [],
        mods: ["Cold water main rerouted", "HW return loop adjusted"],
        dels: [],
        uploader: "MEP Engineer (You)",
      },
      {
        rev: "Rev-2",
        current: false,
        date: "4 days ago",
        title: "Toilet block added — Type B unit",
        note: "New toilet block added as per Architect layout Rev4.",
        adds: ["Type B toilet block"],
        mods: [],
        dels: [],
        uploader: "MEP Engineer",
      },
      {
        rev: "Rev-1",
        current: false,
        date: "2 weeks ago",
        title: "Initial issue",
        note: "First version for coordination.",
        adds: ["Initial drawing"],
        mods: [],
        dels: [],
        uploader: "MEP Engineer",
      },
    ],
  },
};

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

export default function MEPVersionControl() {
  const [sel, setSel] = useState("hvac3");
  const [notified, setNotif] = useState(false);

  const data = VERSIONS[sel] || VERSIONS.hvac3;

  const notify = () => {
    setNotif(true);
    setTimeout(() => setNotif(false), 2500);
  };

  return (
    <div className="mep-page">
      {/* ── Header ── */}
      <div className="mep-header">
        <div>
          <h1>Version Control</h1>
          <p>MEP Drawing Revisions — Team always uses latest version</p>
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

      {/* ── New version alert ── */}
      <div className="alert alert-blue">
        <span className="alert-icon">📢</span>
        <span>
          <strong>New version uploaded:</strong> HVAC Level 3 — Rev-5 was
          uploaded today. All team members have been notified.
        </span>
      </div>

      {/* ── Two panel layout ── */}
      <div className="grid-sidebar" style={{ alignItems: "start" }}>
        {/* File List panel */}
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
          <div className="mep-card-body" style={{ padding: 10 }}>
            <div className="file-list">
              {FILES.map((f) => {
                const badgeLabel = f.badge.includes("-m")
                  ? "Mech"
                  : f.badge.includes("-e")
                    ? "Elec"
                    : "Plumb";
                return (
                  <div
                    key={f.key}
                    className={`file-item${sel === f.key ? " selected" : ""}`}
                    onClick={() => setSel(f.key)}
                  >
                    <span className="file-item-icon">📄</span>
                    <div style={{ flex: 1 }}>
                      <div className="file-item-name">{f.name}</div>
                      <div className="file-item-sub">{f.sub}</div>
                    </div>
                    <span
                      className={`badge ${f.badge} file-item-badge`}
                      style={{ fontSize: 9 }}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Version Timeline */}
        <div className="mep-card">
          <div className="mep-card-head">
            <span className="card-title">
              🗂️ Version History —{" "}
              <span style={{ color: "var(--primary-blue)" }}>{data.name}</span>
            </span>
            <button
              className="btn-outline"
              style={{ fontSize: 11, padding: "6px 12px" }}
              onClick={notify}
            >
              🔔 Notify Team
            </button>
          </div>
          <div className="mep-card-body">
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
                          🔔 Notify
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

      {notified && (
        <div className="toast">🔔 Team notified of latest version!</div>
      )}
    </div>
  );
}
