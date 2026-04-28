import { useState, useEffect } from "react";
import { useProject } from "../../context/ProjectContext";
import ProjectSwitcher from "../../components/project/ProjectSwitcher";
import "../../styles/MEPEngineer.css";

const DRAWINGS_LIST = {
  p1: [
    "HVAC Layout — Level 3 (Rev-5)",
    "Plumbing GF (Rev-3)",
    "Electrical SLD (Rev-5)",
    "Drainage L2 (Rev-4)",
    "Conduit Routing GF (Rev-2)",
    "Chiller Plant Layout (Rev-1)",
  ],
  p2: [
    "HVAC Layout GF (Rev-2)",
    "Electrical SLD (Rev-1)",
    "Plumbing GF (Rev-2)",
  ],
  p3: ["HVAC Schematic (Rev-1)", "Plumbing Schematic (Rev-1)"],
};

const TEAM_OPTIONS = [
  {
    key: "arch",
    label: "🏛️ Architect",
    role: "Person 3 — Design lead",
    badgeCls: "badge-blue",
    badgeLabel: "Architect",
  },
  {
    key: "struct",
    label: "🏗️ Structural Engineer",
    role: "Person 4 — Coordination",
    badgeCls: "badge-purple",
    badgeLabel: "Structural",
  },
  {
    key: "coord",
    label: "📋 Project Coordinator",
    role: "Person 1 — Schedule & milestones",
    badgeCls: "badge-green",
    badgeLabel: "Coordinator",
  },
  {
    key: "qs",
    label: "📐 Quantity Surveyor",
    role: "Person 6 — BOQ reference",
    badgeCls: "badge-blue",
    badgeLabel: "QS",
  },
  {
    key: "site",
    label: "👷 Site Engineer",
    role: "Person 2 — On-site execution",
    badgeCls: "badge-blue",
    badgeLabel: "Site Eng",
  },
];

