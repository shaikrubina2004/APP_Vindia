import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import "./PreferredTimeReminder.css";

const API = "http://localhost:5000/api";
const POLL_MS   = 30000;            // look for due reminders every 30 s
const keyOf = (r) => `${r.reminder_kind || "preferred"}-${r.id}`;
const SNOOZE_MS = 10 * 60 * 1000;   // "Remind me later" = 10 minutes

const LEAD_TYPE_STYLE = {
  hot:  { bg: "#fef2f2", color: "#dc2626" },
  warm: { bg: "#fff7ed", color: "#ea580c" },
  cold: { bg: "#eff6ff", color: "#2563eb" },
};

const allDescriptions = (lead) => {
  const out = [];
  if (lead.description && String(lead.description).trim()) out.push(String(lead.description).trim());
  (Array.isArray(lead.description_notes) ? lead.description_notes : []).forEach(n => {
    if (n && n.text && String(n.text).trim()) out.push(String(n.text).trim());
  });
  return out;
};

/**
 * Pop-up for two kinds of reminders (the server tells which one in `reminder_kind`):
 *   "preferred" — the lead's Preferred Call Time slot has started
 *   "snooze"    — the BDA pressed Snooze on the Follow Up page (1 or 2 hours ago)
 *
 *   <PreferredTimeReminder email={email} name={name} enabled={!isCEO}
 *                          onOpenLead={(id) => ...} />
 *
 * It is self-contained — mount it once on any BDA page (Leads, Follow-up,
 * Dashboard, or the BDA layout so it works everywhere).
 */
export default function PreferredTimeReminder({ email, name, enabled = true, onOpenLead }) {
  const [queue, setQueue]   = useState([]);
  const snoozedRef = useRef({});     // { leadId: timestamp until which it is hidden }
  const busyRef    = useRef(false);

  const check = useCallback(async () => {
    if (!enabled || (!email && !name) || busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await axios.get(`${API}/leads/reminders/due`, { params: { email, name } });
      const now = Date.now();
      const due = (res.data.reminders || []).filter(r => (snoozedRef.current[keyOf(r)] || 0) <= now);
      setQueue(due);
    } catch (_) { /* silent — a missed poll must never disturb the page */ }
    finally { busyRef.current = false; }
  }, [email, name, enabled]);

  useEffect(() => {
    if (!enabled) return;
    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [check, enabled]);

  const current = queue[0];
  if (!enabled || !current) return null;

  const isSnooze = current.reminder_kind === "snooze";
  const drop = () => setQueue(q => q.slice(1));

  const dismiss = async () => {
    drop();
    try {
      await axios.put(`${API}/leads/${current.id}/ack-preferred-time`, { kind: current.reminder_kind || "preferred" });
    } catch (_) {}
  };
  // "Remind me later": a snoozed reminder is snoozed again on the server (1 hour);
  // a preferred-time reminder is only hidden here for 10 minutes.
  const snooze = async () => {
    if (isSnooze) {
      drop();
      try { await axios.put(`${API}/leads/${current.id}/snooze-reminder`, { minutes: 60 }); } catch (_) {}
      return;
    }
    snoozedRef.current[keyOf(current)] = Date.now() + SNOOZE_MS;
    drop();
  };
  const open = async () => {
    onOpenLead && onOpenLead(current.id);
    await dismiss();
  };

  const lt    = (current.lead_type || "").toLowerCase();
  const style = LEAD_TYPE_STYLE[lt];
  const descs = allDescriptions(current);
  const day   = current.preferred_call_time
    ? new Date(current.preferred_call_time).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })
    : "";
  const when  = [day, current.preferred_call_slot].filter(Boolean).join(" · ");

  return createPortal(
    <div className="ptr-overlay">
      <div className="ptr-card" role="alertdialog" aria-label="Call reminder">
        <div className="ptr-head">
          <div className="ptr-head__text">
            <p className="ptr-kicker">{isSnooze ? "Reminder" : "Time to call"}</p>
            <h3 className="ptr-name">{current.name}</h3>
          </div>
          {queue.length > 1 && <span className="ptr-more">+{queue.length - 1} more</span>}
        </div>

        <div className="ptr-body">
          {isSnooze && (
            <p className="ptr-intro">You asked to be reminded about this lead. Call or check on it now.</p>
          )}
          <div className="ptr-row">
            <span className="ptr-label">Phone</span>
            <a className="ptr-phone" href={`tel:${current.phone}`}>{current.phone}</a>
          </div>
          <div className="ptr-row">
            <span className="ptr-label">Preferred</span>
            <span className="ptr-val">
              {current.preferred_call_type || "Call"}{!isSnooze && when ? ` · ${when}` : ""}
            </span>
          </div>
          {(current.lead_type || current.city || current.status) && (
            <div className="ptr-row">
              <span className="ptr-label">Lead</span>
              <span className="ptr-val ptr-pills">
                {style && <span className="ptr-pill" style={{ background: style.bg, color: style.color }}>{current.lead_type}</span>}
                {current.status && <span className="ptr-pill ptr-pill--grey">{current.status}</span>}
                {current.city && <span className="ptr-val">{current.city}</span>}
              </span>
            </div>
          )}

          <div className="ptr-desc">
            <span className="ptr-label">Description</span>
            {descs.length === 0 ? (
              <p className="ptr-desc__empty">No description added.</p>
            ) : (
              <ol className="ptr-desc__list">
                {descs.map((d, i) => <li key={i}>{d}</li>)}
              </ol>
            )}
          </div>
        </div>

        <div className="ptr-foot">
          <button className="ptr-btn ptr-btn--ghost" onClick={snooze}>{isSnooze ? "Snooze 1 more hour" : "Remind me in 10 min"}</button>
          {onOpenLead && <button className="ptr-btn ptr-btn--ghost" onClick={open}>Open Follow Up</button>}
          <button className="ptr-btn ptr-btn--primary" onClick={dismiss}>Got it</button>
        </div>
      </div>
    </div>,
    document.body
  );
}