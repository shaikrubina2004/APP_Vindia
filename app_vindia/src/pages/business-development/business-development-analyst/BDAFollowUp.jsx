import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/useAuth";
import "./BDAFollowUp.css";

const API = "http://localhost:5000/api";

const STATUSES     = ["New","Interested","Follow Up","Converted","Not Interested","Contacted","Junk"];
const SET_NUMBERS  = [1,2,3,4,5,6,7,8,9,10];

/* Preferred call slots — same list as the Leads → Edit window.
   The pop-up reminder fires when the chosen slot STARTS (India time). */
const CALL_SLOTS = [
  { label: "7 AM – 9 AM",   start: "07:00" },
  { label: "9 AM – 11 AM",  start: "09:00" },
  { label: "11 AM – 1 PM",  start: "11:00" },
  { label: "1 PM – 3 PM",   start: "13:00" },
  { label: "3 PM – 5 PM",   start: "15:00" },
  { label: "5 PM – 7 PM",   start: "17:00" },
  { label: "7 PM – 9 PM",   start: "19:00" },
];

/* ─── dates: everything is read and shown in India time (IST) ─── */
const IST = "Asia/Kolkata";

const istDay   = (d) => (d ? new Date(d).toLocaleDateString("en-CA", { timeZone: IST }) : ""); // YYYY-MM-DD
const todayIST = () => istDay(new Date());

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric", timeZone: IST });
}
function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone: IST });
}
const isToday    = (d) => !!d && istDay(d) === todayIST();
const isOverdue  = (d) => !!d && istDay(d) <  todayIST();
const isUpcoming = (d) => !!d && istDay(d) >  todayIST();
const daysOverdue = (d) => Math.round((Date.parse(todayIST()) - Date.parse(istDay(d))) / 86400000);

/** next call date + slot -> the exact moment (ISO) the reminder should fire */
const slotStartISO = (dateStr, slotLabel) => {
  const slot = CALL_SLOTS.find(x => x.label === slotLabel);
  if (!dateStr || !slot) return "";
  return new Date(`${dateStr}T${slot.start}:00+05:30`).toISOString();
};

/* ─── lead helpers ─── */
const isDeleteRequested = (l) =>
  ["delete_requested", "junk_requested"].includes((l?.status || "").toLowerCase());

/** Sets already sent (sorted numbers) — column is photo_sets_sent or design_sets_sent */
const getSentSets = (lead, column) => {
  const raw = lead?.[column];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(Number).filter(n => n >= 1 && n <= 10))].sort((a, b) => a - b);
};
const nextUnsent = (sent) => SET_NUMBERS.find(n => !sent.includes(n)) || null;

/** Every description the lead has, oldest first (old single `description` column first) */
const getSavedDescriptions = (lead) => {
  const list = [];
  if (lead?.description && String(lead.description).trim())
    list.push({ text: String(lead.description).trim(), by: null, at: null });
  (Array.isArray(lead?.description_notes) ? lead.description_notes : []).forEach(n => {
    if (n && n.text && String(n.text).trim()) list.push(n);
  });
  return list;
};
const noteMeta = (n) => {
  const parts = [];
  if (n.by) parts.push(n.by);
  if (n.at) parts.push(new Date(n.at).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", timeZone: IST }));
  return parts.join(" · ");
};

const LEAD_TYPE_STYLE = {
  hot:  { bg:"#fef2f2", color:"#dc2626" },
  warm: { bg:"#fff7ed", color:"#ea580c" },
  cold: { bg:"#eff6ff", color:"#2563eb" },
};

const StatusPill = ({ status }) => {
  const map = {
    new:             { bg:"#eff6ff", color:"#2563eb" },
    interested:      { bg:"#fdf4ff", color:"#7c3aed" },
    "follow up":     { bg:"#fff7ed", color:"#ea580c" },
    converted:       { bg:"#f0fdf4", color:"#16a34a" },
    contacted:       { bg:"#ecfdf5", color:"#059669" },
    "not interested":{ bg:"#f8fafc", color:"#64748b" },
    junk:            { bg:"#fef2f2", color:"#dc2626" },
  };
  const cfg = map[(status||"").toLowerCase()] || { bg:"#f1f5f9", color:"#475569" };
  return <span className="fu-pill" style={{ background:cfg.bg, color:cfg.color }}>{status||"—"}</span>;
};

const LeadTypePill = ({ type }) => {
  const st = LEAD_TYPE_STYLE[(type || "").toLowerCase()];
  if (!st) return null;
  return <span className="fu-pill" style={{ background:st.bg, color:st.color }}>{type}</span>;
};

/* ─── small line icons (no emojis) ─── */
const ICONS = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  alert:    <><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>,
  bell:     <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
  list:     <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
  pin:      <><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  phone:    <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></>,
  search:   <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  inbox:    <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/></>,
  check:    <><path d="M20 6L9 17l-5-5"/></>,
};
const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("") || "?";