/* ═══════════════════════════════════════
   TEAMS  (keyed by project)
═══════════════════════════════════════ */
const TEAMS = {
  p1: [
    {
      key: "arch",
      icon: "🏛️",
      avatarCls: "si-blue",
      name: "Architect",
      role: "Person 3",
      lastSeen: "1h ago",
      items: [
        {
          label: "Floor Plan Rev4 compatibility",
          badge: "badge-amber",
          badgeLabel: "Pending",
        },
        {
          label: "Ceiling grid MEP clearance",
          badge: "badge-green",
          badgeLabel: "OK",
        },
        {
          label: "Conduit shaft — #INC-038",
          badge: "badge-red",
          badgeLabel: "Open",
        },
      ],
    },
    {
      key: "struct",
      icon: "🏗️",
      avatarCls: "si-purple",
      name: "Structural Engineer",
      role: "Person 4",
      lastSeen: "30min ago",
      items: [
        {
          label: "Beam B-14 clash — Level 3",
          badge: "badge-red",
          badgeLabel: "High",
        },
        {
          label: "Slab S-7 MEP penetrations",
          badge: "badge-green",
          badgeLabel: "Approved",
        },
        {
          label: "New beam layout review",
          badge: "badge-amber",
          badgeLabel: "Due",
        },
      ],
    },
    {
      key: "coord",
      icon: "📋",
      avatarCls: "si-green",
      name: "Project Coordinator",
      role: "Person 1",
      lastSeen: "2h ago",
      items: [
        {
          label: "MEP Level 2 schedule",
          badge: "badge-green",
          badgeLabel: "Approved",
        },
        {
          label: "Daily log reminder sent",
          badge: "badge-green",
          badgeLabel: "Done",
        },
        {
          label: "Resource request — Level 3",
          badge: "badge-amber",
          badgeLabel: "Pending",
        },
      ],
    },
  ],
  p2: [
    {
      key: "arch",
      icon: "🏛️",
      avatarCls: "si-blue",
      name: "Architect",
      role: "Person 7",
      lastSeen: "3h ago",
      items: [
        {
          label: "Mall facade MEP penetrations",
          badge: "badge-amber",
          badgeLabel: "Pending",
        },
        {
          label: "Food court exhaust routing",
          badge: "badge-red",
          badgeLabel: "Open",
        },
        {
          label: "Roof plant room access",
          badge: "badge-green",
          badgeLabel: "OK",
        },
      ],
    },
    {
      key: "struct",
      icon: "🏗️",
      avatarCls: "si-purple",
      name: "Structural Engineer",
      role: "Person 8",
      lastSeen: "1h ago",
      items: [
        {
          label: "Slab opening — Zone B",
          badge: "badge-amber",
          badgeLabel: "Review",
        },
        {
          label: "Column grid clearance check",
          badge: "badge-green",
          badgeLabel: "Approved",
        },
        {
          label: "Basement MEP coordination",
          badge: "badge-amber",
          badgeLabel: "Due",
        },
      ],
    },
    {
      key: "coord",
      icon: "📋",
      avatarCls: "si-green",
      name: "Project Coordinator",
      role: "Person 5",
      lastSeen: "45min ago",
      items: [
        {
          label: "Phase 2 MEP schedule",
          badge: "badge-green",
          badgeLabel: "Approved",
        },
        {
          label: "Contractor site access",
          badge: "badge-amber",
          badgeLabel: "Pending",
        },
        {
          label: "Weekly progress report",
          badge: "badge-green",
          badgeLabel: "Done",
        },
      ],
    },
  ],
  p3: [
    {
      key: "arch",
      icon: "🏛️",
      avatarCls: "si-blue",
      name: "Architect",
      role: "Person 9",
      lastSeen: "2h ago",
      items: [
        {
          label: "Platform MEP integration",
          badge: "badge-amber",
          badgeLabel: "Pending",
        },
        {
          label: "Tunnel ventilation layout",
          badge: "badge-red",
          badgeLabel: "Open",
        },
        {
          label: "Concourse ceiling clearance",
          badge: "badge-green",
          badgeLabel: "OK",
        },
      ],
    },
    {
      key: "struct",
      icon: "🏗️",
      avatarCls: "si-purple",
      name: "Structural Engineer",
      role: "Person 10",
      lastSeen: "4h ago",
      items: [
        {
          label: "Tunnel wall penetrations",
          badge: "badge-red",
          badgeLabel: "High",
        },
        {
          label: "Platform slab MEP ducts",
          badge: "badge-amber",
          badgeLabel: "Review",
        },
        {
          label: "Station roof MEP load",
          badge: "badge-green",
          badgeLabel: "Approved",
        },
      ],
    },
    {
      key: "coord",
      icon: "📋",
      avatarCls: "si-green",
      name: "Project Coordinator",
      role: "Person 2",
      lastSeen: "30min ago",
      items: [
        {
          label: "MEP tender package",
          badge: "badge-amber",
          badgeLabel: "Pending",
        },
        {
          label: "Authority submission docs",
          badge: "badge-red",
          badgeLabel: "Urgent",
        },
        {
          label: "Site survey coordination",
          badge: "badge-green",
          badgeLabel: "Done",
        },
      ],
    },
  ],
};

