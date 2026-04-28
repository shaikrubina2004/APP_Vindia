import { useState, useEffect } from "react";
import ProjectSwitcher from "../../components/project/ProjectSwitcher";
import { useProject } from "../../context/ProjectContext";
import "../../styles/DrawingRegister.css";

/* ═══════════════════════════════════════
   ROLE CONFIG
═══════════════════════════════════════ */
const ROLE_META = {
  mep: { label: "MEP Engineer", icon: "🔧", cls: "dr-role-mep" },
  arch: { label: "Architect", icon: "🏛️", cls: "dr-role-arch" },
  str: { label: "Structural Engineer", icon: "🏗️", cls: "dr-role-str" },
};

/*
  APPROVAL RULES
  MEP drawing   → needs ARCH + STR approval
  ARCH drawing  → needs MEP  + STR approval
  STR drawing   → needs MEP  + ARCH approval
  The drawing owner cannot approve their own drawing.
*/
const APPROVAL_ROLES = {
  MEP: ["arch", "str"],
  ARCH: ["mep", "str"],
  STR: ["mep", "arch"],
};

/*
  STATUS TRANSITION RULES
  After finalized:
  - Owner can push to "Issued for Coordination"
  - Only Architect can push to "Issued for Construction" (all disciplines)
*/
const STATUS_TRANSITIONS = {
  "Issued for Coordination": (role, disc) => canUpload(role, disc), // owner only
  "Issued for Construction": (role, _disc) => role === "arch", // architect only
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
    status: "Issued for Coordination",
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
    status: "Issued for Coordination",
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
    status: "Issued for Coordination",
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
    status: "Issued for Coordination",
    date: "2026-04-14",
    uploadedBy: "Structural Team",
    size: "1.5 MB",
    flag: false,
  },
];

/* ═══════════════════════════════════════
   DRAWINGS BY PROJECT
═══════════════════════════════════════ */
const DRAWINGS_BY_PROJECT = {
  p1: [...MEP_DRAWINGS, ...ARCH_DRAWINGS, ...STR_DRAWINGS],
  p2: [
    MEP_DRAWINGS[0],
    MEP_DRAWINGS[1],
    MEP_DRAWINGS[3],
    MEP_DRAWINGS[5],
    ARCH_DRAWINGS[0],
    ARCH_DRAWINGS[1],
    ARCH_DRAWINGS[3],
    STR_DRAWINGS[0],
    STR_DRAWINGS[1],
    STR_DRAWINGS[3],
  ],
  p3: [
    MEP_DRAWINGS[0],
    MEP_DRAWINGS[3],
    ARCH_DRAWINGS[0],
    ARCH_DRAWINGS[2],
    STR_DRAWINGS[0],
  ],
};

/* ═══════════════════════════════════════
   VERSION DATA
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
      rev: drawing.rev === "R1" ? "R0" : "R1",
      current: false,
      date: "2026-04-01",
      uploader: drawing.uploadedBy,
      title: "Initial issue for coordination",
      note: "First version issued.",
    },
  ];
}

/* ═══════════════════════════════════════
   CLASH TYPES
═══════════════════════════════════════ */
const CLASH_TYPES = [
  "HVAC vs Structural",
  "Pipe vs Beam",
  "Conduit vs Duct",
  "Structural vs MEP",
  "Arch vs MEP",
  "Other",
];

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const DISC_ICON = { MEP: "🔧", ARCH: "🏛️", STR: "🏗️" };
const DISC_ROW = { MEP: "disc-mep", ARCH: "disc-arch", STR: "disc-str" };
const DISC_AVA = { MEP: "dra-mep", ARCH: "dra-arch", STR: "dra-str" };
const DISC_BADGE = { MEP: "drb-mep", ARCH: "drb-arch", STR: "drb-str" };

const STATUS_PILL = {
  Approved: "drp-approved",
  "Issued for Construction": "drp-issued",
  "Issued for Coordination": "drp-issued",
  Finalized: "drp-finalized",
};