const Sk = () => <div className="fu-sk" />;

/* ════════════════════════════════════════
   SET PICKER  (Photo Set / Design Set)
   A number that was already sent is greyed out and can't be chosen again.
════════════════════════════════════════ */
const SetPicker = ({ label, prefix, sent, value, onChange }) => {
  const next = nextUnsent(sent);
  return (
    <div className="fu-field">
      <label className="fu-label">{label}</label>
      <select className="fu-input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select {prefix.toLowerCase()} to mark as sent</option>
        {SET_NUMBERS.map(n => {
          const done = sent.includes(n);
          return (
            <option key={n} value={n} disabled={done}>
              {prefix} {n}{done ? "  (already sent)" : ""}
            </option>
          );
        })}
      </select>
      {sent.length > 0 ? (
        <div className="fu-setchips">
          <span className="fu-setchips__label">Sent:</span>
          {sent.map(n => <span key={n} className="fu-setchip">{prefix} {n}</span>)}
          {next
            ? <span className="fu-setnext">Next: {prefix} {next}</span>
            : <span className="fu-setnext">All {SET_NUMBERS.length} sent</span>}
        </div>
      ) : (
        <p className="fu-hint">Nothing sent yet — start with {prefix} 1.</p>
      )}
    </div>
  );
};

/* ════════════════════════════════════════
   READ-ONLY LEAD DETAILS  (everything collected so far)
════════════════════════════════════════ */
const Detail = ({ label, value }) => (
  <div className="fu-detail">
    <span className="fu-detail__label">{label}</span>
    <span className="fu-detail__value">{value || "—"}</span>
  </div>
);

const LeadDetails = ({ lead }) => (
  <div className="fu-details">
    <p className="fu-section-title">Lead details</p>
    <div className="fu-details__grid">
      <Detail label="Email"          value={lead.email} />
      <Detail label="WhatsApp"       value={lead.whatsapp} />
      <Detail label="City"           value={lead.city} />
      <Detail label="Lead Type"      value={lead.lead_type} />
      <Detail label="Call Status"    value={lead.call_status} />
      <Detail label="Preferred Call" value={lead.preferred_call_type} />
      <Detail label="Building Type"  value={lead.building_type} />
      <Detail label="Floors"         value={lead.floors} />
      <Detail label="Plot Size"      value={lead.measurement} />
      <Detail label="Sq. Ft"         value={lead.sqft} />
      <Detail label="Budget"         value={lead.budget ? `₹${Number(lead.budget).toLocaleString("en-IN")}` : null} />
      <Detail label="Quotation Sent" value={lead.quotation_sent === true ? "Yes" : lead.quotation_sent === false ? "No" : null} />
    </div>
  </div>
);