/* ═══════════════════════════════════════
   THREADS  (keyed by project)
═══════════════════════════════════════ */
const INITIAL_THREADS = {
  p1: [
    {
      id: 1,
      title: "Beam B-14 clash resolution — Level 3",
      teams: [
        { cls: "badge-purple", label: "Structural" },
        { cls: "badge-mep-m", label: "MEP" },
        { cls: "badge-red", label: "High" },
      ],
      drawing: "HVAC Layout — Level 3 (Rev-5)",
      disc: "Mechanical",
      priority: "High",
      status: "open",
      resolution: null,
      messages: [
        {
          av: "av-struct",
          initials: "SE",
          name: "Structural Eng",
          time: "Today 11:00 AM",
          text: "New beam layout uploaded — Beam B-14 has moved 200mm east. Please check if your pipe route is still conflicting.",
          isDecision: false,
          isMine: false,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "Today 09:15 AM",
          text: "Checked — conflict still exists at our 100mm CW main. Raising incident #INC-041. We need a 300mm clear passage minimum.",
          isDecision: false,
          isMine: true,
        },
        {
          av: "av-struct",
          initials: "SE",
          name: "Structural Eng",
          time: "Today 09:30 AM",
          text: "Understood. Will discuss with design team. Can we schedule a call this afternoon?",
          isDecision: false,
          isMine: false,
        },
      ],
    },
    {
      id: 2,
      title: "Floor Plan Rev4 — MEP compatibility check",
      teams: [
        { cls: "badge-blue", label: "Architect" },
        { cls: "badge-mep-p", label: "Plumbing" },
        { cls: "badge-amber", label: "Medium" },
      ],
      drawing: "Plumbing GF (Rev-3)",
      disc: "Plumbing",
      priority: "Medium",
      status: "awaiting",
      resolution: null,
      messages: [
        {
          av: "av-arch",
          initials: "AR",
          name: "Architect",
          time: "Today 08:45 AM",
          text: "Floor Plan Rev4 has been uploaded. Key change — toilet block on Level 2 moved 1.5m north. Please review your plumbing layout for compatibility.",
          isDecision: false,
          isMine: false,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "Today 09:00 AM",
          text: "Noted. Will review plumbing drawing and update by end of day. The waste pipe slope may be affected — will confirm after assessment.",
          isDecision: false,
          isMine: true,
        },
      ],
    },
    {
      id: 3,
      title: "Conduit shaft routing — Ground Floor conflict",
      teams: [
        { cls: "badge-blue", label: "Architect" },
        { cls: "badge-purple", label: "Structural" },
        { cls: "badge-grey", label: "Low" },
      ],
      drawing: "Conduit Routing GF (Rev-2)",
      disc: "Electrical",
      priority: "Low",
      status: "resolved",
      resolution:
        "Conduit route shifted 500mm west as agreed. MEP to issue Rev-3 of Conduit Routing GF drawing. Structural confirmed no impact on beam positions. Architect updated shaft opening dimensions accordingly.",
      messages: [
        {
          av: "av-arch",
          initials: "AR",
          name: "Architect",
          time: "2 days ago",
          text: "The conduit shaft on GF clashes with the proposed staircase enclosure. We need to reroute before construction starts.",
          isDecision: false,
          isMine: false,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "2 days ago",
          text: "Agreed. We can shift the conduit 500mm west without affecting the distribution board clearance. Structural, does that impact any beams?",
          isDecision: false,
          isMine: true,
        },
        {
          av: "av-struct",
          initials: "SE",
          name: "Structural Eng",
          time: "2 days ago",
          text: "No impact on beams. 500mm west shift is fine from structural perspective.",
          isDecision: false,
          isMine: false,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "2 days ago",
          text: "Conduit route shifted 500mm west. All parties agreed. Will issue updated drawing Rev-3.",
          isDecision: true,
          isMine: true,
        },
      ],
    },
  ],
  p2: [
    {
      id: 1,
      title: "Food court exhaust duct — ceiling clash",
      teams: [
        { cls: "badge-blue", label: "Architect" },
        { cls: "badge-mep-m", label: "MEP" },
        { cls: "badge-red", label: "High" },
      ],
      drawing: "HVAC Layout GF (Rev-2)",
      disc: "Mechanical",
      priority: "High",
      status: "open",
      resolution: null,
      messages: [
        {
          av: "av-arch",
          initials: "AR",
          name: "Architect",
          time: "Today 10:00 AM",
          text: "The food court exhaust duct shown in HVAC Rev-2 conflicts with the feature ceiling at GL-4. Ceiling height is 3.2m but duct drops to 2.9m.",
          isDecision: false,
          isMine: false,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "Today 10:30 AM",
          text: "Acknowledged. We can reduce duct depth by 150mm using a flat oval section. Will update drawing and reissue. Structural please confirm beam soffit at GL-4.",
          isDecision: false,
          isMine: true,
        },
      ],
    },
    {
      id: 2,
      title: "Basement slab opening — Zone B drainage",
      teams: [
        { cls: "badge-purple", label: "Structural" },
        { cls: "badge-mep-p", label: "Plumbing" },
        { cls: "badge-amber", label: "Medium" },
      ],
      drawing: "Plumbing GF (Rev-2)",
      disc: "Plumbing",
      priority: "Medium",
      status: "awaiting",
      resolution: null,
      messages: [
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "Yesterday 03:00 PM",
          text: "We need a 300×300mm slab opening at Grid B3 for the basement drainage stack. Please confirm if this conflicts with any rebar arrangement.",
          isDecision: false,
          isMine: true,
        },
        {
          av: "av-struct",
          initials: "SE",
          name: "Structural Eng",
          time: "Yesterday 04:15 PM",
          text: "Checking drawing. Will revert by tomorrow morning. Preliminary view — should be fine but need to verify rebar layout.",
          isDecision: false,
          isMine: false,
        },
      ],
    },
    {
      id: 3,
      title: "Roof plant room — electrical cable tray route",
      teams: [
        { cls: "badge-blue", label: "Architect" },
        { cls: "badge-mep-e", label: "Electrical" },
        { cls: "badge-grey", label: "Low" },
      ],
      drawing: "Electrical SLD (Rev-1)",
      disc: "Electrical",
      priority: "Low",
      status: "resolved",
      resolution:
        "Cable tray route revised to run along north parapet wall. Architect confirmed no visual impact from mall atrium. MEP to issue Rev-2 of Electrical SLD.",
      messages: [
        {
          av: "av-arch",
          initials: "AR",
          name: "Architect",
          time: "3 days ago",
          text: "The proposed cable tray on the roof is visible from the mall atrium skylight. Can it be rerouted along the parapet?",
          isDecision: false,
          isMine: false,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "3 days ago",
          text: "Yes — we can run it along the north parapet wall. Cable run increases by 8m but no technical issues. Will update the drawing.",
          isDecision: true,
          isMine: true,
        },
      ],
    },
  ],
  p3: [
    {
      id: 1,
      title: "Tunnel ventilation — structural wall penetration",
      teams: [
        { cls: "badge-purple", label: "Structural" },
        { cls: "badge-mep-m", label: "MEP" },
        { cls: "badge-red", label: "High" },
      ],
      drawing: "HVAC Schematic (Rev-1)",
      disc: "Mechanical",
      priority: "High",
      status: "open",
      resolution: null,
      messages: [
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "Today 09:00 AM",
          text: "We require two 800×600mm openings through the diaphragm wall at Station North end for tunnel ventilation fans. Please review structural implications.",
          isDecision: false,
          isMine: true,
        },
        {
          av: "av-struct",
          initials: "SE",
          name: "Structural Eng",
          time: "Today 09:45 AM",
          text: "This is a critical structural element. We will need to introduce lintels and check water-tightness. Please issue a formal RFI so we can log this properly.",
          isDecision: false,
          isMine: false,
        },
      ],
    },
    {
      id: 2,
      title: "Platform slab — MEP duct coordination",
      teams: [
        { cls: "badge-purple", label: "Structural" },
        { cls: "badge-mep-m", label: "MEP" },
        { cls: "badge-amber", label: "Medium" },
      ],
      drawing: "HVAC Schematic (Rev-1)",
      disc: "Mechanical",
      priority: "Medium",
      status: "awaiting",
      resolution: null,
      messages: [
        {
          av: "av-struct",
          initials: "SE",
          name: "Structural Eng",
          time: "2 days ago",
          text: "Platform slab structural drawing issued. Please overlay your MEP ducts and check for conflicts before we finalise rebar positions.",
          isDecision: false,
          isMine: false,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "2 days ago",
          text: "Will overlay and revert within 48 hours. Initial review shows possible conflict at Grid S-3 with the supply air duct.",
          isDecision: false,
          isMine: true,
        },
      ],
    },
    {
      id: 3,
      title: "Authority submission — MEP drawings sign-off",
      teams: [
        { cls: "badge-green", label: "Coordinator" },
        { cls: "badge-mep-m", label: "MEP" },
        { cls: "badge-grey", label: "Low" },
      ],
      drawing: "Plumbing Schematic (Rev-1)",
      disc: "Plumbing",
      priority: "Low",
      status: "resolved",
      resolution:
        "All MEP drawings stamped and submitted to authority on 22 Apr. Coordinator confirmed receipt. Approval expected within 15 working days.",
      messages: [
        {
          av: "av-coord",
          initials: "PC",
          name: "Project Coordinator",
          time: "4 days ago",
          text: "Authority submission deadline is next Monday. Please confirm which MEP drawings are ready for stamping and submission.",
          isDecision: false,
          isMine: false,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "4 days ago",
          text: "HVAC and Plumbing schematics are ready. Stamped copies will be with you by Friday EOD.",
          isDecision: false,
          isMine: true,
        },
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "3 days ago",
          text: "Stamped drawings submitted to coordinator. All MEP disciplines covered for this submission package.",
          isDecision: true,
          isMine: true,
        },
      ],
    },
  ],
};

