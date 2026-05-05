import { useState, useEffect } from "react";
import { useProject } from "../../context/ProjectContext";
import { API } from "../../services/authService";
import ProjectSwitcher from "../../components/project/ProjectSwitcher";
import "../../styles/MEPEngineer.css";

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

const STATUS_INFO = {
  open: { label: "Open", pill: "pill-open" },
  awaiting: { label: "Awaiting Reply", pill: "pill-inprog" },
  resolved: { label: "Resolved", pill: "pill-resolved" },
};

const ROLE_MAP = {
  arch: "architect",
  struct: "structural_engineer",
  coord: "project_coordinator",
  qs: "quantity_surveyor",
  site: "site_engineer",
};

const DISC_TO_SUBDISCIPLINES = {
  MEP: ["Mechanical", "Electrical", "Plumbing"],
  ARCH: ["Architectural"],
  STR: ["Structural"],
};

// DB role → badge class
const ROLE_BADGE = {
  architect: "badge-blue",
  structural_engineer: "badge-purple",
  project_coordinator: "badge-green",
  quantity_surveyor: "badge-blue",
  site_engineer: "badge-blue",
  mep_engineer: "badge-mep-m",
};

// DB role → display label
const ROLE_LABEL = {
  architect: "Architect",
  structural_engineer: "Structural",
  project_coordinator: "Coordinator",
  quantity_surveyor: "QS",
  site_engineer: "Site Eng",
  mep_engineer: "MEP",
};

const PRIORITY_BADGE = {
  High: "badge-red",
  Medium: "badge-amber",
  Low: "badge-grey",
};

