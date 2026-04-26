import { useState, useEffect, useRef } from "react";
import "../../styles/DrawingRegister.css";

/* ═══════════════════════════════════════
   ROLE CONFIG
   In production replace currentRole with
   value from your auth context
   e.g. const { role } = useAuth()
═══════════════════════════════════════ */
const ROLE_META = {
  mep: { label: "MEP Engineer", icon: "🔧", cls: "dr-role-mep" },
  arch: { label: "Architect", icon: "🏛️", cls: "dr-role-arch" },
  str: { label: "Structural Engineer", icon: "🏗️", cls: "dr-role-str" },
};

/* ═══════════════════════════════════════
   MEP DRAWINGS
═══════════════════════════════════════ */
const MEP_DRAWINGS = [
  {
    id: "M-001",
    name: "HVAC Layout — Ground Floor",
    disc: "MEP",
    subDisc: "Mechanical",
    floor: "Ground Floor",
    type: "Layout",
    number: "MEP-HVAC-GF-001",
    rev: "Rev-4",
    latest: true,
    status: "Issued for Construction",
    date: "2026-04-25",
    uploadedBy: "MEP Engineer",
    size: "2.4 MB",
    flag: false,
  },
  {
    id: "M-002",
    name: "HVAC Layout — Level 1",
    disc: "MEP",
    subDisc: "Mechanical",
    floor: "Level 1",
    type: "Layout",
    number: "MEP-HVAC-L1-001",
    rev: "Rev-3",
    latest: true,
    status: "Issued for Coordination",
    date: "2026-04-23",
    uploadedBy: "MEP Engineer",
    size: "2.1 MB",
    flag: false,
  },
  {
    id: "M-003",
    name: "HVAC Layout — Level 2",
    disc: "MEP",
    subDisc: "Mechanical",
    floor: "Level 2",
    type: "Layout",
    number: "MEP-HVAC-L2-001",
    rev: "Rev-2",
    latest: false,
    status: "For Review",
    date: "2026-04-20",
    uploadedBy: "MEP Engineer",
    size: "1.9 MB",
    flag: true,
  },
  {
    id: "M-004",
    name: "Electrical Single Line",
    disc: "MEP",
    subDisc: "Electrical",
    floor: "All Floors",
    type: "Single Line",
    number: "MEP-EL-SLD-001",
    rev: "Rev-5",
    latest: true,
    status: "Approved",
    date: "2026-04-24",
    uploadedBy: "MEP Engineer",
    size: "1.6 MB",
    flag: false,
  },
  {
    id: "M-005",
    name: "Conduit Routing — GF",
    disc: "MEP",
    subDisc: "Electrical",
    floor: "Ground Floor",
    type: "Routing",
    number: "MEP-EL-CR-GF-001",
    rev: "Rev-2",
    latest: true,
    status: "Issued for Coordination",
    date: "2026-04-22",
    uploadedBy: "MEP Engineer",
    size: "1.2 MB",
    flag: true,
  },
  {
    id: "M-006",
    name: "Plumbing — Ground Floor",
    disc: "MEP",
    subDisc: "Plumbing",
    floor: "Ground Floor",
    type: "Layout",
    number: "MEP-PL-GF-001",
    rev: "Rev-3",
    latest: true,
    status: "Issued for Construction",
    date: "2026-04-25",
    uploadedBy: "MEP Engineer",
    size: "1.8 MB",
    flag: false,
  },
  {
    id: "M-007",
    name: "Drainage — Level 2",
    disc: "MEP",
    subDisc: "Plumbing",
    floor: "Level 2",
    type: "Drainage",
    number: "MEP-DR-L2-001",
    rev: "Rev-4",
    latest: true,
    status: "Approved",
    date: "2026-04-24",
    uploadedBy: "MEP Engineer",
    size: "2.0 MB",
    flag: false,
  },
  {
    id: "M-008",
    name: "HVAC Level 3 — Revised",
    disc: "MEP",
    subDisc: "Mechanical",
    floor: "Level 3",
    type: "Layout",
    number: "MEP-HVAC-L3-001",
    rev: "Rev-5",
    latest: true,
    status: "Issued for Coordination",
    date: "2026-04-25",
    uploadedBy: "MEP Engineer",
    size: "2.3 MB",
    flag: true,
  },
];