const STATUS_INFO = {
  open: { label: "Open", pill: "pill-open" },
  awaiting: { label: "Awaiting Reply", pill: "pill-inprog" },
  resolved: { label: "Resolved", pill: "pill-resolved" },
};

const PRIORITY_BADGE = {
  High: "badge-red",
  Medium: "badge-amber",
  Low: "badge-grey",
};

/* ── Inline New Thread Form ───────────────────────── */
function NewThreadForm({ onClose, onAdd, projectName, drawingsList }) {
  const [subject, setSubject] = useState("");
  const [disc, setDisc] = useState("");
  const [drawing, setDrawing] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [note, setNote] = useState("");
  const [teams, setTeams] = useState({
    arch: false,
    struct: false,
    coord: false,
    qs: false,
    site: false,
  });

  const toggleTeam = (k) => setTeams((p) => ({ ...p, [k]: !p[k] }));
  const anyTeam = Object.values(teams).some(Boolean);
  const canSubmit = subject.trim() !== "" && disc !== "" && anyTeam;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const selectedTeams = TEAM_OPTIONS.filter((t) => teams[t.key]).map((t) => ({
      cls: t.badgeCls,
      label: t.badgeLabel,
    }));
    selectedTeams.push({
      cls: PRIORITY_BADGE[priority] || "badge-grey",
      label: priority,
    });

    onAdd({
      id: Date.now(),
      title: subject,
      teams: selectedTeams,
      drawing: drawing || "—",
      disc,
      priority,
      status: "open",
      resolution: null,
      messages: [
        {
          av: "av-me",
          initials: "ME",
          name: "MEP Engineer (You)",
          time: "Just now",
          text: note.trim() || `Thread opened: ${subject}`,
          isDecision: false,
          isMine: true,
        },
      ],
    });
    onClose();
  };

  return (
    <div
      className="mep-card"
      style={{ border: "2px solid var(--primary-blue)" }}
    >
      <div className="mep-card-head">
        <span className="card-title">💬 New Coordination Thread</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {projectName}
          </span>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: "4px 10px" }}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="mep-card-body"
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div className="form-group">
          <label>
            Thread Subject <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Beam B-14 clash — HVAC route conflict Level 3"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              Discipline <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <select
              className="form-select"
              value={disc}
              onChange={(e) => setDisc(e.target.value)}
            >
              <option value="">Select discipline</option>
              <option>Mechanical</option>
              <option>Electrical</option>
              <option>Plumbing</option>
              <option>All MEP</option>
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div className="form-group">
            <label>Related Drawing</label>
            <select
              className="form-select"
              value={drawing}
              onChange={(e) => setDrawing(e.target.value)}
            >
              <option value="">Select drawing (optional)</option>
              {drawingsList.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>
            Teams Involved <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            {TEAM_OPTIONS.map((t) => (
              <div
                key={t.key}
                className="notify-item"
                onClick={() => toggleTeam(t.key)}
                style={{
                  cursor: "pointer",
                  borderColor: teams[t.key] ? "var(--primary-blue)" : undefined,
                  background: teams[t.key] ? "rgba(30,90,150,0.05)" : undefined,
                }}
              >
                <input
                  type="checkbox"
                  readOnly
                  checked={teams[t.key]}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: "var(--primary-blue)",
                    flexShrink: 0,
                    pointerEvents: "none",
                  }}
                />
                <div>
                  <div className="notify-team">{t.label}</div>
                  <div className="notify-role">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Opening Note</label>
          <textarea
            className="form-textarea"
            placeholder="Describe the coordination issue and what needs to be resolved..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {!canSubmit && (subject || disc || anyTeam) && (
          <div className="alert alert-amber" style={{ padding: "8px 12px" }}>
            <span className="alert-icon">⚠️</span>
            <span>
              Please fill in Subject, Discipline, and select at least one Team.
            </span>
          </div>
        )}
      </div>

      <div className="mep-card-foot">
        <button type="button" className="btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          style={{
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          💬 Create Thread
        </button>
      </div>
    </div>
  );
}