/* ════════════════════════════════════════
   FOLLOW-UP MODAL
   • all collected data is shown
   • Next Call Date + Preferred Call Time slot
   • Photo Set / Design Set — a number can only be sent once
   • Description — read-only: shows what was written in Leads → Edit
   • Snooze — remind me about this lead again in 1 or 2 hours
════════════════════════════════════════ */
const FollowUpModal = ({ lead, bdaName, bdaEmail, onClose, onSaved, onSnoozed }) => {
  const futureDate = isUpcoming(lead.snooze_until) ? istDay(lead.snooze_until) : "";

  const [note, setNote]         = useState("");
  const [status, setStatus]     = useState(lead.status || "");
  const [nextDate, setNextDate] = useState(futureDate);
  const [slot, setSlot]         = useState(futureDate ? (lead.preferred_call_slot || "") : "");
  const [photoSet, setPhotoSet]   = useState("");
  const [designSet, setDesignSet] = useState("");
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const sentPhoto  = useMemo(() => getSentSets(lead, "photo_sets_sent"),  [lead]);
  const sentDesign = useMemo(() => getSentSets(lead, "design_sets_sent"), [lead]);
  const savedDescs = useMemo(() => getSavedDescriptions(lead), [lead]);

  const locking = [
    photoSet  !== "" && `Photo Set ${photoSet}`,
    designSet !== "" && `Design ${designSet}`,
  ].filter(Boolean);

  const handleSave = async () => {
    if (slot && !nextDate) { setErr("Pick the Next Call Date for the time slot you chose."); return; }

    // The follow-up needs a note. If the BDA only sent a set,
    // write a short note for them instead of making them type one.
    let noteText = note.trim();
    if (!noteText) {
      const did = [];
      if (photoSet  !== "") did.push(`Photo Set ${photoSet} sent`);
      if (designSet !== "") did.push(`Design ${designSet} sent`);
      if (did.length) noteText = did.join(", ");
      else { setErr("Write a note, or send a photo / design set."); return; }
    }

    setSaving(true);
    setErr("");
    try {
      // 1) sets and call slot — first, so "already sent" is caught
      //    before any follow-up is recorded
      const payload = {
        edited_by:           bdaName || "",
        preferred_call_slot: slot,
        preferred_call_time: slotStartISO(nextDate, slot),   // "" when no slot
      };
      if (photoSet  !== "") payload.photo_set  = Number(photoSet);
      if (designSet !== "") payload.design_set = Number(designSet);
      await axios.put(`${API}/leads/${lead.id}`, payload);

      // 2) the follow-up itself (history + status + next call date)
      await axios.post(`${API}/leads/${lead.id}/followups`, {
        note: noteText, status: status || null, nextFollowUp: nextDate || null,
        bda_email: bdaEmail || "",          // who did this follow-up (for the Daily Update)
      });
      onSaved({ name: lead.name, nextDate });
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSnooze = async (minutes) => {
    setSaving(true);
    setErr("");
    try {
      const res = await axios.put(`${API}/leads/${lead.id}/snooze-reminder`, { minutes });
      onSnoozed({ name: lead.name, minutes, at: res.data?.remindAt });
    } catch (e) {
      setErr(e.response?.data?.error || "Could not set the reminder");
      setSnoozeOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const currentNext = lead.snooze_until
    ? `${formatDate(lead.snooze_until)}${lead.preferred_call_slot ? " · " + lead.preferred_call_slot : ""}`
    : null;

  return createPortal(
    <div className="fu-overlay" onClick={onClose}>
      <div className="fu-modal fu-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="fu-modal__header">
          <div>
            <h2 className="fu-modal__title">Follow-up</h2>
            <p className="fu-modal__sub">{lead.name} · {lead.phone}</p>
          </div>
          <button className="fu-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="fu-modal__body">
          {err && <div className="fu-alert fu-alert--error">{err}</div>}

          <LeadDetails lead={lead} />

          {/* ── NEXT CALL ── */}
          <p className="fu-section-title">Next call</p>
          <div className="fu-modal__row fu-modal__row--tight">
            <div className="fu-field">
              <label className="fu-label">Next Call Date</label>
              <input className="fu-input" type="date" min={todayIST()}
                value={nextDate} onChange={e => setNextDate(e.target.value)} />
            </div>
            <div className="fu-field">
              <label className="fu-label">Preferred Call Time</label>
              <select className="fu-input" value={slot} onChange={e => setSlot(e.target.value)}>
                <option value="">— Select slot —</option>
                {CALL_SLOTS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <p className="fu-hint">
            {currentNext ? <>Currently: <b>{currentNext}</b>. </> : null}
            Leaving the date empty clears it. A pop-up reminds you when the chosen slot starts.
          </p>

          {/* ── PHOTO / DESIGN SETS ── */}
          <p className="fu-section-title">Photo &amp; design sets</p>
          <div className="fu-modal__row fu-modal__row--tight">
            <SetPicker label="Photo Set"  prefix="Set"    sent={sentPhoto}  value={photoSet}  onChange={setPhotoSet} />
            <SetPicker label="Design Set" prefix="Design" sent={sentDesign} value={designSet} onChange={setDesignSet} />
          </div>
          {locking.length > 0 && (
            <p className="fu-lockwarn">
              Saving will mark <b>{locking.join(" and ")}</b> as sent. This can't be undone, and it can't be sent to this customer again.
            </p>
          )}

          {/* ── DESCRIPTION (read-only — written in Leads → Edit) ── */}
          <p className="fu-section-title">Description</p>
          {savedDescs.length === 0 ? (
            <p className="fu-hint" style={{ marginTop: 0 }}>No description was added for this lead.</p>
          ) : (
            <div className="fu-desc-read">
              {savedDescs.map((d, i) => (
                <div key={i} className="fu-desc-read__item">
                  <p className="fu-desc-read__text">{d.text}</p>
                  {noteMeta(d) && <span className="fu-desc-read__meta">{noteMeta(d)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* ── NOTE + STATUS ── */}
          <p className="fu-section-title">This follow-up</p>
          <div className="fu-field">
            <label className="fu-label">Note</label>
            <textarea className="fu-input fu-textarea" rows={3}
              placeholder="What happened during this follow-up?"
              value={note} onChange={e => { setNote(e.target.value); setErr(""); }} />
          </div>
          <div className="fu-field" style={{ marginTop: 14 }}>
            <label className="fu-label">Update Status</label>
            <select className="fu-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">— Keep current —</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <PreviousFollowUps leadId={lead.id} />
        </div>

        <div className="fu-modal__footer">
          <div className="fu-snooze">
            <button type="button" className="bda-btn-outline" disabled={saving}
                    onClick={() => setSnoozeOpen(o => !o)}>
              Snooze
            </button>
            {snoozeOpen && (
              <div className="fu-snooze__menu">
                <p className="fu-snooze__title">Remind me about this lead in</p>
                <button type="button" className="fu-snooze__opt" onClick={() => handleSnooze(60)}>
                  <b>1 hour</b><span>Customer is driving or busy</span>
                </button>
                <button type="button" className="fu-snooze__opt" onClick={() => handleSnooze(120)}>
                  <b>2 hours</b><span>Call back later today</span>
                </button>
                <p className="fu-snooze__hint">Closes this window without saving.</p>
              </div>
            )}
          </div>
          <button className="bda-btn-outline" onClick={onClose}>Cancel</button>
          <button className="bda-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Follow-up"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* Shows only the LAST follow-up (the API returns newest first) */
const PreviousFollowUps = ({ leadId }) => {
  const [last, setLast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/leads/${leadId}/followups`)
      .then(r => setLast((r.data.followUps || [])[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <div className="fu-sk" style={{ marginTop:16 }} />;
  if (!last) return (
    <p style={{ fontSize:12, color:"#94a3b8", marginTop:16 }}>No previous follow-up recorded.</p>
  );

  return (
    <div className="fu-history">
      <p className="fu-history__title">Last follow-up</p>
      <div className="fu-history__list">
        <div className="fu-history__item">
          <div className="fu-history__dot" />
          <div className="fu-history__content">
            <p className="fu-history__note">{last.note}</p>
            <div className="fu-history__meta">
              {last.status && <StatusPill status={last.status} />}
              <span className="fu-history__date">{formatDateTime(last.created_at)}</span>
              {last.next_followup && (
                <span className="fu-history__next">Next: {formatDate(last.next_followup)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   LEAD CARD  (compact)
════════════════════════════════════════ */
const LeadCard = ({ lead, isCEO, onFollowUp }) => {
  const sentPhoto  = getSentSets(lead, "photo_sets_sent");
  const sentDesign = getSentSets(lead, "design_sets_sent");
  const nextPhoto  = nextUnsent(sentPhoto);
  const nextDesign = nextUnsent(sentDesign);
  const descs      = getSavedDescriptions(lead);
  const lastDesc   = descs.length ? descs[descs.length - 1].text : "";

  const date    = lead.snooze_until || lead.next_followup;
  const urgency = !date ? "none" : isOverdue(date) ? "overdue" : isToday(date) ? "today" : "upcoming";
  const days    = date ? daysOverdue(date) : 0;
  const tag =
    urgency === "overdue"  ? `${days} day${days !== 1 ? "s" : ""} overdue` :
    urgency === "today"    ? "Due today" : "";

  const type = (lead.lead_type || "").toLowerCase();

  return (
    <div className={`fu-card fu-card--${urgency}`}>
      <div className="fu-card__top">
        <div className={`fu-avatar fu-avatar--${type || "none"}`}>{initials(lead.name)}</div>
        <div className="fu-card__id">
          <h3 className="fu-card__name">{lead.name}</h3>
          <p className="fu-card__sub">
            <a className="fu-card__phone" href={`tel:${lead.phone}`}>{lead.phone}</a>
            {lead.city && <span> · {lead.city}</span>}
          </p>
        </div>
        <div className="fu-card__pills">
          <StatusPill status={lead.status} />
          <LeadTypePill type={lead.lead_type} />
        </div>
      </div>

      <div className={`fu-next fu-next--${urgency}`}>
        <span className="fu-next__date">{date ? formatDate(date) : "No call scheduled"}</span>
        {lead.preferred_call_slot && <span className="fu-next__meta">{lead.preferred_call_slot}</span>}
        {lead.preferred_call_type && <span className="fu-next__meta">{lead.preferred_call_type}</span>}
        {tag && <span className="fu-next__tag">{tag}</span>}
      </div>

      <div className="fu-sets">
        <div className="fu-sets__row">
          <span className="fu-sets__label">Photo</span>
          <span className="fu-sets__value">
            {sentPhoto.length ? `Set ${sentPhoto.join(", ")} sent` : "None sent"}
            <em>{nextPhoto ? `next: Set ${nextPhoto}` : "all sent"}</em>
          </span>
        </div>
        <div className="fu-sets__row">
          <span className="fu-sets__label">Design</span>
          <span className="fu-sets__value">
            {sentDesign.length ? `Design ${sentDesign.join(", ")} sent` : "None sent"}
            <em>{nextDesign ? `next: Design ${nextDesign}` : "all sent"}</em>
          </span>
        </div>
      </div>

      {lastDesc && <p className="fu-card__desc" title={lastDesc}>{lastDesc}</p>}
      {lead.last_note && <p className="fu-card__note">Last note: {lead.last_note}</p>}

      <div className="fu-card__footer">
        {isCEO && lead.assigned_to && <span className="fu-card__assign">{lead.assigned_to.trim()}</span>}
        <a className="fu-card__call" href={`tel:${lead.phone}`}>Call</a>
        <button className="fu-card__btn" onClick={() => onFollowUp(lead)}>Follow Up</button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
const BDAFollowUp = () => {
  const navigate = useNavigate();

  const { user } = useAuth();
  const role  = user?.role || null;          // role CODE, e.g. "bda", "ceo"
  const isCEO = role === "ceo";
  const name  = user?.name  || null;
  const email = user?.email || "";

  const [loading, setLoading]   = useState(true);
  const [allLeads, setAllLeads] = useState([]);
  const [followUps, setFollowUps] = useState([]); // records from followups table
  const [search, setSearch]     = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [modalLead, setModalLead] = useState(null);
  const [toast, setToast]       = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  // Wait until the logged-in user is known (before, the page asked the server with
  // role = null and got the wrong list of leads).
  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, role]);

  const loadData = async () => {
    setLoading(true);
    try {
      // every non-CEO user on this page is treated as a BDA by the server
      const who = { role: isCEO ? "ceo" : "bda", name, email };
      const [leadsRes, todayRes, pendingRes] = await Promise.all([
        // assigned_only: only leads that have an owner (a BDA sees just their own)
        axios.get(`${API}/leads`, { params: { ...who, assigned_only: 1 } }),
        axios.get(`${API}/leads/follow-ups/today`,   { params: who }),
        axios.get(`${API}/leads/follow-ups/pending`, { params: who }),
      ]);
      setAllLeads((leadsRes.data.leads || []).filter(l => !isDeleteRequested(l)));
      setFollowUps([
        ...(todayRes.data.todayFollowUps    || []).map(f => ({ ...f, _type: "today" })),
        ...(pendingRes.data.pendingFollowUps || []).map(f => ({ ...f, _type: "overdue" })),
      ]);
    } catch (err) {
      console.error("Follow up load error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════
     CATEGORIZE LEADS
     Next call date = the lead's snooze_until (set in Leads → Edit or here);
     fallback: the newest follow-up record's next date.
       today / overdue / upcoming by that date (India time)
       "All Follow-ups" = every lead that has an owner
  ══════════════════════════════════════ */
  const categorized = useMemo(() => {
    const todaySet    = new Map();
    const overdueSet  = new Map();
    const upcomingSet = new Map();
    const allSet      = new Map();

    const fuMap = new Map();
    followUps.forEach(fu => {
      if (!fu.next_followup) return;
      const existing = fuMap.get(fu.lead_id);
      if (!existing || new Date(fu.created_at) > new Date(existing.created_at)) fuMap.set(fu.lead_id, fu);
    });

    allLeads.forEach(lead => {
      allSet.set(lead.id, lead);

      const fuEntry = fuMap.get(lead.id);
      const date    = lead.snooze_until || fuEntry?.next_followup;
      if (!date) return;

      const item = { ...lead, next_followup: date, last_note: fuEntry?.note };
      if (isToday(date))         todaySet.set(lead.id, item);
      else if (isOverdue(date))  overdueSet.set(lead.id, item);
      else if (isUpcoming(date)) upcomingSet.set(lead.id, item);
    });

    const byDate = (a, b) => new Date(a.next_followup) - new Date(b.next_followup);
    return {
      today:    [...todaySet.values()],
      overdue:  [...overdueSet.values()].sort(byDate),
      upcoming: [...upcomingSet.values()].sort(byDate),
      all:      [...allSet.values()].map(l => ({ ...l, last_note: fuMap.get(l.id)?.note })),
    };
  }, [allLeads, followUps]);

  const counts = {
    today:    categorized.today.length,
    overdue:  categorized.overdue.length,
    upcoming: categorized.upcoming.length,
    all:      categorized.all.length,
  };

  const filtered = useMemo(() => {
    const list = categorized[activeTab] || [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.city?.toLowerCase().includes(q)
    );
  }, [categorized, activeTab, search]);

  const handleSnoozed = (info) => {
    setModalLead(null);
    const when = info?.at
      ? new Date(info.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: IST })
      : `${info.minutes / 60} hour${info.minutes > 60 ? "s" : ""}`;
    showToast(`Reminder set for ${when}`);
  };

  const handleSaved = (info) => {
    setModalLead(null);
    loadData();
    showToast(info?.nextDate
      ? `Follow-up saved — next call ${formatDate(info.nextDate)}`
      : "Follow-up saved");
    window.refreshBDANotifications?.();
  };

  const TABS = [
    { key:"today",    label:"Today",         color:"#ef4444" },
    { key:"overdue",  label:"Overdue",        color:"#f59e0b" },
    { key:"upcoming", label:"Upcoming",       color:"#2563eb" },
    { key:"all",      label:"All Follow-ups", color:"#7c3aed" },
  ];

  return (
    <div className="fu-page">

      {/* ── HEADER ── */}
      <div className="bda-header">
        <div>
          <p className="bda-breadcrumb">Business Development Analyst</p>
          <h1 className="bda-title">Follow Ups</h1>
        </div>
        <div className="bda-header-actions">
          <button className="bda-btn-outline" onClick={loadData}>↻ Refresh</button>
          <button className="bda-btn-primary" onClick={() => navigate("/bda/leads")}>
            View All Leads
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS (click one to open that tab) ── */}
      <div className="fu-summary">
        {[
          { key:"today",    cls:"red",    label:"Due Today",  icon:"calendar" },
          { key:"overdue",  cls:"amber",  label:"Overdue",    icon:"alert"    },
          { key:"upcoming", cls:"blue",   label:"Upcoming",   icon:"bell"     },
          { key:"all",      cls:"purple", label:"All Leads",  icon:"list"     },
        ].map(c => (
          <div key={c.key} role="button" tabIndex={0}
               className={`fu-sum-card fu-sum-card--${c.cls} ${activeTab === c.key ? "is-active" : ""}`}
               onClick={() => setActiveTab(c.key)}
               onKeyDown={e => (e.key === "Enter" || e.key === " ") && setActiveTab(c.key)}>
            <span className="fu-sum-card__ico"><Icon name={c.icon} size={18} /></span>
            <span className="fu-sum-card__text">
              <span className="fu-sum-card__num">{counts[c.key]}</span>
              <span className="fu-sum-card__label">{c.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* ── TABS + SEARCH ── */}
      <div className="fu-toolbar">
        <div className="fu-tabs">
          {TABS.map(t => (
            <button key={t.key} type="button"
                    className={`fu-tab ${activeTab === t.key ? "is-active" : ""}`}
                    style={{ "--tab-color": t.color }}
                    onClick={() => setActiveTab(t.key)}>
              {t.label}
              <span className="fu-tab__count">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        <div className="fu-search-wrap">
          <span className="fu-search-icon"><Icon name="search" size={15} /></span>
          <input className="fu-search" placeholder="Search name, phone, city…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className="fu-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      {loading ? (
        <div className="fu-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="fu-card-skeleton">
              <Sk /><Sk /><Sk />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="fu-empty">
          <div className="fu-empty__icon">
            <Icon name={activeTab === "today" || activeTab === "overdue" ? "check" : "inbox"} size={30} />
          </div>
          <p className="fu-empty__title">
            {activeTab === "today"    ? "No follow-ups due today!"  :
             activeTab === "overdue"  ? "No overdue follow-ups!"    :
             activeTab === "upcoming" ? "No upcoming follow-ups"    :
             "No leads found"}
          </p>
          <p className="fu-empty__sub">
            {search ? "Try a different search term" : "Check other tabs or add leads"}
          </p>
        </div>
      ) : (
        <>
          <p className="fu-result-count">
            Showing {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="fu-grid">
            {filtered.map(lead => (
              <LeadCard
                key={`${lead.id}-${lead.next_followup || "no-date"}`}
                lead={lead}
                isCEO={isCEO}
                onFollowUp={setModalLead}
              />
            ))}
          </div>
        </>
      )}

      {/* ── MODAL ── */}
      {modalLead && (
        <FollowUpModal
          lead={modalLead}
          bdaName={name}
          bdaEmail={email}
          onClose={() => setModalLead(null)}
          onSaved={handleSaved}
          onSnoozed={handleSnoozed}
        />
      )}

      {toast && <div className="fu-toast">{toast}</div>}
    </div>
  );
};

export default BDAFollowUp;