/* ═══════════════════════════════════════
   ARCHITECT DRAWINGS
═══════════════════════════════════════ */
const ARCH_DRAWINGS = [
  {
    id: "A-001",
    name: "Floor Plan — Ground Floor",
    disc: "ARCH",
    subDisc: "Architectural",
    floor: "Ground Floor",
    type: "Floor Plan",
    number: "A-GF-001",
    rev: "R2",
    latest: true,
    status: "Approved",
    date: "2026-04-20",
    uploadedBy: "Architect Team",
    size: "3.2 MB",
    flag: false,
  },
  {
    id: "A-002",
    name: "Floor Plan — Level 1",
    disc: "ARCH",
    subDisc: "Architectural",
    floor: "Level 1",
    type: "Floor Plan",
    number: "A-L1-001",
    rev: "R3",
    latest: true,
    status: "Approved",
    date: "2026-04-21",
    uploadedBy: "Architect Team",
    size: "3.0 MB",
    flag: false,
  },
  {
    id: "A-003",
    name: "Floor Plan — Level 2",
    disc: "ARCH",
    subDisc: "Architectural",
    floor: "Level 2",
    type: "Floor Plan",
    number: "A-L2-001",
    rev: "R2",
    latest: true,
    status: "Issued for Coordination",
    date: "2026-04-19",
    uploadedBy: "Architect Team",
    size: "2.8 MB",
    flag: false,
  },
  {
    id: "A-004",
    name: "Reflected Ceiling Plan — GF",
    disc: "ARCH",
    subDisc: "Architectural",
    floor: "Ground Floor",
    type: "Ceiling Plan",
    number: "A-RCP-GF-001",
    rev: "R1",
    latest: true,
    status: "For Review",
    date: "2026-04-18",
    uploadedBy: "Architect Team",
    size: "2.5 MB",
    flag: false,
  },
  {
    id: "A-005",
    name: "Elevation — North Face",
    disc: "ARCH",
    subDisc: "Architectural",
    floor: "All Floors",
    type: "Elevation",
    number: "A-EL-N-001",
    rev: "R2",
    latest: true,
    status: "Approved",
    date: "2026-04-17",
    uploadedBy: "Architect Team",
    size: "1.9 MB",
    flag: false,
  },
  {
    id: "A-006",
    name: "Section — AA",
    disc: "ARCH",
    subDisc: "Architectural",
    floor: "All Floors",
    type: "Section",
    number: "A-SEC-AA-001",
    rev: "R1",
    latest: false,
    status: "For Review",
    date: "2026-04-15",
    uploadedBy: "Architect Team",
    size: "1.6 MB",
    flag: false,
  },
];