/* ── Resolve Form ─────────────────────────────────── */
function ResolveForm({ thread, onClose, onResolve }) {
  const [text, setText] = useState("");
  return (
    <div style={{ margin: "10px 14px" }}>
      <div className="alert alert-blue" style={{ marginBottom: 10 }}>
        <span className="alert-icon">ℹ️</span>
        <span>
          Write the formal resolution. This will be permanently attached to the
          thread and linked to the drawing.
        </span>
      </div>
      <div className="form-group" style={{ marginBottom: 10 }}>
        <label>
          Resolution Note <span style={{ color: "var(--danger)" }}>*</span>
        </label>
        <textarea
          className="form-textarea"
          style={{ minHeight: 80 }}
          placeholder="Describe what was agreed, who agreed, and what action is required..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn-outline"
          style={{ fontSize: 11, padding: "6px 12px" }}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          style={{
            fontSize: 11,
            padding: "6px 12px",
            opacity: text.trim() ? 1 : 0.5,
          }}
          onClick={() => {
            if (!text.trim()) return;
            onResolve(thread.id, text.trim());
            onClose();
          }}
        >
          ✅ Confirm Resolution
        </button>
      </div>
    </div>
  );
}

/* ── Single Thread ────────────────────────────────── */
function CoordThread({ thread, onResolve }) {
  const [messages, setMessages] = useState(thread.messages);
  const [reply, setReply] = useState("");
  const [isDecision, setIsDecision] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const statusInfo = STATUS_INFO[thread.status] || STATUS_INFO.open;
  const discIcon =
    thread.disc === "Mechanical"
      ? "🔧"
      : thread.disc === "Electrical"
        ? "⚡"
        : thread.disc === "Plumbing"
          ? "🚿"
          : "📋";

  const send = () => {
    if (!reply.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        av: "av-me",
        initials: "ME",
        name: "MEP Engineer (You)",
        time: "Just now",
        text: reply,
        isDecision,
        isMine: true,
      },
    ]);
    setReply("");
    setIsDecision(false);
  };

  return (
    <div className="coord-thread">
      <div className="ct-head" onClick={() => setExpanded((v) => !v)}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{discIcon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ct-title">{thread.title}</div>
          <div
            style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}
          >
            {thread.teams.map((t, i) => (
              <span key={i} className={`badge ${t.cls}`}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <span className="ct-meta">{messages.length} msgs</span>
        <span
          className={`status-pill ${statusInfo.pill}`}
          style={{ marginLeft: 8 }}
        >
          {statusInfo.label}
        </span>
        <span
          style={{
            marginLeft: 10,
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <>
          <div className="ct-status-bar">
            <div className="ct-status-left">
              <span>📐 {thread.drawing}</span>
              <span style={{ color: "var(--border-color)" }}>·</span>
              <span>
                {discIcon} {thread.disc}
              </span>
            </div>
          </div>

          {thread.resolution && (
            <div className="ct-resolution" style={{ margin: "10px 14px" }}>
              <div className="ct-resolution-label">✅ Resolution</div>
              {thread.resolution}
            </div>
          )}

          <div className="ct-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg${m.isMine ? " me" : ""}`}>
                <div className={`msg-av ${m.av}`}>{m.initials}</div>
                <div style={{ flex: 1 }}>
                  {m.isDecision && (
                    <span className="msg-decision-tag">⭐ Decision</span>
                  )}
                  <div
                    className={`msg-bubble${m.isDecision ? " is-decision" : ""}`}
                  >
                    {m.text}
                  </div>
                  <div className="msg-meta">
                    {m.name} · {m.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showResolve && (
            <ResolveForm
              thread={thread}
              onClose={() => setShowResolve(false)}
              onResolve={onResolve}
            />
          )}

          {thread.status !== "resolved" && !showResolve && (
            <div className="reply-box">
              <input
                type="text"
                className="reply-input"
                placeholder={`Reply to ${thread.teams[0]?.label || "team"}...`}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button
                type="button"
                className="reply-decision-btn"
                onClick={() => setIsDecision((v) => !v)}
                style={{
                  background: isDecision ? "#fef3c7" : undefined,
                  borderColor: isDecision ? "#f59e0b" : undefined,
                }}
              >
                {isDecision ? "⭐ Decision" : "⭐ Tag Decision"}
              </button>
              <button type="button" className="reply-send" onClick={send}>
                ➤
              </button>
            </div>
          )}

          <div
            className="ct-status-bar"
            style={{
              borderTop: "1px solid var(--border-color)",
              borderBottom: "none",
            }}
          >
            <div className="ct-status-left">
              <span>📐 {thread.drawing}</span>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {thread.status !== "resolved" && !showResolve && (
                <button
                  type="button"
                  className="btn-outline"
                  style={{ fontSize: 11, padding: "5px 11px" }}
                  onClick={() => setShowResolve(true)}
                >
                  ✅ Mark Resolved
                </button>
              )}
              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: 11, padding: "5px 11px" }}
              >
                📤 Escalate
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────── */
export default function MEPCoordination() {
  const { activeProject } = useProject();
  if (!activeProject) return null; // ← add this line

  const [threadsByProject, setThreadsByProject] = useState(INITIAL_THREADS);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");

  // Reset filter and close form when project switches
  useEffect(() => {
    setFilter("all");
    setShowForm(false);
  }, [activeProject.id]);

  const threads = threadsByProject[activeProject.id] || [];
  const teams = TEAMS[activeProject.id] || [];
  const drawingsList = DRAWINGS_LIST[activeProject.id] || [];

  const addThread = (t) => {
    setThreadsByProject((prev) => ({
      ...prev,
      [activeProject.id]: [t, ...(prev[activeProject.id] || [])],
    }));
    setShowForm(false);
  };

  const resolveThread = (id, resolution) => {
    setThreadsByProject((prev) => ({
      ...prev,
      [activeProject.id]: (prev[activeProject.id] || []).map((t) =>
        t.id === id ? { ...t, status: "resolved", resolution } : t,
      ),
    }));
  };

  const openCount = threads.filter((t) => t.status !== "resolved").length;
  const resolvedCount = threads.filter((t) => t.status === "resolved").length;

  const filtered = threads.filter((t) => {
    if (filter === "open") return t.status !== "resolved";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  return (
    <div className="mep-page">
      <div className="mep-header">
        <div>
          <h1>Cross-Team Coordination</h1>
          <p>
            {activeProject.name} · Architect · Structural · Design Integration
          </p>
        </div>
        <div className="mep-header-actions">
          <ProjectSwitcher />
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowForm((v) => !v)}
          >
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
            {showForm ? "Cancel" : "New Coordination Thread"}
          </button>
        </div>
      </div>

      {showForm && (
        <NewThreadForm
          onClose={() => setShowForm(false)}
          onAdd={addThread}
          projectName={activeProject.name}
          drawingsList={drawingsList}
        />
      )}

      <div className="team-grid">
        {teams.map((team) => (
          <div className="team-card" key={team.key}>
            <div className="tc-head">
              <div className={`tc-avatar ${team.avatarCls}`}>{team.icon}</div>
              <div>
                <div className="tc-name">{team.name}</div>
                <div className="tc-role">{team.role}</div>
              </div>
            </div>
            <div className="tc-status">
              <div className="online-dot" />
              Active · Last seen: {team.lastSeen}
            </div>
            <div className="tc-items">
              {team.items.map((item) => (
                <div className="tc-item" key={item.label}>
                  <span style={{ fontSize: 11, flex: 1 }}>{item.label}</span>
                  <span className={`badge ${item.badge}`}>
                    {item.badgeLabel}
                  </span>
                </div>
              ))}
            </div>
            <div className="tc-foot">
              <button
                type="button"
                className="btn-outline"
                style={{ width: "100%", justifyContent: "center" }}
              >
                💬 Send Update
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">💬 Active Coordination Threads</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className="badge badge-amber">{openCount} Open</span>
            <span className="badge badge-green">{resolvedCount} Resolved</span>
          </div>
        </div>

        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            gap: 6,
          }}
        >
          {[
            { key: "all", label: `All (${threads.length})` },
            { key: "open", label: `Open (${openCount})` },
            { key: "resolved", label: `Resolved (${resolvedCount})` },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter-chip${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mep-card-body">
          {filtered.length === 0 ? (
            <div className="no-records">
              <p>No threads match this filter.</p>
            </div>
          ) : (
            filtered.map((thread) => (
              <CoordThread
                key={thread.id}
                thread={thread}
                onResolve={resolveThread}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
