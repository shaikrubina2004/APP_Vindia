import { useState } from "react";
import "../../styles/MEPEngineer.css";

const TEAMS = [
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
];

const INITIAL_THREADS = [
  {
    id: 1,
    title: "🏗️ MEP-Structural: Beam B-14 clash resolution — Level 3",
    teams: [
      { cls: "badge-purple", label: "Structural" },
      { cls: "badge-mep-m", label: "MEP" },
    ],
    count: 3,
    messages: [
      {
        av: "av-struct",
        initials: "SE",
        name: "Structural Eng",
        time: "Today 11:00 AM",
        text: "New beam layout uploaded — Beam B-14 has moved 200mm east. Please check if your pipe route is still conflicting.",
      },
      {
        av: "av-me",
        initials: "ME",
        name: "MEP Engineer (You)",
        time: "Today 09:15 AM",
        text: "Checked — conflict still exists at our 100mm CW main. Raising incident #INC-041. We need a 300mm clear passage minimum.",
        isMine: true,
      },
      {
        av: "av-struct",
        initials: "SE",
        name: "Structural Eng",
        time: "Today 09:30 AM",
        text: "Understood. Will discuss with design team. Can we schedule a call this afternoon?",
      },
    ],
  },
  {
    id: 2,
    title: "🏛️ MEP-Architect: Floor Plan Rev4 — MEP compatibility check",
    teams: [
      { cls: "badge-blue", label: "Architect" },
      { cls: "badge-mep-m", label: "MEP" },
    ],
    count: 2,
    messages: [
      {
        av: "av-arch",
        initials: "AR",
        name: "Architect",
        time: "Today 08:45 AM",
        text: "Floor Plan Rev4 has been uploaded. Key change — toilet block on Level 2 moved 1.5m north. Please review your plumbing layout for compatibility.",
      },
      {
        av: "av-me",
        initials: "ME",
        name: "MEP Engineer (You)",
        time: "Today 09:00 AM",
        text: "Noted. Will review plumbing drawing and update by end of day. The waste pipe slope may be affected — will confirm after assessment.",
        isMine: true,
      },
    ],
  },
];

/* ─── Thread component ─── */
function CoordThread({ thread }) {
  const [messages, setMessages] = useState(thread.messages);
  const [reply, setReply] = useState("");

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
        isMine: true,
      },
    ]);
    setReply("");
  };

  return (
    <div className="coord-thread">
      <div className="ct-head">
        <div className="ct-title">{thread.title}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {thread.teams.map((t) => (
            <span key={t.label} className={`badge ${t.cls}`}>
              {t.label}
            </span>
          ))}
        </div>
        <span className="ct-meta" style={{ marginLeft: 10 }}>
          {thread.count} messages
        </span>
      </div>
      <div className="ct-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg${m.isMine ? " me" : ""}`}>
            <div className={`msg-av ${m.av}`}>{m.initials}</div>
            <div style={{ flex: 1 }}>
              <div className="msg-bubble">{m.text}</div>
              <div className="msg-meta">
                {m.name} · {m.time}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="reply-box">
        <input
          className="reply-input"
          type="text"
          placeholder={`Reply to ${thread.teams[0].label}...`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="reply-send" onClick={send}>
          ➤
        </button>
      </div>
    </div>
  );
}

export default function MEPCoordination() {
  return (
    <div className="mep-page">
      {/* ── TOP BAR ── */}
      <div className="mep-topbar">
        <div className="mep-topbar-left">
          <h1>Cross-Team Coordination</h1>
          <p>
            Architect · Structural · Design Integration — MEP compatibility
            tracking
          </p>
        </div>
        <div className="mep-topbar-right">
          <button className="btn btn-primary">+ New Coordination Thread</button>
        </div>
      </div>

      {/* ── TEAM PANELS ── */}
      <div className="team-grid">
        {TEAMS.map((team) => (
          <div className="team-card" key={team.key}>
            <div className="tc-head">
              <div
                className={`tc-avatar ${team.avatarCls}`}
                style={{ background: undefined }}
              >
                {team.icon}
              </div>
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
                  <span style={{ fontSize: 12, flex: 1 }}>{item.label}</span>
                  <span
                    className={`badge ${item.badge}`}
                    style={{ fontSize: 9 }}
                  >
                    {item.badgeLabel}
                  </span>
                </div>
              ))}
            </div>
            <div className="tc-foot">
              <button
                className="btn btn-outline"
                style={{ width: "100%", justifyContent: "center" }}
              >
                💬 Send Update
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── COORDINATION THREADS ── */}
      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">💬 Active Coordination Threads</span>
          <span className="badge badge-amber">3 Open</span>
        </div>
        <div className="mep-card-body">
          {INITIAL_THREADS.map((thread) => (
            <CoordThread key={thread.id} thread={thread} />
          ))}
        </div>
      </div>
    </div>
  );
}