function canUpload(role, disc) {
  if (role === "mep" && disc === "MEP") return true;
  if (role === "arch" && disc === "ARCH") return true;
  if (role === "str" && disc === "STR") return true;
  return false;
}

function canApprove(role, disc) {
  return APPROVAL_ROLES[disc]?.includes(role) ?? false;
}

function getApprovals(drawingId, disc, approvals) {
  const roles = APPROVAL_ROLES[disc] ?? [];
  const record = approvals[drawingId] ?? {};
  return roles.map((r) => ({
    role: r,
    label: ROLE_META[r]?.label ?? r,
    approved: !!record[r],
  }));
}

function isFullyApproved(drawingId, disc, approvals) {
  const roles = APPROVAL_ROLES[disc] ?? [];
  const record = approvals[drawingId] ?? {};
  return roles.every((r) => !!record[r]);
}

/* ═══════════════════════════════════════
   APPROVAL BADGES — inline on each card
═══════════════════════════════════════ */
function ApprovalBadges({ drawingId, disc, approvals }) {
  const items = getApprovals(drawingId, disc, approvals);
  return (
    <div className="dr-approval-badges">
      {items.map((item) => (
        <span
          key={item.role}
          className={`dr-approval-chip ${item.approved ? "chip-approved" : "chip-pending"}`}
          title={
            item.approved
              ? `${item.label} — Approved`
              : `${item.label} — Pending`
          }
        >
          {item.approved ? "✓" : "○"} {item.label}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   CLASH FLAG MODAL
═══════════════════════════════════════ */
function ClashFlagModal({ drawing, onSubmit, onClose }) {
  const [clashType, setClashType] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const canSubmit = clashType.trim() && reason.trim();

  return (
    <>
      <div className="dr-clash-modal-overlay" onClick={onClose} />
      <div className="dr-clash-modal">
        <div className="dr-clash-modal-head">
          <div>
            <h3>🚩 Flag Clash</h3>
            <p>
              <span
                className={`dr-badge ${DISC_BADGE[drawing.disc]}`}
                style={{ marginRight: 6 }}
              >
                {drawing.subDisc}
              </span>
              {drawing.name} · {drawing.floor} ·{" "}
              <span style={{ fontFamily: "Monaco,monospace", fontSize: 11 }}>
                {drawing.rev}
              </span>
            </p>
          </div>
          <button className="dr-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dr-clash-modal-body">
          <div className="dr-clash-field">
            <label className="dr-clash-label">
              Clash type <span style={{ color: "#c0392b" }}>*</span>
            </label>
            <div className="dr-clash-type-chips">
              {CLASH_TYPES.map((t) => (
                <button
                  key={t}
                  className={`dr-clash-type-chip${clashType === t ? " selected" : ""}`}
                  onClick={() => setClashType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="dr-clash-field">
            <label className="dr-clash-label">
              Description of clash <span style={{ color: "#c0392b" }}>*</span>
            </label>
            <textarea
              className="dr-clash-textarea"
              rows={4}
              placeholder="Describe the coordination conflict — e.g. HVAC duct at Level 3 conflicts with Beam B-14 shifted 200mm east."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="dr-clash-info-strip">
            <span>
              <strong>Drawing No.:</strong> {drawing.number}
            </span>
            <span>
              <strong>Revision:</strong> {drawing.rev}
            </span>
            <span>
              <strong>Floor:</strong> {drawing.floor}
            </span>
            <span>
              <strong>Uploaded by:</strong> {drawing.uploadedBy}
            </span>
          </div>
        </div>

        <div className="dr-clash-modal-foot">
          <button className="dr-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dr-btn-clash-submit"
            disabled={!canSubmit}
            onClick={() => canSubmit && onSubmit({ clashType, reason })}
          >
            🚩 Submit Clash Flag
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   APPROVAL MODAL
═══════════════════════════════════════ */
function ApprovalModal({
  drawing,
  role,
  approvals,
  onApprove,
  onWithdraw,
  onClose,
}) {
  const approverRoles = APPROVAL_ROLES[drawing.disc] ?? [];
  const isApprover = approverRoles.includes(role);
  const myApproval = approvals[drawing.id]?.[role] ?? false;
  const fullyApproved = isFullyApproved(drawing.id, drawing.disc, approvals);
  const items = getApprovals(drawing.id, drawing.disc, approvals);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className="dr-clash-modal-overlay" onClick={onClose} />
      <div className="dr-clash-modal" style={{ maxWidth: 460 }}>
        {/* head */}
        <div className="dr-clash-modal-head">
          <div>
            <h3>✅ Approval Status</h3>
            <p>
              <span
                className={`dr-badge ${DISC_BADGE[drawing.disc]}`}
                style={{ marginRight: 6 }}
              >
                {drawing.subDisc}
              </span>
              {drawing.name} · {drawing.rev}
            </p>
          </div>
          <button className="dr-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* body */}
        <div className="dr-clash-modal-body">
          {/* finalized banner */}
          {fullyApproved && (
            <div
              className="dr-alert dr-alert-green"
              style={{ marginBottom: 14 }}
            >
              <span className="dr-alert-icon">🏆</span>
              <span>
                <strong>Drawing Finalized</strong> — All required approvals
                received.
              </span>
            </div>
          )}

          {/* owner cannot approve notice */}
          {!isApprover && (
            <div
              className="dr-alert dr-alert-amber"
              style={{ marginBottom: 14 }}
            >
              <span className="dr-alert-icon">ℹ️</span>
              <span>
                You created this drawing and{" "}
                <strong>cannot approve it yourself</strong>. Approvals must come
                from {items.map((i) => i.label).join(" and ")}.
              </span>
            </div>
          )}

          {/* approval rule */}
          <div className="dr-clash-info-strip" style={{ marginBottom: 14 }}>
            <span style={{ width: "100%" }}>
              <strong>Rule:</strong> This {drawing.subDisc} drawing requires
              approval from {items.map((i) => i.label).join(" and ")} before it
              can be finalized.
            </span>
          </div>

          {/* checklist */}
          <div className="dr-ver-history-label" style={{ marginBottom: 8 }}>
            Approval checklist
          </div>
          <div className="dr-approval-checklist">
            {items.map((item) => (
              <div
                key={item.role}
                className={`dr-approval-row ${item.approved ? "row-approved" : "row-pending"}`}
              >
                <div className="dr-approval-row-left">
                  <span
                    className={`dr-approval-dot ${item.approved ? "dot-approved" : "dot-pending"}`}
                  />
                  <span className="dr-approval-role-label">{item.label}</span>
                </div>
                <span
                  className={`dr-pill ${item.approved ? "drp-approved" : "drp-review"}`}
                >
                  {item.approved ? "✓ Approved" : "Pending"}
                </span>
              </div>
            ))}
          </div>

          {/* progress bar */}
          <div className="dr-approval-progress-wrap">
            <div
              className="dr-approval-progress-bar"
              style={{
                width: `${(items.filter((i) => i.approved).length / items.length) * 100}%`,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            {items.filter((i) => i.approved).length} of {items.length} approvals
            received
            {fullyApproved ? " — Drawing finalized ✓" : ""}
          </div>
        </div>

        {/* foot */}
        <div className="dr-clash-modal-foot">
          <button className="dr-btn-outline" onClick={onClose}>
            Close
          </button>

          {isApprover && !fullyApproved && !myApproval && (
            <button
              className="dr-btn-approve"
              onClick={() => {
                onApprove(drawing.id, role);
                onClose();
              }}
            >
              ✅ Approve Drawing
            </button>
          )}
          {isApprover && myApproval && !fullyApproved && (
            <button
              className="dr-btn-outline"
              style={{ color: "#a32d2d", borderColor: "#f7c1c1" }}
              onClick={() => {
                onWithdraw(drawing.id, role);
                onClose();
              }}
            >
              ✕ Withdraw Approval
            </button>
          )}
          {fullyApproved && (
            <span
              className="dr-pill drp-finalized"
              style={{ padding: "7px 16px", fontSize: 12 }}
            >
              🏆 Finalized
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   VERSIONS SLIDE-OUT PANEL
═══════════════════════════════════════ */
function VersionsPanel({
  drawing,
  role,
  clashFlags,
  approvals,
  drawingStatuses,
  onClose,
  onOpenClashModal,
  onRemoveClash,
  onOpenApproval,
  onStatusChange,
}) {
  const versions = VERSION_DATA[drawing.id] || getDefaultVersions(drawing);
  const owned = canUpload(role, drawing.disc);
  const isNonMEP = drawing.disc !== "MEP";
  const clashInfo = clashFlags[drawing.id];
  const isFlagged = !!(drawing.flag || clashInfo);
  const fullyApproved = isFullyApproved(drawing.id, drawing.disc, approvals);
  const currentStatus = drawingStatuses[drawing.id] ?? drawing.status;
  const isFinalized = fullyApproved;
  const canIssueConstruct =
    isFinalized &&
    role === "arch" &&
    currentStatus === "Issued for Coordination";

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
                className={`dr-pill ${STATUS_PILL[currentStatus] || "drp-review"}`}
              >
                {currentStatus}
              </span>
            </div>
            <div className="dr-ver-hl-block" style={{ marginLeft: "auto" }}>
              <span className="dr-ver-hl-label">Uploaded By</span>
              <span className="dr-ver-hl-val-sm">{drawing.uploadedBy}</span>
            </div>
          </div>

          {/* approval summary */}
          <div style={{ marginBottom: 14 }}>
            <div className="dr-ver-history-label" style={{ marginBottom: 6 }}>
              Approvals
            </div>
            <ApprovalBadges
              drawingId={drawing.id}
              disc={drawing.disc}
              approvals={approvals}
            />
          </div>

          {/* clash banner */}
          {isFlagged && clashInfo && (
            <div className="dr-alert dr-alert-red" style={{ marginBottom: 14 }}>
              <span className="dr-alert-icon">🚩</span>
              <div>
                <strong>Clash flagged</strong> — {clashInfo.clashType}
                <br />
                <span style={{ fontSize: 11 }}>{clashInfo.reason}</span>
              </div>
            </div>
          )}

          {/* read-only notice */}
          {!owned && (
            <div
              className="dr-alert dr-alert-amber"
              style={{ marginBottom: 14 }}
            >
              <span className="dr-alert-icon">🔒</span>
              <span>
                You have <strong>read-only access</strong> to {drawing.subDisc}{" "}
                drawings. Only the {drawing.uploadedBy} can upload new versions.
                {isNonMEP && " You can flag clashes on the latest version."}
              </span>
            </div>
          )}

          <div className="dr-ver-history-label">
            Full Revision History — {versions.length} version
            {versions.length > 1 ? "s" : ""}
          </div>

          {/* timeline */}
          <div className="dr-ver-timeline">
            {versions.map((v, i) => {
              const showClashBtn = isNonMEP && v.current;
              return (
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
                      {v.current && isFlagged && (
                        <span className="dr-pill drp-clash">
                          🚩 Clash Flagged
                        </span>
                      )}
                      {v.current && fullyApproved && (
                        <span className="dr-pill drp-finalized">
                          🏆 Finalized
                        </span>
                      )}
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

                      {showClashBtn &&
                        (isFlagged ? (
                          <button
                            className="dr-btn-clash-active"
                            style={{ padding: "5px 12px", fontSize: 11 }}
                            onClick={() => onRemoveClash(drawing)}
                          >
                            ✓ Clash Flagged — Remove
                          </button>
                        ) : (
                          <button
                            className="dr-btn-clash"
                            style={{ padding: "5px 12px", fontSize: 11 }}
                            onClick={() => onOpenClashModal(drawing)}
                          >
                            🚩 Flag Clash
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* foot */}
        <div className="dr-slideout-foot" style={{ flexWrap: "wrap", gap: 8 }}>
          {owned ? (
            <>
              <button
                className="dr-btn-outline"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => onOpenApproval(drawing)}
              >
                ✅ View Approvals
              </button>

              {canIssueConstruct && (
                <button
                  className="dr-btn-status-construct"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() =>
                    onStatusChange(drawing.id, "Issued for Construction")
                  }
                >
                  🏗️ Issue for Construction
                </button>
              )}
              <a
                href="/mep/upload"
                className="dr-btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
              >
                ⬆️ Upload New Version
              </a>
            </>
          ) : (
            <>
              <button
                className="dr-btn-outline"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={onClose}
              >
                Close
              </button>
              {canApprove(role, drawing.disc) && (
                <button
                  className="dr-btn-approve"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => onOpenApproval(drawing)}
                >
                  ✅ Approve / View Status
                </button>
              )}
              {canIssueConstruct && (
                <button
                  className="dr-btn-status-construct"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() =>
                    onStatusChange(drawing.id, "Issued for Construction")
                  }
                >
                  🏗️ Issue for Construction
                </button>
              )}
            </>
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
  const { activeProject } = useProject();
  const [discFilter, setDiscFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [versionsFor, setVersionsFor] = useState(null);
  const [clashModal, setClashModal] = useState(null);
  const [approvalModal, setApprovalModal] = useState(null);
  const [clashFlags, setClashFlags] = useState({});
  /*
    approvals shape: { [drawingId]: { mep?: bool, arch?: bool, str?: bool } }
    Only the two non-owner roles are ever set per drawing.
  */
  const [approvals, setApprovals] = useState({});
  const [drawingStatuses, setDrawingStatuses] = useState({}); // { [drawingId]: "Issued for Coordination" | "Issued for Construction" }
  const [toast, setToast] = useState("");
  if (!activeProject) return null;

  const roleMeta = ROLE_META[currentRole] || ROLE_META.mep;

  const drawings = DRAWINGS_BY_PROJECT[activeProject.id] ?? [];

  const counts = {
    all: drawings.length,
    MEP: drawings.filter((d) => d.disc === "MEP").length,
    ARCH: drawings.filter((d) => d.disc === "ARCH").length,
    STR: drawings.filter((d) => d.disc === "STR").length,
  };

  const floors = [
    "all",
    ...Array.from(new Set(drawings.map((d) => d.floor))).sort(),
  ];

  const visible = drawings.filter((d) => {
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

  const flaggedCount = drawings.filter(
    (d) => d.flag || clashFlags[d.id],
  ).length;
  const finalizedCount = drawings.filter((d) =>
    isFullyApproved(d.id, d.disc, approvals),
  ).length;

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

  /* ── clash handlers ── */
  const handleClashSubmit = ({ clashType, reason }) => {
    const drawing = clashModal;
    setClashFlags((prev) => ({
      ...prev,
      [drawing.id]: {
        clashType,
        reason,
        date: new Date().toISOString().slice(0, 10),
      },
    }));
    setClashModal(null);
    showToast(`🚩 Clash flagged on ${drawing.name} — ${clashType}`);
  };

  const handleRemoveClash = (drawing) => {
    setClashFlags((prev) => {
      const n = { ...prev };
      delete n[drawing.id];
      return n;
    });
    showToast(`Clash flag removed from ${drawing.name}`);
  };

  /* ── approval handlers ── */
  const handleApprove = (drawingId, role) => {
    const newApprovals = {
      ...approvals,
      [drawingId]: { ...(approvals[drawingId] ?? {}), [role]: true },
    };
    setApprovals(newApprovals);
    const d = drawings.find((x) => x.id === drawingId);
    if (isFullyApproved(drawingId, d?.disc, newApprovals)) {
      showToast(`🏆 ${d?.name} is now Finalized — all approvals received!`);
    } else {
      showToast(`✅ Approval recorded for ${d?.name}`);
    }
  };
  const handleStatusChange = (drawingId, newStatus) => {
    setDrawingStatuses((prev) => ({ ...prev, [drawingId]: newStatus }));
    const d = drawings.find((x) => x.id === drawingId);
    showToast(`📋 ${d?.name} status updated to "${newStatus}"`);
  };

  const handleWithdraw = (drawingId, role) => {
    setApprovals((prev) => ({
      ...prev,
      [drawingId]: { ...(prev[drawingId] ?? {}), [role]: false },
    }));
    const d = drawings.find((x) => x.id === drawingId);
    showToast(`Approval withdrawn from ${d?.name}`);
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
          <span className={`dr-role-badge ${roleMeta.cls}`}>
            {roleMeta.icon} {roleMeta.label}
          </span>
          <ProjectSwitcher />
          <button
            className="dr-btn-outline"
            onClick={() => showToast("📥 Preparing download...")}
          >
            📥 Download All
          </button>
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
            value: drawings.length,
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
            icon: "🏆",
            label: "Finalized",
            value: finalizedCount,
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
          const canApproveThis = canApprove(currentRole, d.disc);
          const isFlagged = d.flag || !!clashFlags[d.id];
          const fullyApproved = isFullyApproved(d.id, d.disc, approvals);
          const myApproval = approvals[d.id]?.[currentRole] ?? false;

          return (
            <div
              key={d.id}
              className={`dr-row ${DISC_ROW[d.disc]}${fullyApproved ? " row-finalized" : ""}`}
            >
              <div className={`dr-row-avatar ${DISC_AVA[d.disc]}`}>
                {DISC_ICON[d.disc]}
              </div>

              <div className="dr-row-main">
                <span className="dr-row-name">{d.name}</span>
                <div className="dr-row-tags">
                  <span className={`dr-badge ${DISC_BADGE[d.disc]}`}>
                    {d.subDisc}
                  </span>
                  {isFlagged && (
                    <span className="dr-badge drb-red">🚩 Clash</span>
                  )}
                  {fullyApproved && (
                    <span className="dr-badge drb-finalized">🏆 Finalized</span>
                  )}
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
                  className={`dr-meta-value dr-meta-mono ${d.disc === "MEP" ? "dr-meta-mep" : d.disc === "ARCH" ? "dr-meta-arch" : "dr-meta-str"}`}
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
                  className={`dr-pill ${fullyApproved ? "drp-finalized" : STATUS_PILL[d.status] || "drp-review"}`}
                >
                  {fullyApproved ? "🏆 Finalized" : d.status}
                </span>
              </div>

              <div className="dr-spacer-row" />

              <div className="dr-row-actions">
                <button className="dr-btn-icon" title="View drawing">
                  👁
                </button>
                <button className="dr-btn-icon" title="Download">
                  ⬇
                </button>

                {/* Approve button — eligible non-owners only, not yet finalized */}

                {/* Owner sees approval status */}

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
          clashFlags={clashFlags}
          approvals={approvals}
          drawingStatuses={drawingStatuses}
          onClose={() => setVersionsFor(null)}
          onOpenClashModal={(drawing) => setClashModal(drawing)}
          onRemoveClash={handleRemoveClash}
          onOpenApproval={(drawing) => {
            setVersionsFor(null);
            setApprovalModal(drawing);
          }}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* ── CLASH FLAG MODAL ── */}
      {clashModal && (
        <ClashFlagModal
          drawing={clashModal}
          onSubmit={handleClashSubmit}
          onClose={() => setClashModal(null)}
        />
      )}

      {/* ── APPROVAL MODAL ── */}
      {approvalModal && (
        <ApprovalModal
          drawing={approvalModal}
          role={currentRole}
          approvals={approvals}
          onApprove={handleApprove}
          onWithdraw={handleWithdraw}
          onClose={() => setApprovalModal(null)}
        />
      )}

      {/* ── TOAST ── */}
      {toast && <div className="dr-toast">{toast}</div>}
    </div>
  );
}