/* ── Inline New Thread Form ───────────────────────── */
function NewThreadForm({
  onClose,
  onAdd,
  projectName,
  drawingsList,
  activeProjectId,
}) {
  const [subject, setSubject] = useState("");
  const [drawingDisc, setDrawingDisc] = useState(""); // MEP | ARCH | STR
  const [subDisc, setSubDisc] = useState(""); // Mechanical | Electrical etc
  const [drawing, setDrawing] = useState(""); // UUID
  const [relatedClash, setRelatedClash] = useState(null); // auto-filled clash
  const [priority, setPriority] = useState("Medium");
  const [note, setNote] = useState("");

  // participants: { [roleKey]: { selected: bool, users: [], pickedUserId: "" } }
  const [participants, setParticipants] = useState(() => {
    const init = {};
    TEAM_OPTIONS.forEach((t) => {
      init[t.key] = { selected: false, users: [], pickedUserId: "" };
    });
    return init;
  });

  // When a role is toggled on → fetch users for that role in this project
  const toggleRole = async (key) => {
    const isNowSelected = !participants[key].selected;
    setParticipants((p) => ({
      ...p,
      [key]: { ...p[key], selected: isNowSelected },
    }));

    if (isNowSelected && participants[key].users.length === 0) {
      try {
        const res = await API.get(
          `/drawings/members/${activeProjectId}?role=${ROLE_MAP[key]}`,
        );
        setParticipants((p) => ({
          ...p,
          [key]: {
            ...p[key],
            users: res.data,
            pickedUserId: res.data[0]?.id || "",
          },
        }));
      } catch {
        // ignore
      }
    }
  };

  const setPickedUser = (key, userId) => {
    setParticipants((p) => ({
      ...p,
      [key]: { ...p[key], pickedUserId: userId },
    }));
  };

  // Filter drawings by drawingDisc + subDisc
  const filteredDrawings = drawingsList.filter((d) => {
    if (!drawingDisc) return false;
    if (drawingDisc && !subDisc) return d.discipline === drawingDisc;
    return d.discipline === drawingDisc && d.sub_discipline === subDisc;
  });

  // When drawing is selected → auto-fetch latest open clash
  const handleDrawingChange = async (drawingId) => {
    setDrawing(drawingId);
    setRelatedClash(null);
    if (!drawingId) return;
    try {
      const res = await API.get(`/drawings/clash-latest/${drawingId}`);
      if (res.data) setRelatedClash(res.data);
    } catch {
      // no clash found — that's fine
    }
  };

  const anyParticipant = Object.values(participants).some((p) => p.selected);
  const canSubmit = subject.trim() !== "" && anyParticipant;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const selectedParticipants = TEAM_OPTIONS.filter(
        (t) => participants[t.key].selected,
      ).map((t) => ({
        role: ROLE_MAP[t.key],
        user_id: participants[t.key].pickedUserId || null,
      }));

      await onAdd({
        title: subject,
        discipline: subDisc || drawingDisc || null,
        priority,
        drawing_id: drawing || null,
        clash_id: relatedClash?.id || null,
        opening_note: note.trim(),
        participants: selectedParticipants,
      });
      onClose();
    } catch (err) {
      alert(
        "Failed to create thread: " +
          (err.response?.data?.error ?? err.message),
      );
    }
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
        {/* Subject */}
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

        {/* Priority */}
        <div className="form-row">
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
        </div>

        {/* Drawing — 3-step filter */}
        <div
          style={{
            background: "var(--bg-light)",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 10,
              color: "var(--text-secondary)",
              letterSpacing: 1,
            }}
          >
            RELATED DRAWING (OPTIONAL)
          </div>
          <div className="form-row" style={{ gap: 8 }}>
            {/* Step 1 — Discipline */}
            <div className="form-group">
              <label>Discipline</label>
              <select
                className="form-select"
                value={drawingDisc}
                onChange={(e) => {
                  setDrawingDisc(e.target.value);
                  setSubDisc("");
                  setDrawing("");
                  setRelatedClash(null);
                }}
              >
                <option value="">Select discipline</option>
                <option value="MEP">MEP</option>
                <option value="ARCH">Architectural</option>
                <option value="STR">Structural</option>
              </select>
            </div>

            {/* Step 2 — Sub-discipline */}
            <div className="form-group">
              <label>Sub-discipline</label>
              <select
                className="form-select"
                value={subDisc}
                onChange={(e) => {
                  setSubDisc(e.target.value);
                  setDrawing("");
                  setRelatedClash(null);
                }}
                disabled={!drawingDisc}
              >
                <option value="">Select sub-discipline</option>
                {(DISC_TO_SUBDISCIPLINES[drawingDisc] || []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3 — Drawing */}
            <div className="form-group">
              <label>Drawing</label>
              <select
                className="form-select"
                value={drawing}
                onChange={(e) => handleDrawingChange(e.target.value)}
                disabled={!subDisc}
              >
                <option value="">Select drawing</option>
                {filteredDrawings.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.revision_number || d.rev || "—"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-filled clash */}
          {relatedClash && (
            <div
              className="alert alert-red"
              style={{
                marginTop: 10,
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <span className="alert-icon">🚩</span>
                <strong> {relatedClash.clash_no}</strong> —{" "}
                {relatedClash.clash_type}
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginTop: 3,
                  }}
                >
                  {relatedClash.description}
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 11, padding: "2px 8px", flexShrink: 0 }}
                onClick={() => setRelatedClash(null)}
              >
                ✕ Clear
              </button>
            </div>
          )}
          {drawing && !relatedClash && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 8,
              }}
            >
              ✓ No open clashes on this drawing
            </div>
          )}
        </div>

        {/* Participants — role toggle + user picker */}
        <div className="form-group">
          <label>
            Participants <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TEAM_OPTIONS.map((t) => {
              const p = participants[t.key];
              return (
                <div key={t.key}>
                  <div
                    className="notify-item"
                    onClick={() => toggleRole(t.key)}
                    style={{
                      cursor: "pointer",
                      borderColor: p.selected
                        ? "var(--primary-blue)"
                        : undefined,
                      background: p.selected
                        ? "rgba(30,90,150,0.05)"
                        : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={p.selected}
                      style={{
                        width: 14,
                        height: 14,
                        accentColor: "var(--primary-blue)",
                        flexShrink: 0,
                        pointerEvents: "none",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="notify-team">{t.label}</div>
                      <div className="notify-role">{t.role}</div>
                    </div>
                  </div>

                  {/* User picker — shows only when role is selected */}
                  {p.selected && (
                    <div style={{ marginTop: 6, marginLeft: 24 }}>
                      {p.users.length === 0 ? (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-secondary)",
                          }}
                        >
                          Loading users…
                        </div>
                      ) : (
                        <select
                          className="form-select"
                          value={p.pickedUserId}
                          onChange={(e) => setPickedUser(t.key, e.target.value)}
                          style={{ fontSize: 12 }}
                        >
                          {p.users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Opening note */}
        <div className="form-group">
          <label>Opening Note</label>
          <textarea
            className="form-textarea"
            placeholder="Describe the coordination issue and what needs to be resolved..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {!canSubmit && (subject || anyParticipant) && (
          <div className="alert alert-amber" style={{ padding: "8px 12px" }}>
            <span className="alert-icon">⚠️</span>
            <span>
              Please fill in Subject and select at least one Participant.
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
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onResolve(thread.id, text.trim());
      onClose();
    } catch (err) {
      alert("Failed to resolve: " + (err.response?.data?.error ?? err.message));
    } finally {
      setSaving(false);
    }
  };

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
            opacity: text.trim() && !saving ? 1 : 0.5,
          }}
          onClick={confirm}
        >
          {saving ? "Saving…" : "✅ Confirm Resolution"}
        </button>
      </div>
    </div>
  );
}

/* ── Single Thread ────────────────────────────────── */
function CoordThread({ thread, onResolve }) {
  const [messages, setMessages] = useState(thread.messages || []);
  const [reply, setReply] = useState("");
  const [isDecision, setIsDecision] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [sending, setSending] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [agreementCount, setAgreementCount] = useState(
    thread.agreement_count || 0,
  );
  const [participantCount, setParticipantCount] = useState(
    thread.participant_count || 0,
  );
  const [hasAgreed, setHasAgreed] = useState(false);
  const [agreeing, setAgreeing] = useState(false);

  useEffect(() => {
    if (!expanded || messagesLoaded || !thread.id) return;
    API.get(`/drawings/threads/${thread.id}`)
      .then((res) => {
        const msgs = (res.data.messages || []).map((m) => ({
          av: m.author_id === res.data.created_by_id ? "av-me" : "av-other",
          initials: m.author_name?.slice(0, 2).toUpperCase() || "??",
          name: m.author_name || "Unknown",
          time: new Date(m.created_at).toLocaleString("en", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          text: m.body,
          isDecision: m.is_decision,
          isMine: false, // backend doesn't know current user here; good enough
        }));
        setMessages(msgs);
        setMessagesLoaded(true);
      })
      .catch((err) => console.error("Failed to load messages:", err));
  }, [expanded]);
  const statusInfo = STATUS_INFO[thread.status] || STATUS_INFO.open;
  const discIcon =
    thread.disc === "Mechanical"
      ? "🔧"
      : thread.disc === "Electrical"
        ? "⚡"
        : thread.disc === "Plumbing"
          ? "🚿"
          : "📋";

  const agreeToClose = async () => {
    if (agreeing || hasAgreed) return;
    setAgreeing(true);
    try {
      const res = await API.post(`/drawings/threads/${thread.id}/agree`);
      setAgreementCount(Number(res.data.agreement_count));
      setParticipantCount(Number(res.data.participant_count));
      setHasAgreed(true);
      // if all agreed the thread is now resolved — update status via parent
      if (res.data.status === "resolved") {
        onResolve(thread.id, "__auto__");
      }
    } catch (err) {
      alert("Failed: " + (err.response?.data?.error ?? err.message));
    } finally {
      setAgreeing(false);
    }
  };

  const send = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await API.post(`/drawings/threads/${thread.id}/messages`, {
        body: reply.trim(),
        is_decision: isDecision,
      });
      setMessages((prev) => [
        ...prev,
        {
          av: "av-me",
          initials: "ME",
          name: res.data.author_name || "MEP Engineer (You)",
          time: "Just now",
          text: res.data.body,
          isDecision: res.data.is_decision,
          isMine: true,
        },
      ]);
      setReply("");
      setIsDecision(false);
    } catch (err) {
      alert("Failed to send: " + (err.response?.data?.error ?? err.message));
    } finally {
      setSending(false);
    }
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
        <span className="ct-meta">
          {messages.length || thread.message_count} msgs
        </span>{" "}
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

          {thread.status !== "resolved" && (
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

          {/* Agreement progress bar */}
          {thread.status !== "resolved" && participantCount > 0 && (
            <div
              style={{
                padding: "10px 14px",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontWeight: 600 }}>🤝 Close Agreement</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {agreementCount} of {participantCount} participants agreed
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "var(--border-color)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${participantCount > 0 ? (agreementCount / participantCount) * 100 : 0}%`,
                    background: "var(--primary-blue)",
                    borderRadius: 4,
                    transition: "width 0.3s",
                  }}
                />
              </div>
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
              {thread.status !== "resolved" && (
                <button
                  type="button"
                  className={hasAgreed ? "btn-primary" : "btn-outline"}
                  style={{
                    fontSize: 11,
                    padding: "5px 11px",
                    opacity: hasAgreed || agreeing ? 0.6 : 1,
                    cursor: hasAgreed ? "not-allowed" : "pointer",
                  }}
                  onClick={agreeToClose}
                  disabled={hasAgreed || agreeing}
                >
                  {hasAgreed
                    ? "✅ You Agreed"
                    : agreeing
                      ? "Saving…"
                      : "🤝 Agree to Close"}
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
  const [threads, setThreads] = useState([]);
  const [drawingsList, setDrawingsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");

  // fetch threads and drawings when project changes
  useEffect(() => {
    if (!activeProject) return;
    setFilter("all");
    setShowForm(false);
    setThreads([]);

    const fetchData = async () => {
      setLoading(true);
      try {
        const [threadsRes, drawingsRes] = await Promise.all([
          API.get(`/drawings/threads/project/${activeProject.id}`),
          API.get(`/drawings/project/${activeProject.id}`),
        ]);

        // normalize threads from DB shape → component shape
        const normalized = threadsRes.data.map((t) => {
          // participants from DB is json_agg → array of {role, user_id, user_name}
          // or it could be a plain array of strings from older data — handle both
          const rawParticipants = (() => {
            if (!t.participants) return [];
            // postgres json_agg comes back as already-parsed array
            if (Array.isArray(t.participants)) return t.participants;
            // sometimes it comes as a JSON string
            try {
              return JSON.parse(t.participants);
            } catch {
              return [];
            }
          })();

          return {
            id: t.id,
            title: t.title,
            teams: [
              ...rawParticipants.map((p) => {
                const role = typeof p === "string" ? p : p.role;
                return {
                  cls: ROLE_BADGE[role] || "badge-blue",
                  label: ROLE_LABEL[role] || role,
                };
              }),
              {
                cls: PRIORITY_BADGE[t.priority] || "badge-grey",
                label: t.priority,
              },
            ],
            drawing: t.drawing_name || "—",
            drawing_id: t.drawing_id,
            disc: t.discipline,
            priority: t.priority,
            status: t.status,
            resolution: t.resolution,
            messages: [],
            message_count: Number(t.message_count),
            agreement_count: Number(t.agreement_count || 0),
            participant_count: Number(t.participant_count || 0),
            agreed_user_ids: t.agreed_user_ids || [],
          };
        });

        setThreads(normalized);
        setDrawingsList(drawingsRes.data);
      } catch (err) {
        console.error("Failed to load coordination data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeProject?.id]);
  const addThread = async (payload) => {
    const res = await API.post("/drawings/threads", {
      ...payload,
      project_id: activeProject.id,
    });
    const t = res.data;
    // add to top of list with empty messages
    setThreads((prev) => [
      {
        id: t.id,
        title: t.title,
        teams: [
          ...(payload.participants || []).map((p) => {
            // payload.participants is array of {role, user_id}
            const role = typeof p === "string" ? p : p.role;
            return {
              cls: ROLE_BADGE[role] || "badge-blue",
              label: ROLE_LABEL[role] || role,
            };
          }),
          {
            cls: PRIORITY_BADGE[t.priority] || "badge-grey",
            label: t.priority,
          },
        ],
        drawing: "—",
        drawing_id: t.drawing_id,
        disc: t.discipline,
        priority: t.priority,
        status: t.status,
        resolution: null,
        messages: [],
        message_count: 0,
        agreement_count: 0,
        participant_count: payload.participants?.length || 0,
        agreed_user_ids: [],
      },
      ...prev,
    ]);
    setShowForm(false);
  };

  const resolveThread = async (id, resolution) => {
    // "__auto__" means trigger already resolved it — just update local state
    if (resolution !== "__auto__") {
      await API.put(`/drawings/threads/${id}/resolve`, { resolution });
    }
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "resolved",
              resolution:
                resolution === "__auto__"
                  ? "Resolved by unanimous agreement"
                  : resolution,
            }
          : t,
      ),
    );
  };

  const openCount = threads.filter((t) => t.status !== "resolved").length;
  const resolvedCount = threads.filter((t) => t.status === "resolved").length;

  const filtered = threads.filter((t) => {
    if (filter === "open") return t.status !== "resolved";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  if (!activeProject) return null;

  if (loading) {
    return (
      <div className="mep-page">
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          Loading coordination threads…
        </div>
      </div>
    );
  }

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
          activeProjectId={activeProject.id}
        />
      )}

      <div className="team-grid">
        {(TEAMS[activeProject.id] || []).map((team) => (
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