/* ═══════════════════════════════════════
   STRUCTURAL DRAWINGS
═══════════════════════════════════════ */
const STR_DRAWINGS = [
  {
    id: "S-001",
    name: "Column Layout — Ground Floor",
    disc: "STR",
    subDisc: "Structural",
    floor: "Ground Floor",
    type: "Column Layout",
    number: "S-CL-001",
    rev: "R1",
    latest: true,
    status: "Approved",
    date: "2026-04-19",
    uploadedBy: "Structural Team",
    size: "2.8 MB",
    flag: false,
  },
  {
    id: "S-002",
    name: "Beam Layout — Level 1",
    disc: "STR",
    subDisc: "Structural",
    floor: "Level 1",
    type: "Beam Layout",
    number: "S-BL-L1-001",
    rev: "R2",
    latest: true,
    status: "Approved",
    date: "2026-04-20",
    uploadedBy: "Structural Team",
    size: "2.6 MB",
    flag: false,
  },
  {
    id: "S-003",
    name: "Beam Layout — Level 3",
    disc: "STR",
    subDisc: "Structural",
    floor: "Level 3",
    type: "Beam Layout",
    number: "S-BL-L3-001",
    rev: "R3",
    latest: true,
    status: "Issued for Coordination",
    date: "2026-04-22",
    uploadedBy: "Structural Team",
    size: "2.4 MB",
    flag: true,
  },
  {
    id: "S-004",
    name: "Foundation Layout",
    disc: "STR",
    subDisc: "Structural",
    floor: "Basement",
    type: "Foundation",
    number: "S-FL-001",
    rev: "R1",
    latest: true,
    status: "Approved",
    date: "2026-04-15",
    uploadedBy: "Structural Team",
    size: "3.1 MB",
    flag: false,
  },
  {
    id: "S-005",
    name: "Slab Details — Level 2",
    disc: "STR",
    subDisc: "Structural",
    floor: "Level 2",
    type: "Slab Detail",
    number: "S-SD-L2-001",
    rev: "R2",
    latest: true,
    status: "Approved",
    date: "2026-04-18",
    uploadedBy: "Structural Team",
    size: "1.8 MB",
    flag: false,
  },
  {
    id: "S-006",
    name: "Retaining Wall Details",
    disc: "STR",
    subDisc: "Structural",
    floor: "Basement",
    type: "Wall Detail",
    number: "S-RW-001",
    rev: "R1",
    latest: false,
    status: "For Review",
    date: "2026-04-14",
    uploadedBy: "Structural Team",
    size: "1.5 MB",
    flag: false,
  },
];

const ALL_DRAWINGS = [...MEP_DRAWINGS, ...ARCH_DRAWINGS, ...STR_DRAWINGS];

/* ═══════════════════════════════════════
   VERSION DATA (keyed by drawing id)
═══════════════════════════════════════ */
const VERSION_DATA = {
  "M-001": [
    {
      rev: "Rev-4",
      current: true,
      date: "2026-04-25",
      uploader: "MEP Engineer",
      title: "Duct sizing corrected after structural review",
      note: "Revised duct dimensions in Zone C to avoid structural clash. All team members notified.",
    },
    {
      rev: "Rev-3",
      current: false,
      date: "2026-04-20",
      uploader: "MEP Engineer",
      title: "Added exhaust ventilation for stairwell",
      note: "New exhaust vent per Architect requirement. Coordinated with Structural.",
    },
    {
      rev: "Rev-2",
      current: false,
      date: "2026-04-14",
      uploader: "MEP Engineer",
      title: "Fresh air supply points added",
      note: "Added fresh air supply points per client walkthrough comments.",
    },
    {
      rev: "Rev-1",
      current: false,
      date: "2026-04-07",
      uploader: "MEP Engineer",
      title: "Initial issue for coordination",
      note: "First version issued for inter-discipline coordination review.",
    },
  ],
  "A-001": [
    {
      rev: "R2",
      current: true,
      date: "2026-04-20",
      uploader: "Architect Team",
      title: "Toilet block repositioned — Level 2",
      note: "Toilet block moved 1.5m north as per client brief update. MEP team notified for plumbing review.",
    },
    {
      rev: "R1",
      current: false,
      date: "2026-04-10",
      uploader: "Architect Team",
      title: "Initial issue for coordination",
      note: "First floor plan issued for all discipline coordination.",
    },
  ],
  "S-003": [
    {
      rev: "R3",
      current: true,
      date: "2026-04-22",
      uploader: "Structural Team",
      title: "Beam B-14 position updated — 200mm east shift",
      note: "Beam B-14 shifted 200mm east. MEP to check HVAC pipe route conflict on Level 3.",
    },
    {
      rev: "R2",
      current: false,
      date: "2026-04-16",
      uploader: "Structural Team",
      title: "Additional beam added — Zone C",
      note: "New secondary beam added in Zone C. MEP coordination required.",
    },
    {
      rev: "R1",
      current: false,
      date: "2026-04-08",
      uploader: "Structural Team",
      title: "Initial issue for coordination",
      note: "First version issued for coordination.",
    },
  ],
};

