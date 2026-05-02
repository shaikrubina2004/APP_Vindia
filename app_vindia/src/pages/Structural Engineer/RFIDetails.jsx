// FILE PATH: src/pages/RFI/RFIDetailPage.jsx
// Full thread view for a single RFI — works for both sides (raiser + assignee)

import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRFIById, respondToRFI, updateRFIStatus, ROLE_LABELS } from "../../api/rfiApi";
import "./RFI.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PRIORITY_COLOR = {
  critical: "#dc2626", high: "#ea580c", medium: "#ca8a04", low: "#16a34a",
};
const STATUS_STYLE = {
  open:      { bg: "#fff7ed", color: "#c2410c" },
  responded: { bg: "#eff6ff", color: "#1d4ed8" },
  closed:    { bg: "#f0fdf4", color: "#15803d" },
};

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; }
  catch { return {}; }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function RFIDetailPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();
  const user           = getUser();
  const myRole         = user.role || "";

  const [message, setMessage] = useState("");
  const [file,    setFile]    = useState(null);
  const [sending, setSending] = useState(false);
  const [err,     setErr]     = useState("");
  const fileRef = useRef();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["rfi", id],
    queryFn:  () => fetchRFIById(id),
    retry: 1,
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateRFIStatus(id, status),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["rfi", id] }),
  });

  const rfi       = data?.rfi;
  const responses = data?.responses || [];
  const isRaiser  = rfi?.raised_by_role === myRole;
  const ss        = STATUS_STYLE[rfi?.status] || STATUS_STYLE.open;

  const sendReply = async () => {
    if (!message.trim() && !file) {
      setErr("Please enter a message or attach a file.");
      return;
    }
    setSending(true);
    setErr("");
    try {
      const fd = new FormData();
      if (message) fd.append("message", message);
      if (file)    fd.append("file", file);
      await respondToRFI(id, fd);
      setMessage("");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["rfi", id] });
      queryClient.invalidateQueries({ queryKey: ["rfis"] });
    } catch (e) {
      setErr("Failed to send reply. " + e.message);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <div className="rfi-detail-loading">Loading RFI…</div>;
  if (isError || !rfi)
    return <div className="rfi-detail-loading error">⚠️ RFI not found or access denied.</div>;

  return (
    <div className="rfi-detail-page">

      {/* ── BACK ──────────────────────────────────────────────────────── */}
      <button className="rfi-back-btn" onClick={() => navigate(-1)}>
        ← Back to RFIs
      </button>

      {/* ── RFI HEADER CARD ───────────────────────────────────────────── */}
      <div className="rfi-detail-card">
        <div className="rfi-detail-top">
          <div>
            <h2 className="rfi-detail-subject">#{rfi.id} — {rfi.subject}</h2>
            <div className="rfi-detail-meta">
              <span className="rfi-role-chip">
                From: {ROLE_LABELS[rfi.raised_by_role] || rfi.raised_by_role}
                {rfi.raised_by_name ? ` (${rfi.raised_by_name})` : ""}
              </span>
              <span>→</span>
              <span className="rfi-role-chip chip-me">
                To: {ROLE_LABELS[rfi.assigned_to_role] || rfi.assigned_to_role}
              </span>
              {rfi.project_name && <span className="rfi-meta-item">📁 {rfi.project_name}</span>}
              <span className="rfi-meta-item" style={{ color: PRIORITY_COLOR[rfi.priority] }}>
                ● {rfi.priority} priority
              </span>
              <span className="rfi-meta-item" style={{ color: "#9ca3af" }}>
                {new Date(rfi.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Status selector */}
          <select
            className="rfi-status-select large"
            style={{ background: ss.bg, color: ss.color }}
            value={rfi.status}
            onChange={(e) => statusMutation.mutate(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="responded">Responded</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Original description */}
        {rfi.description && (
          <div className="rfi-detail-description">
            <p className="rfi-desc-label">Description</p>
            <p>{rfi.description}</p>
          </div>
        )}
      </div>

      {/* ── THREAD ────────────────────────────────────────────────────── */}
      <div className="rfi-thread-section">
        <h3 className="rfi-thread-title">
          Conversation Thread
          <span className="rfi-thread-count">{responses.length} message{responses.length !== 1 ? "s" : ""}</span>
        </h3>

        {responses.length === 0 && (
          <p className="rfi-no-replies">No replies yet. Be the first to respond.</p>
        )}

        <div className="rfi-thread">
          {responses.map((r) => {
            const isMe = r.responder_role === myRole;
            return (
              <div key={r.id} className={`rfi-bubble-wrap ${isMe ? "me" : "other"}`}>
                <div className={`rfi-bubble ${isMe ? "bubble-me" : "bubble-other"}`}>
                  <div className="rfi-bubble-header">
                    <strong>{ROLE_LABELS[r.responder_role] || r.responder_role}</strong>
                    {r.responder_name && <span className="rfi-bubble-name">({r.responder_name})</span>}
                    <span className="rfi-bubble-time">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="rfi-bubble-msg">{r.message}</p>
                  {r.file_url && (
                    <a
                      href={`${BASE}${r.file_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rfi-file-link"
                    >
                      📎 {r.file_name || "Download attachment"}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── REPLY BOX ─────────────────────────────────────────────────── */}
      {rfi.status !== "closed" && (
        <div className="rfi-reply-box">
          <h3 className="rfi-reply-title">
            {isRaiser ? "Add Follow-up" : "Reply to RFI"}
          </h3>

          {err && <p className="rfi-modal-error">{err}</p>}

          <textarea
            className="rfi-reply-textarea"
            rows={4}
            placeholder={
              isRaiser
                ? "Add more context, clarify, or follow up…"
                : "Provide your response, reference drawing numbers, specs, etc…"
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="rfi-reply-actions">
            {/* File attach */}
            <div className="rfi-file-area small" onClick={() => fileRef.current.click()}>
              {file ? <span>📎 {file.name}</span> : <span>📎 Attach file (optional)</span>}
              <input ref={fileRef} type="file" style={{ display: "none" }}
                     onChange={(e) => setFile(e.target.files[0])} />
            </div>
            {file && (
              <button className="rfi-remove-file" onClick={() => setFile(null)}>✕</button>
            )}

            <div style={{ flex: 1 }} />

            <button className="rfi-btn-primary" onClick={sendReply} disabled={sending}>
              {sending ? "Sending…" : isRaiser ? "Add Follow-up →" : "Send Reply →"}
            </button>
          </div>
        </div>
      )}

      {rfi.status === "closed" && (
        <div className="rfi-closed-banner">
          ✅ This RFI is closed. Reopen it to add more replies.
          <button className="rfi-btn-outline small"
                  onClick={() => statusMutation.mutate("open")}>
            Reopen
          </button>
        </div>
      )}
    </div>
  );
}