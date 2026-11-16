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
        <option value="">— Select {prefix.toLowerCase()} to mark as sent —</option>
        {SET_NUMBERS.map(n => {
          const done = sent.includes(n);
          return (
            <option key={n} value={n} disabled={done}>
              {prefix} {n}{done ? "  ✓ already sent" : ""}
            </option>
          );
        })}
      </select>
      {sent.length > 0 ? (
        <div className="fu-setchips">
          <span className="fu-setchips__label">Sent:</span>
          {sent.map(n => <span key={n} className="fu-setchip">{prefix} {n} ✓</span>)}
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
   • Description — saved ones are locked, new text goes in new boxes
════════════════════════════════════════ */
const FollowUpModal = ({ lead, bdaName, onClose, onSaved }) => {
  const futureDate = isUpcoming(lead.snooze_until) ? istDay(lead.snooze_until) : "";

  const [note, setNote]         = useState("");
  const [status, setStatus]     = useState(lead.status || "");
  const [nextDate, setNextDate] = useState(futureDate);
  const [slot, setSlot]         = useState(futureDate ? (lead.preferred_call_slot || "") : "");
  const [photoSet, setPhotoSet]   = useState("");
  const [designSet, setDesignSet] = useState("");
  const [newDescs, setNewDescs]   = useState([""]);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const sentPhoto  = useMemo(() => getSentSets(lead, "photo_sets_sent"),  [lead]);
  const sentDesign = useMemo(() => getSentSets(lead, "design_sets_sent"), [lead]);
  const savedDescs = useMemo(() => getSavedDescriptions(lead), [lead]);

  const setDescAt     = (i, v) => setNewDescs(a => a.map((d, k) => (k === i ? v : d)));
  const addDescBox    = () => setNewDescs(a => [...a, ""]);
  const removeDescBox = (i) => setNewDescs(a => (a.length === 1 ? [""] : a.filter((_, k) => k !== i)));

  const locking = [
    photoSet  !== "" && `Photo Set ${photoSet}`,
    designSet !== "" && `Design ${designSet}`,
  ].filter(Boolean);

  const handleSave = async () => {
    const fresh = newDescs.map(d => d.trim()).filter(Boolean);

    if (slot && !nextDate) { setErr("Pick the Next Call Date for the time slot you chose."); return; }

    // The follow-up needs a note. If the BDA only sent a set / added a description,
    // write a short note for them instead of making them type one.
    let noteText = note.trim();
    if (!noteText) {
      const did = [];
      if (photoSet  !== "") did.push(`Photo Set ${photoSet} sent`);
      if (designSet !== "") did.push(`Design ${designSet} sent`);
      if (did.length)       noteText = did.join(", ");
      else if (fresh.length) noteText = "Description updated";
      else { setErr("Write a note, or send a set / add a description."); return; }
    }

    setSaving(true);
    setErr("");
    try {
      // 1) sets, descriptions, call slot — first, so "already sent" is caught
      //    before any follow-up is recorded
      const payload = {
        edited_by:           bdaName || "",
        preferred_call_slot: slot,
        preferred_call_time: slotStartISO(nextDate, slot),   // "" when no slot
      };
      if (photoSet  !== "") payload.photo_set  = Number(photoSet);
      if (designSet !== "") payload.design_set = Number(designSet);
      if (fresh.length) payload.new_descriptions = fresh;
      await axios.put(`${API}/leads/${lead.id}`, payload);

      // 2) the follow-up itself (history + status + next call date)
      await axios.post(`${API}/leads/${lead.id}/followups`, {
        note: noteText, status: status || null, nextFollowUp: nextDate || null,
      });
      onSaved({ name: lead.name, nextDate });
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to save");
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
          {err && <div className="fu-alert fu-alert--error">⚠ {err}</div>}

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
            Pick the date of the next call — leaving it empty clears it. 🔔 A pop-up reminds you when the slot starts.
          </p>

          {/* ── PHOTO / DESIGN SETS ── */}
          <p className="fu-section-title">Photo &amp; design sets</p>
          <div className="fu-modal__row fu-modal__row--tight">
            <SetPicker label="Photo Set"  prefix="Set"    sent={sentPhoto}  value={photoSet}  onChange={setPhotoSet} />
            <SetPicker label="Design Set" prefix="Design" sent={sentDesign} value={designSet} onChange={setDesignSet} />
          </div>
          {locking.length > 0 && (
            <p className="fu-lockwarn">
              🔒 Saving will mark <b>{locking.join(" and ")}</b> as sent. This can't be undone, and it can't be sent to this customer again.
            </p>
          )}

          {/* ── DESCRIPTIONS ── */}
          <p className="fu-section-title">Description</p>
          {savedDescs.map((d, i) => (
            <div key={`s${i}`} className="fu-desc fu-desc--saved">
              <textarea className="fu-input fu-textarea fu-desc__box" rows={2} readOnly value={d.text}
                title="Saved descriptions can't be edited — add a new one below" />
              <div className="fu-desc__meta">
                <span>🔒 Description {i + 1}</span>
                {noteMeta(d) && <span>{noteMeta(d)}</span>}
              </div>
            </div>
          ))}
          {newDescs.map((d, i) => (
            <div key={`n${i}`} className="fu-desc">
              <textarea className="fu-input fu-textarea fu-desc__box" rows={2} value={d}
                placeholder={`Description ${savedDescs.length + i + 1}…`}
                onChange={e => setDescAt(i, e.target.value)} />
              {newDescs.length > 1 && (
                <button type="button" className="fu-desc__remove" title="Remove this box"
                        onClick={() => removeDescBox(i)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="fu-desc__add" onClick={addDescBox}>+ Add another description</button>

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
          <button className="bda-btn-outline" onClick={onClose}>Cancel</button>
          <button className="bda-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "✅ Save Follow-up"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const PreviousFollowUps = ({ leadId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/leads/${leadId}/followups`)
      .then(r => setHistory(r.data.followUps || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) return <div className="fu-sk" style={{ marginTop:16 }} />;
  if (!history.length) return (
    <p style={{ fontSize:12, color:"#94a3b8", marginTop:16 }}>No previous follow-ups recorded.</p>
  );

  return (
    <div className="fu-history">
      <p className="fu-history__title">Previous Follow-ups ({history.length})</p>
      <div className="fu-history__list">
        {history.map(h => (
          <div key={h.id} className="fu-history__item">
            <div className="fu-history__dot" />
            <div className="fu-history__content">
              <p className="fu-history__note">{h.note}</p>
              <div className="fu-history__meta">
                {h.status && <StatusPill status={h.status} />}
                <span className="fu-history__date">{formatDateTime(h.created_at)}</span>
                {h.next_followup && (
                  <span className="fu-history__next">→ Next: {formatDate(h.next_followup)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   LEAD CARD
════════════════════════════════════════ */
const LeadCard = ({ lead, badge, isCEO, onFollowUp }) => {
  const sentPhoto  = getSentSets(lead, "photo_sets_sent");
  const sentDesign = getSentSets(lead, "design_sets_sent");
  const descs      = getSavedDescriptions(lead);
  const lastDesc   = descs.length ? descs[descs.length - 1].text : "";
  const nextPhoto  = nextUnsent(sentPhoto);
  const nextDesign = nextUnsent(sentDesign);

  return (
    <div className={`fu-card fu-card--${badge}`}>
      {badge === "overdue" && (
        <div className="fu-card__overdue-bar">
          ⚠ {daysOverdue(lead.next_followup)} day{daysOverdue(lead.next_followup) !== 1 ? "s" : ""} overdue
        </div>
      )}
      {badge === "today" && <div className="fu-card__today-bar">📅 Due Today</div>}
      {badge === "upcoming" && <div className="fu-card__upcoming-bar">🔔 {formatDate(lead.next_followup)}</div>}
      {badge === "all" && <div className="fu-card__all-bar">📋 Follow-up</div>}

      <div className="fu-card__body">
        <div className="fu-card__info">
          <h3 className="fu-card__name">{lead.name}</h3>
          <p className="fu-card__phone">{lead.phone}</p>
          {lead.city && <p className="fu-card__city">📍 {lead.city}</p>}
        </div>
        <div className="fu-card__pills">
          <StatusPill status={lead.status} />
          <LeadTypePill type={lead.lead_type} />
        </div>
      </div>

      {/* next call */}
      <div className="fu-card__rows">
        <div className="fu-card__row">
          <span className="fu-card__rowlabel">📅 Next call</span>
          <span className="fu-card__rowvalue">
            {lead.snooze_until || lead.next_followup
              ? <>{formatDate(lead.snooze_until || lead.next_followup)}
                  {lead.preferred_call_slot ? ` · ${lead.preferred_call_slot}` : ""}</>
              : <span className="fu-muted">Not set</span>}
            {lead.preferred_call_type ? <span className="fu-card__chip">{lead.preferred_call_type}</span> : null}
          </span>
        </div>

        {/* what has already been sent, and what is next */}
        <div className="fu-card__row">
          <span className="fu-card__rowlabel">📷 Photo</span>
          <span className="fu-card__rowvalue">
            {sentPhoto.length ? `Set ${sentPhoto.join(", ")} sent` : <span className="fu-muted">None sent</span>}
            {nextPhoto && sentPhoto.length > 0 && <span className="fu-card__next">next: Set {nextPhoto}</span>}
            {!nextPhoto && <span className="fu-card__next">all sent</span>}
          </span>
        </div>
        <div className="fu-card__row">
          <span className="fu-card__rowlabel">🎨 Design</span>
          <span className="fu-card__rowvalue">
            {sentDesign.length ? `Design ${sentDesign.join(", ")} sent` : <span className="fu-muted">None sent</span>}
            {nextDesign && sentDesign.length > 0 && <span className="fu-card__next">next: Design {nextDesign}</span>}
            {!nextDesign && <span className="fu-card__next">all sent</span>}
          </span>
        </div>
      </div>

      {lastDesc && <p className="fu-card__desc" title={lastDesc}>📝 {lastDesc}</p>}
      {lead.last_note && <p className="fu-card__note">💬 {lead.last_note}</p>}

      <div className="fu-card__footer">
        {isCEO && lead.assigned_to && <span className="fu-card__assign">👤 {lead.assigned_to.trim()}</span>}
        <button className="fu-card__btn" onClick={() => onFollowUp(lead)}>
          + Follow Up
        </button>
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
      all:      [...allSet.values()].map(l => ({ ...l, ...(allSet.get(l.id) && {}) })),
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

      {/* ── SUMMARY CARDS ── */}
      <div className="fu-summary">
        <div className="fu-sum-card fu-sum-card--red">
          <span className="fu-sum-card__num">{counts.today}</span>
          <span className="fu-sum-card__label">Due Today</span>
          <span className="fu-sum-card__icon">📅</span>
        </div>
        <div className="fu-sum-card fu-sum-card--amber">
          <span className="fu-sum-card__num">{counts.overdue}</span>
          <span className="fu-sum-card__label">Overdue</span>
          <span className="fu-sum-card__icon">⚠️</span>
        </div>
        <div className="fu-sum-card fu-sum-card--blue">
          <span className="fu-sum-card__num">{counts.upcoming}</span>
          <span className="fu-sum-card__label">Upcoming</span>
          <span className="fu-sum-card__icon">🔔</span>
        </div>
        <div className="fu-sum-card fu-sum-card--purple">
          <span className="fu-sum-card__num">{counts.all}</span>
          <span className="fu-sum-card__label">All Leads</span>
          <span className="fu-sum-card__icon">📋</span>
        </div>
      </div>

      {/* ── TABS + SEARCH ── */}
      <div className="fu-toolbar">
        <div className="fu-tabs">
          {TABS.map(t => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          "6px",
                  padding:      "7px 16px",
                  borderRadius: "8px",
                  fontSize:     "13px",
                  fontWeight:   "500",
                  fontFamily:   "inherit",
                  cursor:       "pointer",
                  transition:   "all .2s",
                  background:   isActive ? t.color : "#ffffff",
                  color:        isActive ? "#ffffff" : "#64748b",
                  border:       isActive ? `1.5px solid ${t.color}` : "1.5px solid #e2e8f0",
                  outline: "none",
                }}
              >
                {t.label}
                <span
                  style={{
                    background:   isActive ? "rgba(255,255,255,0.3)" : "#f1f5f9",
                    color:        isActive ? "#ffffff" : "#64748b",
                    borderRadius: "20px",
                    fontSize:     "10px",
                    fontWeight:   "700",
                    padding:      "1px 7px",
                    minWidth:     "20px",
                    textAlign:    "center",
                    display:      "inline-block",
                  }}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="fu-search-wrap">
          <span className="fu-search-icon">🔍</span>
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
            {activeTab === "today" ? "🎉" : activeTab === "overdue" ? "✅" : "📭"}
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
                badge={activeTab === "all" ? "all" : activeTab}
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
          onClose={() => setModalLead(null)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className="fu-toast">{toast}</div>}
    </div>
  );
};

export default BDAFollowUp;