function getDefaultVersions(drawing) {
  return [
    {
      rev: drawing.rev,
      current: true,
      date: drawing.date,
      uploader: drawing.uploadedBy,
      title: `Latest revision — ${drawing.name}`,
      note: "Updated after coordination review.",
    },
    {
      rev: "R1",
      current: false,
      date: "2026-04-01",
      uploader: drawing.uploadedBy,
      title: "Initial issue for coordination",
      note: "First version issued.",
    },
  ];
}

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const DISC_ICON = { MEP: "🔧", ARCH: "🏛️", STR: "🏗️" };
const DISC_ROW = { MEP: "disc-mep", ARCH: "disc-arch", STR: "disc-str" };
const DISC_AVA = { MEP: "dra-mep", ARCH: "dra-arch", STR: "dra-str" };
const DISC_BADGE = { MEP: "drb-mep", ARCH: "drb-arch", STR: "drb-str" };
const DISC_LABEL = { MEP: "MEP", ARCH: "Arch", STR: "Struct" };

const STATUS_PILL = {
  Approved: "drp-approved",
  "Issued for Construction": "drp-issued",
  "Issued for Coordination": "drp-issued",
  "For Review": "drp-review",
};

/* can this role upload drawings of this discipline */
function canUpload(role, disc) {
  if (role === "mep" && disc === "MEP") return true;
  if (role === "arch" && disc === "ARCH") return true;
  if (role === "str" && disc === "STR") return true;
  return false;
}

/* ═══════════════════════════════════════
   VERSIONS SLIDE-OUT PANEL
═══════════════════════════════════════ */
function VersionsPanel({ drawing, role, onClose }) {
  const versions = VERSION_DATA[drawing.id] || getDefaultVersions(drawing);
  const owned = canUpload(role, drawing.disc);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className="dr-slideout-overlay" onClick={onClose} />
      <div className="dr-slideout-panel">
        {/* head */}
        <div className="dr-slideout-head">
          <div>
            <h3>🗂️ Version History</h3>
            <p>
              <span
                className={`dr-badge ${DISC_BADGE[drawing.disc]}`}
                style={{ marginRight: 6 }}
              >
                {drawing.subDisc}
              </span>
              {drawing.name} · {drawing.floor}
            </p>
          </div>
          <button className="dr-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* body */}
        <div className="dr-slideout-body">
          {/* current version highlight */}
          <div className="dr-ver-highlight">
            <div className="dr-ver-hl-block">
              <span className="dr-ver-hl-label">Current Version</span>
              <span className="dr-ver-hl-val">{drawing.rev}</span>
            </div>
            <div className="dr-ver-hl-block">
              <span className="dr-ver-hl-label">Drawing No.</span>
              <span
                className="dr-ver-hl-val-sm"
                style={{ fontFamily: "Monaco,monospace", fontSize: 11 }}
              >
                {drawing.number}
              </span>
            </div>
            <div className="dr-ver-hl-block">
              <span className="dr-ver-hl-label">Status</span>
              <span
                className={`dr-pill ${STATUS_PILL[drawing.status] || "drp-review"}`}
              >
                {drawing.status}
              </span>
            </div>
            <div className="dr-ver-hl-block" style={{ marginLeft: "auto" }}>
              <span className="dr-ver-hl-label">Uploaded By</span>
              <span className="dr-ver-hl-val-sm">{drawing.uploadedBy}</span>
            </div>
          </div>

          {/* read-only notice for non-owners */}
          {!owned && (
            <div
              className="dr-alert dr-alert-amber"
              style={{ marginBottom: 14 }}
            >
              <span className="dr-alert-icon">🔒</span>
              <span>
                You have <strong>read-only access</strong> to {drawing.subDisc}{" "}
                drawings. Only the {drawing.uploadedBy} can upload new versions.
              </span>
            </div>
          )}

          {/* timeline label */}
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
          <div className="dr-ver-timeline">
            {versions.map((v, i) => (
              <div className="dr-ver-entry" key={v.rev}>
                <div className="dr-ver-spine">
                  <div
                    className={`dr-ver-dot ${v.current ? "current" : "old"}`}
                  />
                  {i < versions.length - 1 && (
                    <div className="dr-ver-connector" />
                  )}
                </div>
                <div className="dr-ver-content">
                  <div className="dr-ver-head">
                    <span className="dr-ver-rev">{v.rev}</span>
                    <span
                      className={`dr-pill ${v.current ? "drp-latest" : "drp-readonly"}`}
                    >
                      {v.current ? "✓ Current" : "Archived"}
                    </span>
                    <span className="dr-ver-date">{v.date}</span>
                  </div>
                  <div className="dr-ver-uploader">👤 {v.uploader}</div>
                  <div className="dr-ver-title">{v.title}</div>
                  <div className="dr-ver-note">{v.note}</div>
                  <div className="dr-ver-actions">
                    <button
                      className={
                        v.current ? "dr-btn-primary" : "dr-btn-outline"
                      }
                      style={{ padding: "5px 12px", fontSize: 11 }}
                    >
                      📥 {v.current ? "Download Current" : "Download"}
                    </button>
                    <button
                      className="dr-btn-outline"
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
        <div className="dr-slideout-foot">
          {owned ? (
            <>
              <a
                href="/mep/upload"
                className="dr-btn-outline"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Open Version Control
              </a>
              <a
                href="/mep/upload"
                className="dr-btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
              >
                ⬆️ Upload New Version
              </a>
            </>
          ) : (
            <button
              className="dr-btn-outline"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function DrawingRegister({ currentRole = "mep" }) {
  /*
    currentRole prop comes from your auth system.
    Pass it like: <DrawingRegister currentRole={user.role} />
    Accepted values: "mep" | "arch" | "str"
  */

  const [discFilter, setDiscFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [versionsFor, setVersionsFor] = useState(null);
  const [toast, setToast] = useState("");

  const roleMeta = ROLE_META[currentRole] || ROLE_META.mep;

  /* ── counts per discipline ── */
  const counts = {
    all: ALL_DRAWINGS.length,
    MEP: MEP_DRAWINGS.length,
    ARCH: ARCH_DRAWINGS.length,
    STR: STR_DRAWINGS.length,
  };

  /* ── unique floors ── */
  const floors = [
    "all",
    ...Array.from(new Set(ALL_DRAWINGS.map((d) => d.floor))).sort(),
  ];

  /* ── filtered list ── */
  const visible = ALL_DRAWINGS.filter((d) => {
    const mDisc = discFilter === "all" || d.disc === discFilter;
    const mStatus = statusFilter === "all" || d.status === statusFilter;
    const mFloor = floorFilter === "all" || d.floor === floorFilter;
    const mSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.number.toLowerCase().includes(search.toLowerCase()) ||
      d.floor.toLowerCase().includes(search.toLowerCase()) ||
      d.subDisc.toLowerCase().includes(search.toLowerCase());
    return mDisc && mStatus && mFloor && mSearch;
  });

  /* ── stat counts ── */
  const latestCount = ALL_DRAWINGS.filter((d) => d.latest).length;
  const outdatedCount = ALL_DRAWINGS.filter((d) => !d.latest).length;
  const flaggedCount = ALL_DRAWINGS.filter((d) => d.flag).length;

  /* ── tab active class ── */
  const tabCls = (key) => {
    if (discFilter !== key) return "dr-disc-tab";
    if (key === "all") return "dr-disc-tab active-all";
    if (key === "MEP") return "dr-disc-tab active-mep";
    if (key === "ARCH") return "dr-disc-tab active-arch";
    if (key === "STR") return "dr-disc-tab active-str";
    return "dr-disc-tab active-all";
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <div className="dr-page">
      {/* ── HEADER ── */}
      <div className="dr-header">
        <div>
          <h1>Drawing Register</h1>
          <p>Central drawing library — All disciplines · All roles</p>
        </div>
        <div className="dr-header-actions">
          {/* current role indicator */}
          <span className={`dr-role-badge ${roleMeta.cls}`}>
            {roleMeta.icon} {roleMeta.label}
          </span>

          <button
            className="dr-btn-outline"
            onClick={() => showToast("📥 Preparing download...")}
          >
            📥 Download All
          </button>

          {/* Upload button — only shown for own discipline */}
          {currentRole === "mep" && (
            <a href="/mep/upload" className="dr-btn-primary">
              ⬆️ Upload MEP Drawing
            </a>
          )}
          {currentRole === "arch" && (
            <a href="/arch/upload" className="dr-btn-primary">
              ⬆️ Upload Arch Drawing
            </a>
          )}
          {currentRole === "str" && (
            <a href="/str/upload" className="dr-btn-primary">
              ⬆️ Upload STR Drawing
            </a>
          )}
        </div>
      </div>

      {/* ── NOTIFICATION BANNER ── */}
      <div className="dr-alert dr-alert-blue">
        <span className="dr-alert-icon">📢</span>
        <span>
          <strong>Latest updates:</strong> Structural uploaded Beam Layout Level
          3 — R3 today. MEP uploaded HVAC Level 3 — Rev-5 today. Check for
          coordination impacts.
        </span>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="dr-stats">
        {[
          {
            icon: "📁",
            label: "Total Drawings",
            value: ALL_DRAWINGS.length,
            ic: "dsi-blue",
          },
          {
            icon: "✅",
            label: "MEP Drawings",
            value: counts.MEP,
            ic: "dsi-blue",
            sub: "Mechanical · Electrical · Plumbing",
          },
          {
            icon: "🏛️",
            label: "Arch Drawings",
            value: counts.ARCH,
            ic: "dsi-purple",
          },
          {
            icon: "🏗️",
            label: "STR Drawings",
            value: counts.STR,
            ic: "dsi-green",
          },
          {
            icon: "🚩",
            label: "Clash Flagged",
            value: flaggedCount,
            ic: "dsi-red",
          },
        ].map((s) => (
          <div className="dr-stat-card" key={s.label}>
            <div className={`dr-stat-icon ${s.ic}`}>{s.icon}</div>
            <div className="dr-stat-info">
              <span className="dr-stat-label">{s.label}</span>
              <span className="dr-stat-value">{s.value}</span>
              {s.sub && (
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                  {s.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── DISCIPLINE TABS ── */}
      <div className="dr-disc-tabs">
        <button className={tabCls("all")} onClick={() => setDiscFilter("all")}>
          📋 All Drawings <span className="dr-tab-count">{counts.all}</span>
        </button>
        <button className={tabCls("MEP")} onClick={() => setDiscFilter("MEP")}>
          🔧 MEP <span className="dr-tab-count">{counts.MEP}</span>
        </button>
        <button
          className={tabCls("ARCH")}
          onClick={() => setDiscFilter("ARCH")}
        >
          🏛️ Architectural <span className="dr-tab-count">{counts.ARCH}</span>
        </button>
        <button className={tabCls("STR")} onClick={() => setDiscFilter("STR")}>
          🏗️ Structural <span className="dr-tab-count">{counts.STR}</span>
        </button>
      </div>

      {/* ── CONTROLS BAR ── */}
      <div className="dr-controls">
        {/* search */}
        <div className="dr-search">
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
            placeholder="Search by name, number, floor or discipline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* floor filter */}
        <select
          className="dr-filter-select"
          value={floorFilter}
          onChange={(e) => setFloorFilter(e.target.value)}
        >
          {floors.map((f) => (
            <option key={f} value={f}>
              {f === "all" ? "All Floors" : f}
            </option>
          ))}
        </select>

        {/* status filter */}
        <select
          className="dr-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="Approved">Approved</option>
          <option value="Issued for Construction">
            Issued for Construction
          </option>
          <option value="Issued for Coordination">
            Issued for Coordination
          </option>
          <option value="For Review">For Review</option>
        </select>

        <div className="dr-spacer" />
        <span className="dr-count">
          {visible.length} drawing{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── DRAWING ROWS ── */}
      <div className="dr-list">
        {visible.length === 0 && (
          <div className="dr-empty">
            <span className="dr-empty-icon">📂</span>
            <p>No drawings match your search or filter.</p>
          </div>
        )}

        {visible.map((d) => {
          const owned = canUpload(currentRole, d.disc);
          const discIcon = DISC_ICON[d.disc];

          return (
            <div key={d.id} className={`dr-row ${DISC_ROW[d.disc]}`}>
              {/* avatar */}
              <div className={`dr-row-avatar ${DISC_AVA[d.disc]}`}>
                {discIcon}
              </div>

              {/* name + tags */}
              <div className="dr-row-main">
                <span className="dr-row-name">{d.name}</span>
                <div className="dr-row-tags">
                  <span className={`dr-badge ${DISC_BADGE[d.disc]}`}>
                    {d.subDisc}
                  </span>
                  {d.flag && <span className="dr-badge drb-red">🚩 Clash</span>}
                  {!owned && (
                    <span className="dr-readonly-tag">🔒 Read Only</span>
                  )}
                </div>
              </div>

              <div className="dr-divider" />

              <div className="dr-meta" style={{ width: 100 }}>
                <span className="dr-meta-label">Drawing No.</span>
                <span
                  className="dr-meta-value dr-meta-mono"
                  style={{ fontSize: 10 }}
                >
                  {d.number}
                </span>
              </div>

              <div className="dr-divider" />

              <div className="dr-meta" style={{ width: 90 }}>
                <span className="dr-meta-label">Floor</span>
                <span className="dr-meta-value">{d.floor}</span>
              </div>

              <div className="dr-divider" />

              <div className="dr-meta" style={{ width: 64 }}>
                <span className="dr-meta-label">Revision</span>
                <span
                  className={`dr-meta-value dr-meta-mono ${
                    d.disc === "MEP"
                      ? "dr-meta-mep"
                      : d.disc === "ARCH"
                        ? "dr-meta-arch"
                        : "dr-meta-str"
                  }`}
                >
                  {d.rev}
                </span>
              </div>

              <div className="dr-divider" />

              <div className="dr-meta" style={{ width: 55 }}>
                <span className="dr-meta-label">Size</span>
                <span className="dr-meta-value dr-meta-mono">{d.size}</span>
              </div>

              <div className="dr-divider" />

              <div className="dr-meta" style={{ width: 88 }}>
                <span className="dr-meta-label">Uploaded</span>
                <span className="dr-meta-value">{d.date}</span>
              </div>

              <div className="dr-divider" />

              <div className="dr-meta" style={{ width: 130 }}>
                <span className="dr-meta-label">Status</span>
                <span
                  className={`dr-pill ${STATUS_PILL[d.status] || "drp-review"}`}
                >
                  {d.status}
                </span>
              </div>

              {/* spacer */}
              <div className="dr-spacer-row" />

              {/* actions */}
              <div className="dr-row-actions">
                <button className="dr-btn-icon" title="View drawing">
                  👁
                </button>
                <button className="dr-btn-icon" title="Download">
                  ⬇
                </button>
                <button
                  className="dr-btn-outline"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                  onClick={() => setVersionsFor(d)}
                >
                  🗂 Versions
                </button>
                {owned && (
                  <a
                    href={
                      currentRole === "mep"
                        ? "/mep/upload"
                        : `/${currentRole}/upload`
                    }
                    className="dr-btn-primary"
                    style={{ padding: "6px 12px", fontSize: 11 }}
                  >
                    ⬆️ Upload
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── VERSIONS SLIDE-OUT PANEL ── */}
      {versionsFor && (
        <VersionsPanel
          drawing={versionsFor}
          role={currentRole}
          onClose={() => setVersionsFor(null)}
        />
      )}

      {/* ── TOAST ── */}
      {toast && <div className="dr-toast">{toast}</div>}
    </div>
  );
}
