import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import { useAuth } from "../../../context/useAuth";
import PreferredTimeReminder from "./PreferredTimeReminder";
import "./BDALeads.css";

const API = "http://localhost:5000/api";

/* ─── helpers ─── */
function normalizeSource(raw) {
  if (!raw) return "Manual";
  const s = raw.toLowerCase().trim();
  if (s === "justdial" || s === "just dial") return "JustDial";
  if (["meta","meta ads","facebook","facebook/meta","fb"].includes(s)) return "Facebook/Meta";
  if (["google","google ads","googleads","adwords","google adwords"].includes(s)) return "Google Ads";
  if (["youtube","youtube ads","yt","you tube"].includes(s)) return "YouTube Ads";
  if (["manual","excel"].includes(s)) return "Manual";
  return raw;
}

const SOURCE_COLOR = {
  JustDial:        { bg:"#eff6ff", color:"#2563eb" },
  "Facebook/Meta": { bg:"#f5f3ff", color:"#7c3aed" },
  Manual:          { bg:"#f0fdf4", color:"#16a34a" },
  Website:         { bg:"#fff7ed", color:"#ea580c" },
  "Walk-in":       { bg:"#fdf4ff", color:"#a21caf" },
  Referral:        { bg:"#ecfdf5", color:"#059669" },
  "Google Ads":    { bg:"#fef9c3", color:"#a16207" },
  "YouTube Ads":   { bg:"#fee2e2", color:"#dc2626" },
};
function srcStyle(raw) {
  const n = normalizeSource(raw);
  return SOURCE_COLOR[n] || SOURCE_COLOR[raw] || { bg:"#f1f5f9", color:"#475569" };
}

const STATUS_MAP = {
  new:              { bg:"#eff6ff", color:"#2563eb" },
  interested:       { bg:"#fdf4ff", color:"#7c3aed" },
  intrested:        { bg:"#fdf4ff", color:"#7c3aed" },
  "follow up":      { bg:"#fff7ed", color:"#ea580c" },
  converted:        { bg:"#f0fdf4", color:"#16a34a" },
  contacted:        { bg:"#ecfdf5", color:"#059669" },
  "not interested": { bg:"#f8fafc", color:"#64748b" },
  junk:             { bg:"#fef2f2", color:"#dc2626" },
  junk_requested:   { bg:"#fef2f2", color:"#dc2626" },
  delete_requested: { bg:"#fef2f2", color:"#dc2626" },
};
/** A BDA asked for this lead to be deleted; only the CEO sees/handles these.
 *  (JUNK_REQUESTED is the old name — treated the same.) */
const isDeleteRequested = (l) =>
  ["delete_requested", "junk_requested"].includes((l?.status || "").toLowerCase());

/** "DELETE_REQUESTED" -> "Delete Requested" (plain statuses are left alone) */
function statusLabel(s) {
  if (!s) return "—";
  if ((s || "").toLowerCase() === "junk_requested") return "Delete Requested";
  if (!s.includes("_")) return s;
  return s.toLowerCase().split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function statusStyle(s) {
  return STATUS_MAP[(s||"").toLowerCase()] || { bg:"#f1f5f9", color:"#475569" };
}

const ALL_STATUSES = ["New","Interested","Follow Up","Converted","Not Interested","Contacted","Junk"];
const ALL_SOURCES  = ["JustDial","Facebook/Meta","Google Ads","YouTube Ads","Manual","Website","Walk-in","Referral"];
const SET_NUMBERS  = [1,2,3,4,5,6,7,8,9,10];
const FLOOR_OPTIONS = ["G","G+1","G+2","G+3","G+4","G+5"];
const LEAD_TYPES   = ["Hot","Warm","Cold"];
const CALL_STATUSES = ["Connected","Not Connected","Busy","Switch Off","Call Back"];
const CALL_TYPES   = ["Phone Call","WhatsApp Call","Video Call","WhatsApp Message"];
const LEAD_TYPE_STYLE = {
  hot:  { bg:"#fef2f2", color:"#dc2626" },
  warm: { bg:"#fff7ed", color:"#ea580c" },
  cold: { bg:"#eff6ff", color:"#2563eb" },
};
const MAX_TRACK_SEC = 300;

/* ─── assignment helpers ─── */
const normName = (v) => (v || "").trim().replace(/\s+/g, " ").toLowerCase();
const isUnassigned = (l) => {
  const a = normName(l.assigned_to);
  return !a || a === "unassigned";
};
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const assignErrorMsg = (err) =>
  err.response?.status === 401
    ? "Your session expired — please log in again."
    : err.response?.data?.error || "Could not assign the lead. Please try again.";

/* ─── photo-set / description helpers ─── */
/** Photo sets already sent for a lead, as a sorted array of numbers. */
const getSentSets = (lead, column = "photo_sets_sent") => {
  const raw = lead?.[column];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(Number).filter(n => n >= 1 && n <= 10))].sort((a, b) => a - b);
};

/** Every description the lead already has, oldest first.
 *  The legacy single `description` column (if any) comes first. */
const getSavedDescriptions = (lead) => {
  const list = [];
  if (lead?.description && String(lead.description).trim()) {
    list.push({ text: String(lead.description).trim(), by: null, at: null });
  }
  const notes = Array.isArray(lead?.description_notes) ? lead.description_notes : [];
  notes.forEach(n => {
    if (n && n.text && String(n.text).trim()) list.push(n);
  });
  return list;
};

/* ───────── Dates — always shown in India time (IST), whatever the PC's timezone ───────── */
const IST = "Asia/Kolkata";
/** "16 Nov 2026" */
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null
    : d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric", timeZone: IST });
};
/** "16 Nov, 09:30 am" */
const fmtDateTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null
    : d.toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", timeZone: IST });
};
/** ISO -> "YYYY-MM-DD" (IST) for <input type="date"> */
const toISTDateInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: IST });
};
const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: IST });

/* Preferred call slots — the pop-up fires when the chosen slot STARTS */
const CALL_SLOTS = [
  { label: "7 AM – 9 AM",   start: "07:00" },
  { label: "9 AM – 11 AM",  start: "09:00" },
  { label: "11 AM – 1 PM",  start: "11:00" },
  { label: "1 PM – 3 PM",   start: "13:00" },
  { label: "3 PM – 5 PM",   start: "15:00" },
  { label: "5 PM – 7 PM",   start: "17:00" },
  { label: "7 PM – 9 PM",   start: "19:00" },
];
/** next call date + slot -> the exact moment (ISO) the reminder should fire */
const slotStartISO = (dateStr, slotLabel) => {
  const slot = CALL_SLOTS.find(x => x.label === slotLabel);
  if (!dateStr || !slot) return "";
  return new Date(`${dateStr}T${slot.start}:00+05:30`).toISOString();
};

const fmtNoteMeta = (n) => {
  const parts = [];
  if (n.by) parts.push(n.by);
  if (n.at) parts.push(fmtDateTime(n.at));
  return parts.join(" · ");
};

const Sk = ({ h=16, r=6 }) => (
  <div className="bda-lsk" style={{ height:h, borderRadius:r }} />
);

/* ════════════════════════════════════════
   TIME TRACKER HOOK
   Tracks silently — fires onStop(seconds)
   when active flips false or component unmounts.
   Nothing is shown on screen for anyone.
════════════════════════════════════════ */
function useTimeTracker(active, onStop) {
  const startRef    = useRef(null);
  const intervalRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  useEffect(() => {
    if (active) {
      startRef.current = Date.now();
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(Math.min(secs, MAX_TRACK_SEC));
      }, 1000);
    } else {
      if (startRef.current) {
        const secs = Math.min(
          Math.floor((Date.now() - startRef.current) / 1000),
          MAX_TRACK_SEC
        );
        clearInterval(intervalRef.current);
        if (secs > 0) onStopRef.current(secs);
        startRef.current = null;
        setElapsed(0);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [active]);

  return elapsed;
}

/* ════════════════════════════════════════
   LEAD ROW
════════════════════════════════════════ */
const LeadRow = ({ lead, onEdit, onJunk, onApprove, onReject, onAssign, onQuickAssign, canAssign, bdaEmail, bdaName, isCEO }) => {
  const [open, setOpen] = useState(false);
  const src  = srcStyle(lead.source);
  const stat = statusStyle(lead.status);
  const unassigned = isUnassigned(lead);
  const delRequested = isDeleteRequested(lead);
  const escalated  = unassigned && !!lead.escalated_at;
  const sentSets   = getSentSets(lead, "photo_sets_sent");
  const sentDesigns = getSentSets(lead, "design_sets_sent");
  const savedDescs = getSavedDescriptions(lead);
  const ltStyle    = LEAD_TYPE_STYLE[(lead.lead_type || "").toLowerCase()];

  const handleViewStop = async (secs) => {
    if (!bdaEmail || secs <= 0) return;
    try {
      await axios.post(`${API}/leads/${lead.id}/track-time`, {
        bda_email:    bdaEmail,
        bda_name:     bdaName || bdaEmail,
        session_type: "view",
        duration_sec: secs,
      });
    } catch (_) { /* silent — never block UX */ }
  };

  // Time is tracked for BDAs only. The CEO just looks — no tracking, no timer,
  // so CEO browsing never pollutes the BDA "Time Spent" report.
  useTimeTracker(open && !isCEO, handleViewStop);

  return (
    <>
      <tr
        className={`blr ${open ? "blr--open" : ""} ${delRequested ? "blr--delreq" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <td>
          <div className="blr__name">
            {lead.name}
            {ltStyle && (
              <span className="bda-pill bda-pill--sm" style={{ background: ltStyle.bg, color: ltStyle.color }}>
                {lead.lead_type}
              </span>
            )}
          </div>
          <div className="blr__phone">{lead.phone}</div>
        </td>
        <td className="blr__email">{lead.email || "—"}</td>
        <td>
          <span className="bda-pill" style={{ background: stat.bg, color: stat.color }}>
            {statusLabel(lead.status)}
          </span>
        </td>
        <td>
          <span className="bda-pill" style={{ background: src.bg, color: src.color }}>
            {lead.source || "—"}
          </span>
        </td>
        <td className="blr__city">{lead.city || "—"}</td>
        <td className="blr__assign">
          {unassigned ? (
            <>
              <span className="bda-pill bda-pill--unassigned">Unassigned</span>
              {escalated && (
                <span className="bda-pill bda-pill--escalated" title={lead.last_assignee ? `Not followed up by ${lead.last_assignee}` : "Escalated"}>
                  ⚡ Escalated
                </span>
              )}
            </>
          ) : (
            lead.assigned_to
          )}
        </td>
        <td className="blr__date">
          {fmtDate(lead.created_at) || "—"}
        </td>
        <td onClick={e => e.stopPropagation()}>
          <div className="blr__actions">
            {delRequested ? (
              isCEO && (
                <>
                  <button className="blr__btn blr__btn--approve" onClick={() => onApprove(lead)}>Approve delete</button>
                  <button className="blr__btn blr__btn--reject"  onClick={() => onReject(lead)}>Reject</button>
                </>
              )
            ) : (
              <>
                {unassigned && !isCEO && (
                  <button className="blr__btn blr__btn--me" onClick={() => onQuickAssign(lead)}>Assign to me</button>
                )}
                {canAssign && (
                  <button className="blr__btn blr__btn--assign" onClick={() => onAssign(lead)}>
                    {unassigned ? "Assign" : "Reassign"}
                  </button>
                )}
                <button className="blr__btn blr__btn--edit" onClick={() => onEdit(lead)}>Edit</button>
                <button className="blr__btn blr__btn--junk" onClick={() => onJunk(lead)}>Delete</button>
              </>
            )}
          </div>
        </td>
      </tr>

      {open && (
        <tr className="blr__detail-row">
          <td colSpan={8}>
            <div className="blr__detail">
              <div className="blr__detail-grid">
                <DetailItem label="WhatsApp"       value={lead.whatsapp} />
                <DetailItem label="Building Type"  value={lead.building_type} />
                <DetailItem label="Floors"         value={lead.floors} />
                <DetailItem label="Plot Size"      value={lead.measurement} />
                <DetailItem label="Sq. Ft"         value={lead.sqft} />
                <DetailItem label="Budget"         value={lead.budget ? `₹${Number(lead.budget).toLocaleString("en-IN")}` : null} />
                <DetailItem label="Quotation Sent" value={lead.quotation_sent === true ? "Yes" : lead.quotation_sent === false ? "No" : null} />
                <DetailItem label="Next Call Date"  value={fmtDate(lead.snooze_until)} />
                <DetailItem label="Assigned By"    value={lead.assigned_by} />
                <DetailItem label="Assigned On"    value={fmtDateTime(lead.assigned_at)} />
                <DetailItem label="Previously With" value={lead.last_assignee} />
                {delRequested && (
                  <DetailItem label="Delete Requested By" value={lead.delete_requested_by} />
                )}
                <DetailItem label="Lead Type"        value={lead.lead_type} />
                <DetailItem label="Call Status"      value={lead.call_status} />
                <DetailItem label="Preferred Call"   value={lead.preferred_call_type} />
                <DetailItem label="Preferred Slot"   value={lead.preferred_call_slot} />
                <DetailItem label="Photo Sets Sent"  value={sentSets.length ? sentSets.map(n => `Set ${n}`).join(", ") : null} />
                <DetailItem label="Design Sets Sent" value={sentDesigns.length ? sentDesigns.map(n => `Design ${n}`).join(", ") : null} />

                <div className="blr__di blr__di--wide">
                  <p className="blr__di-label">Description</p>
                  {savedDescs.length === 0 ? (
                    <p className="blr__di-value">—</p>
                  ) : (
                    <ol className="blr__desc-list">
                      {savedDescs.map((d, i) => (
                        <li key={i} className="blr__desc-item">
                          <span className="blr__desc-text">{d.text}</span>
                          {fmtNoteMeta(d) && <span className="blr__desc-meta">{fmtNoteMeta(d)}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const DetailItem = ({ label, value, wide }) => (
  <div className={`blr__di ${wide ? "blr__di--wide" : ""}`}>
    <p className="blr__di-label">{label}</p>
    <p className="blr__di-value">{value || "—"}</p>
  </div>
);

/* ════════════════════════════════════════
   SET PICKER  (Photo Set / Design Set)
   A number that was already sent is greyed out and can't be chosen again.
════════════════════════════════════════ */
const SetPicker = ({ label, prefix, sent, value, onChange }) => (
  <div className="bda-field">
    <label className="bda-field__label">{label}</label>
    <select className="bda-field__input" value={value} onChange={e => onChange(e.target.value)}>
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
    {sent.length >= SET_NUMBERS.length ? (
      <p className="bda-field__hint">All {SET_NUMBERS.length} have been sent.</p>
    ) : sent.length > 0 ? (
      <div className="bda-setchips">
        <span className="bda-setchips__label">Sent:</span>
        {sent.map(n => <span key={n} className="bda-setchip">{prefix} {n} ✓</span>)}
      </div>
    ) : (
      <p className="bda-field__hint">Nothing sent yet.</p>
    )}
  </div>
);

/* ════════════════════════════════════════
   EDIT MODAL
   • Photo Set / Design Set : 1-10 each, a number can be sent only once
   • Description            : saved ones are read-only; new text goes in new boxes
   • Next Call Date + Call Time slot : lead goes to Follow Up on Save; pop-up when the slot starts
════════════════════════════════════════ */
const EditModal = ({ lead, onClose, onSave, bdaEmail, bdaName, isCEO }) => {
  // Strip the fields that are edited through their own controls below
  const [form, setForm] = useState(() => {
    const { description, description_notes, photo_sets_sent, design_sets_sent,
            preferred_call_time, snooze_until, ...rest } = lead;
    return { ...rest, next_call_date: toISTDateInput(snooze_until), preferred_call_slot: lead.preferred_call_slot || "" };
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const sentPhoto  = useMemo(() => getSentSets(lead, "photo_sets_sent"),  [lead]);
  const sentDesign = useMemo(() => getSentSets(lead, "design_sets_sent"), [lead]);
  const savedDescs = useMemo(() => getSavedDescriptions(lead), [lead]);

  const [photoSet,  setPhotoSet]  = useState("");    // "" = nothing sent now
  const [designSet, setDesignSet] = useState("");
  const [newDescs,  setNewDescs]  = useState([""]);  // new, editable description boxes

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setDescAt  = (i, v) => setNewDescs(arr => arr.map((d, idx) => (idx === i ? v : d)));
  const addDescBox = () => setNewDescs(arr => [...arr, ""]);
  const removeDescBox = (i) =>
    setNewDescs(arr => (arr.length === 1 ? [""] : arr.filter((_, idx) => idx !== i)));

  const handleEditStop = async (secs) => {
    if (!bdaEmail || secs <= 0) return;
    try {
      await axios.post(`${API}/leads/${lead.id}/track-time`, {
        bda_email:    bdaEmail,
        bda_name:     bdaName || bdaEmail,
        session_type: "edit",
        duration_sec: secs,
      });
    } catch (_) {}
  };

  // BDAs only — no tracking and no timer for the CEO
  useTimeTracker(!isCEO, handleEditStop);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, edited_by: bdaName || bdaEmail || "" };

      // These three are rebuilt below, and only sent when they actually changed —
      // so a normal save never re-arms a reminder that was already dismissed.
      delete payload.next_call_date;
      delete payload.preferred_call_slot;
      delete payload.preferred_call_time;
      delete payload.snooze_until;

      const slot        = form.preferred_call_slot || "";
      const date        = form.next_call_date || "";
      const dateChanged = date !== toISTDateInput(lead.snooze_until);
      const slotChanged = slot !== (lead.preferred_call_slot || "");

      if (slot && !date) {
        setError("Pick the Next Call Date for the time slot you chose.");
        setSaving(false);
        return;
      }
      if (dateChanged) payload.snooze_until = date;               // "" clears it
      if (dateChanged || slotChanged) {
        payload.preferred_call_slot = slot;
        payload.preferred_call_time = slotStartISO(date, slot);   // "" when no slot
      }

      if (photoSet  !== "") payload.photo_set  = Number(photoSet);
      if (designSet !== "") payload.design_set = Number(designSet);

      const fresh = newDescs.map(d => d.trim()).filter(Boolean);
      if (fresh.length) payload.new_descriptions = fresh;

      await axios.put(`${API}/leads/${lead.id}`, payload);
      // Saving a Next Call Date is what puts the lead on the Follow Up page
      onSave({ name: lead.name, followUpDate: date || null });
    } catch (err) {
      // 409 = that set was sent by someone else while this window was open
      setError(err.response?.data?.error || ("Save failed: " + err.message));
    } finally {
      setSaving(false);
    }
  };

  const locking = [
    photoSet  !== "" && `Photo Set ${photoSet}`,
    designSet !== "" && `Design ${designSet}`,
  ].filter(Boolean);

  return createPortal(
    <div className="bda-modal-overlay" onClick={onClose}>
      <div className="bda-modal" onClick={e => e.stopPropagation()}>
        <div className="bda-modal__header">
          <h2 className="bda-modal__title">Edit Lead — {lead.name}</h2>
          <button className="bda-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="bda-modal__body">
          {error && <div className="bda-assign__error">⚠ {error}</div>}

          <div className="bda-modal__grid">
            <Field label="Name"          value={form.name}          onChange={v => set("name",v)} />
            <Field label="Phone"         value={form.phone}         onChange={v => set("phone",v)} />
            <Field label="Email"         value={form.email}         onChange={v => set("email",v)} />
            <Field label="City"          value={form.city}          onChange={v => set("city",v)} />
            <FieldSelect label="Status"  value={form.status}        onChange={v => set("status",v)} options={ALL_STATUSES} />
            <FieldSelect label="Source"  value={form.source}        onChange={v => set("source",v)}
                         options={!form.source || ALL_SOURCES.includes(form.source) ? ALL_SOURCES : [...ALL_SOURCES, form.source]} />
            <div className="bda-field">
              <label className="bda-field__label">Assigned To</label>
              <input className="bda-field__input" value={isUnassigned(lead) ? "Unassigned" : lead.assigned_to} disabled
                     title="Use the Assign / Reassign button on the lead to change the owner" />
            </div>
            <Field label="Budget (₹)"    value={form.budget}        onChange={v => set("budget",v)} />
            <Field label="Building Type" value={form.building_type} onChange={v => set("building_type",v)} />
            {/* Floors: G … G+5. An older value outside this list is kept as an extra option so it isn't lost. */}
            <FieldSelect label="Floors"    value={form.floors}        onChange={v => set("floors",v)}
                         options={!form.floors || FLOOR_OPTIONS.includes(form.floors) ? FLOOR_OPTIONS : [...FLOOR_OPTIONS, form.floors]} />
            <Field label="Sq. Ft"        value={form.sqft}          onChange={v => set("sqft",v)} />
            <FieldSelect label="Lead Type" value={form.lead_type}   onChange={v => set("lead_type",v)} options={LEAD_TYPES} />

            {/* ── CALL DETAILS ── */}
            <FieldSelect label="Call Status"          value={form.call_status}         onChange={v => set("call_status",v)}         options={CALL_STATUSES} />
            <FieldSelect label="Preferred Call Type"  value={form.preferred_call_type} onChange={v => set("preferred_call_type",v)} options={CALL_TYPES} />

            <div className="bda-field">
              <label className="bda-field__label">Next Call Date</label>
              <input
                type="date"
                className="bda-field__input"
                min={todayIST()}
                value={form.next_call_date || ""}
                onChange={e => set("next_call_date", e.target.value)}
              />
            </div>
            <FieldSelect label="Preferred Call Time" value={form.preferred_call_slot}
                         onChange={v => set("preferred_call_slot", v)} options={CALL_SLOTS.map(x => x.label)} />
            <div className="bda-field bda-field--wide">
              <p className="bda-field__hint" style={{ margin: 0 }}>
                📅 After you press Save, this lead appears on the Follow Up page for the Next Call Date.
                🔔 A pop-up reminds you when the chosen time slot starts.
              </p>
            </div>

            {/* ── PHOTO SET / DESIGN SET — two separate dropdowns, side by side ── */}
            <SetPicker label="Photo Set"  prefix="Set"    sent={sentPhoto}  value={photoSet}  onChange={setPhotoSet} />
            <SetPicker label="Design Set" prefix="Design" sent={sentDesign} value={designSet} onChange={setDesignSet} />

            {locking.length > 0 && (
              <div className="bda-field bda-field--wide">
                <p className="bda-lockwarn">
                  🔒 Saving will mark <b>{locking.join(" and ")}</b> as sent. This can't be undone,
                  and it can't be sent to this customer again.
                </p>
              </div>
            )}

            {/* ── DESCRIPTIONS ── */}
            <div className="bda-field bda-field--wide">
              <label className="bda-field__label">Description</label>

              {savedDescs.map((d, i) => (
                <div key={`saved-${i}`} className="bda-desc bda-desc--saved">
                  <textarea
                    className="bda-field__input bda-desc__box"
                    value={d.text}
                    readOnly
                    rows={2}
                    title="Saved descriptions can't be edited — add a new description below"
                  />
                  <div className="bda-desc__meta">
                    <span>🔒 Description {i + 1}</span>
                    {fmtNoteMeta(d) && <span>{fmtNoteMeta(d)}</span>}
                  </div>
                </div>
              ))}

              {newDescs.map((d, i) => (
                <div key={`new-${i}`} className="bda-desc">
                  <textarea
                    className="bda-field__input bda-desc__box"
                    value={d}
                    rows={2}
                    placeholder={`Description ${savedDescs.length + i + 1}…`}
                    onChange={e => setDescAt(i, e.target.value)}
                  />
                  {newDescs.length > 1 && (
                    <button type="button" className="bda-desc__remove" title="Remove this box"
                            onClick={() => removeDescBox(i)}>✕</button>
                  )}
                </div>
              ))}

              <button type="button" className="bda-desc__add" onClick={addDescBox}>
                + Add another description
              </button>
            </div>
          </div>
        </div>
        <div className="bda-modal__footer">
          <button className="bda-btn-outline" onClick={onClose}>Cancel</button>
          <button className="bda-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const Field = ({ label, value, onChange, wide }) => (
  <div className={`bda-field ${wide ? "bda-field--wide" : ""}`}>
    <label className="bda-field__label">{label}</label>
    <input className="bda-field__input" value={value || ""} onChange={e => onChange(e.target.value)} />
  </div>
);

const FieldSelect = ({ label, value, onChange, options }) => (
  <div className="bda-field">
    <label className="bda-field__label">{label}</label>
    <select className="bda-field__input" value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

/* ════════════════════════════════════════
   ASSIGN MODAL
   • BDA : can pick any BDA (incl. themselves) — never the CEO
   • CEO : can pick any BDA
   The server enforces the same rules; this just hides invalid choices.
════════════════════════════════════════ */
const AssignModal = ({ lead, assignees, bdaEmail, isCEO, onClose, onDone }) => {
  const [selected, setSelected] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");
  const unassigned = isUnassigned(lead);
  const me = (bdaEmail || "").toLowerCase();

  const submit = async (email) => {
    if (!email) { setErr("Please choose a BDA"); return; }
    setSaving(true); setErr("");
    try {
      const res = await axios.put(
        `${API}/leads/${lead.id}/assign`,
        { assignee_email: email },
        { headers: authHeaders() }
      );
      const who = res.data?.lead?.assigned_to || "BDA";
      onDone(`"${lead.name}" assigned to ${who}`);
    } catch (e) {
      setErr(assignErrorMsg(e));
      setSaving(false);
    }
  };

  return createPortal(
    <div className="bda-modal-overlay" onClick={onClose}>
      <div className="bda-modal bda-modal--assign" onClick={e => e.stopPropagation()}>
        <div className="bda-modal__header">
          <div>
            <h2 className="bda-modal__title">{unassigned ? "Assign Lead" : "Reassign Lead"}</h2>
            <p className="bda-assign__sub">{lead.name} · {lead.phone}</p>
          </div>
          <button className="bda-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="bda-modal__body">
          {!unassigned && (
            <div className="bda-assign__current">Currently with <b>{lead.assigned_to}</b></div>
          )}
          {err && <div className="bda-assign__error">⚠ {err}</div>}

          {!isCEO && me && assignees.some(a => (a.email||"").toLowerCase() === me) && (
            <button className="bda-assign__me" disabled={saving} onClick={() => submit(bdaEmail)}>
              ✋ Assign to me
            </button>
          )}

          <p className="bda-assign__label">{isCEO ? "Assign to BDA" : "…or assign to another BDA"}</p>
          {assignees.length === 0 ? (
            <p className="bda-assign__empty">No active BDAs found.</p>
          ) : (
            <div className="bda-assign__list">
              {assignees.map(a => {
                const isMe = (a.email||"").toLowerCase() === me;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`bda-assign__opt ${selected === a.email ? "is-selected" : ""}`}
                    onClick={() => { setSelected(a.email); setErr(""); }}
                  >
                    <span className="bda-assign__avatar">{(a.name || "?").trim().charAt(0).toUpperCase()}</span>
                    <span className="bda-assign__who">
                      <span className="bda-assign__name">{a.name}{isMe && " (You)"}</span>
                      <span className="bda-assign__email">{a.email}</span>
                    </span>
                    <span className="bda-assign__tick">{selected === a.email ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bda-modal__footer">
          <button className="bda-btn-outline" onClick={onClose}>Cancel</button>
          <button className="bda-btn-primary" disabled={!selected || saving} onClick={() => submit(selected)}>
            {saving ? "Assigning…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ════════════════════════════════════════
   CONFIRM MODAL
   kind = "request" : BDA asks the CEO to delete a lead
          "approve" : CEO deletes it for good
          "reject"  : CEO refuses; the lead goes back to the BDA
════════════════════════════════════════ */
const CONFIRM_COPY = {
  request: {
    title: "Delete this lead?",
    body:  "This lead will be sent to the CEO as a delete request and removed from your list. Use this for fake, duplicate or wrong-number leads.",
    ok:    "Yes, send delete request", busy: "Sending…", danger: true,
  },
  approve: {
    title: "Delete this lead?",
    body:  "The lead will be deleted and disappear from every BDA's list.",
    ok:    "Yes, delete", busy: "Deleting…", danger: true,
  },
  reject: {
    title: "Reject this delete request?",
    body:  "The lead goes back to the BDA's list with its previous status.",
    ok:    "Reject request", busy: "Rejecting…", danger: false,
  },
};

const ConfirmModal = ({ action, onClose, onConfirm }) => {
  const [busy, setBusy] = useState(false);
  const { kind, lead } = action;
  const c = CONFIRM_COPY[kind];
  const go = async () => { setBusy(true); await onConfirm(action); setBusy(false); };
  return createPortal(
    <div className="bda-modal-overlay" onClick={onClose}>
      <div className="bda-modal bda-modal--assign" onClick={e => e.stopPropagation()}>
        <div className="bda-modal__header">
          <div>
            <h2 className="bda-modal__title">{c.title}</h2>
            <p className="bda-assign__sub">{lead.name} · {lead.phone}</p>
          </div>
          <button className="bda-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="bda-modal__body">
          <p style={{ margin:0, fontSize:13, color:"#475569", lineHeight:1.5 }}>{c.body}</p>
          {kind !== "request" && lead.delete_requested_by && (
            <p style={{ margin:"10px 0 0", fontSize:12, color:"#94a3b8" }}>
              Requested by <b>{lead.delete_requested_by}</b>
            </p>
          )}
        </div>
        <div className="bda-modal__footer">
          <button className="bda-btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={c.danger ? "bda-btn-danger" : "bda-btn-primary"} onClick={go} disabled={busy}>
            {busy ? c.busy : c.ok}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
const BDALeads = () => {
  const navigate = useNavigate();

  // ✅ Pull user from auth context — same pattern as BDAReportsWithRole
  const { user } = useAuth();
  const bdaEmail = user?.email || "";
  const bdaName  = user?.name  || user?.email || "";
  const role     = user?.role  || null;   // role CODE, e.g. "bda", "ceo"
  const isCEO    = role === "ceo";

  const [leads,    setLeads]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [statusF,  setStatusF]  = useState("All");
  const [sourceF,  setSourceF]  = useState("All");
  const [assignF,  setAssignF]  = useState("All");
  const [sort,     setSort]     = useState("newest");
  const [page,     setPage]     = useState(1);
  const [editLead, setEditLead] = useState(null);
  const [assignLead,  setAssignLead]  = useState(null);
  const [assignees,   setAssignees]   = useState([]);
  const [confirmAct,  setConfirmAct]  = useState(null);   // { kind, lead }
  const [toast,       setToast]       = useState(null);   // { msg, type }
  const PER_PAGE = 12;

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // CEO: any lead (assign / reassign).  BDA: unassigned leads only.
  const canAssign = (l) => isCEO || isUnassigned(l);

  // Wait until the logged-in user is known. Before, this ran once on first render
  // while `role` was still null, so the server returned EVERY lead unfiltered.
  useEffect(() => {
    if (!user) return;
    fetchLeads();
    axios.get(`${API}/leads/assignees`)
      .then(r => setAssignees(r.data.assignees || []))
      .catch(err => console.error("assignees:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, role]);

  // New leads (Meta / JustDial / manual) show up without pressing Refresh
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => fetchLeads(true), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, bdaName, bdaEmail]);

  const fetchLeads = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${API}/leads`, {
        // every non-CEO user on this page is treated as a BDA by the server
        params: { role: isCEO ? "ceo" : "bda", name: bdaName, email: bdaEmail },
      });
      const all = res.data.leads || [];
      // Delete requests belong to the CEO only — hidden from BDAs whatever the server returns
      setLeads(isCEO ? all : all.filter(l => !isDeleteRequested(l)));
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAssigned = (msg) => {
    setAssignLead(null);
    showToast(msg);
    fetchLeads(true);
    window.refreshBDANotifications?.();
  };

  const quickAssignToMe = async (lead) => {
    try {
      const res = await axios.put(
        `${API}/leads/${lead.id}/assign`,
        { assignee_email: bdaEmail },
        { headers: authHeaders() }
      );
      showToast(`"${lead.name}" is now yours`);
      fetchLeads(true);
      window.refreshBDANotifications?.();
      return res;
    } catch (err) {
      showToast(assignErrorMsg(err), "err");
      fetchLeads(true);   // someone else may have grabbed it — refresh the list
    }
  };

  const filtered = useMemo(() => {
    let arr = [...leads];
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.email?.toLowerCase().includes(q)
      );
    }
    if (statusF === "DELETE_REQUESTED")
      arr = arr.filter(isDeleteRequested);
    else if (statusF !== "All")
      arr = arr.filter(l => (l.status||"").toLowerCase() === statusF.toLowerCase());
    if (sourceF !== "All")
      arr = arr.filter(l => normalizeSource(l.source) === sourceF);
    if (assignF === "assigned")
      arr = arr.filter(l => !isUnassigned(l));
    if (assignF === "unassigned")
      arr = arr.filter(l => isUnassigned(l));
    arr.sort((a, b) => {
      // Leads waiting for an owner always come first (escalated ones on top),
      // so nothing in the pool is buried on page 4.
      // CEO: delete requests waiting for a decision come first
      if (isCEO) {
        const da = isDeleteRequested(a), db = isDeleteRequested(b);
        if (da !== db) return da ? -1 : 1;
      }
      const ua = isUnassigned(a), ub = isUnassigned(b);
      if (ua !== ub) return ua ? -1 : 1;
      if (ua && ub && !!a.escalated_at !== !!b.escalated_at) return a.escalated_at ? -1 : 1;
      if (sort === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sort === "name")   return (a.name||"").localeCompare(b.name||"");
      return 0;
    });
    return arr;
  }, [leads, search, statusF, sourceF, assignF, sort, isCEO]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  // Delete flow
  //   BDA  : "Delete" -> sends a delete request to the CEO (status DELETE_REQUESTED)
  //   CEO  : "Delete" deletes straight away; on a BDA's request he can Approve or Reject
  const runConfirm = async ({ kind, lead }) => {
    try {
      if (kind === "request") {
        await axios.put(`${API}/leads/${lead.id}/request-junk`, { requested_by: bdaName });
        setLeads(ls => ls.filter(l => l.id !== lead.id));
        showToast(`"${lead.name}" sent to the CEO for deletion`);
      } else if (kind === "approve") {
        await axios.put(`${API}/leads/${lead.id}/permanent-delete`);
        setLeads(ls => ls.filter(l => l.id !== lead.id));
        showToast(`"${lead.name}" deleted`);
      } else {
        await axios.put(`${API}/leads/${lead.id}/reject-delete`);
        showToast(`Request rejected — "${lead.name}" restored`);
      }
      setConfirmAct(null);
      fetchLeads(true);
    } catch (err) {
      setConfirmAct(null);
      showToast(err.response?.data?.error || "Something went wrong. Please try again.", "err");
    }
  };

  const handleSaved = (info) => {
    setEditLead(null);
    fetchLeads();
    if (info?.followUpDate)
      showToast(`"${info.name}" added to Follow Up — ${fmtDate(info.followUpDate)}`);
  };

  const clearFilters = () => {
    setStatusF("All"); setSourceF("All"); setAssignF("All");
    setSearch(""); setPage(1);
  };

  const hasFilters = statusF !== "All" || sourceF !== "All" || assignF !== "All" || search;

  const counts = useMemo(() => {
    const c = { total: leads.length, new: 0, followup: 0, converted: 0, unassigned: 0, deleteReq: 0 };
    leads.forEach(l => {
      if (isDeleteRequested(l)) { c.deleteReq++; return; }
      if (isUnassigned(l)) c.unassigned++;
      const s = (l.status||"").toLowerCase();
      if (s === "new")       c.new++;
      if (s === "follow up") c.followup++;
      if (s === "converted") c.converted++;
    });
    return c;
  }, [leads]);

  return (
    <div className="bda-leads-page">

      {/* ── HEADER ── */}
      <div className="bda-header">
        <div>
          <p className="bda-breadcrumb">Business Development Analyst</p>
          <h1 className="bda-title">Leads</h1>
        </div>
        <div className="bda-header-actions">
          <button className="bda-btn-outline" onClick={() => fetchLeads()}>↻ Refresh</button>
          <button className="bda-btn-primary" onClick={() => navigate("/bda/add-lead")}>+ Add Lead</button>
        </div>
      </div>

      {/* ── SUMMARY STAT CARDS ── */}
      <div className="bda-leads-chips">
        <div className="bda-chip2 bda-chip2--blue">
          <div className="bda-chip2__left">
            <span className="bda-chip2__num">{counts.total}</span>
            <span className="bda-chip2__label">Total</span>
          </div>
          <span className="bda-chip2__icon">📋</span>
        </div>
        <div
          className="bda-chip2 bda-chip2--red bda-chip2--click"
          onClick={() => { setAssignF("unassigned"); setPage(1); }}
          title="Show unassigned leads"
        >
          <div className="bda-chip2__left">
            <span className="bda-chip2__num">{counts.unassigned}</span>
            <span className="bda-chip2__label">Unassigned</span>
          </div>
          <span className="bda-chip2__icon">📥</span>
        </div>
        <div className="bda-chip2 bda-chip2--green">
          <div className="bda-chip2__left">
            <span className="bda-chip2__num">{counts.new}</span>
            <span className="bda-chip2__label">New</span>
          </div>
          <span className="bda-chip2__icon">🔔</span>
        </div>
        <div className="bda-chip2 bda-chip2--amber">
          <div className="bda-chip2__left">
            <span className="bda-chip2__num">{counts.followup}</span>
            <span className="bda-chip2__label">Follow-up</span>
          </div>
          <span className="bda-chip2__icon">⚠️</span>
        </div>
        <div className="bda-chip2 bda-chip2--purple">
          <div className="bda-chip2__left">
            <span className="bda-chip2__num">{counts.converted}</span>
            <span className="bda-chip2__label">Converted</span>
          </div>
          <span className="bda-chip2__icon">✅</span>
        </div>
        {isCEO && counts.deleteReq > 0 && (
          <div
            className="bda-chip2 bda-chip2--red bda-chip2--click"
            onClick={() => { setStatusF("DELETE_REQUESTED"); setPage(1); }}
            title="Show delete requests"
          >
            <div className="bda-chip2__left">
              <span className="bda-chip2__num">{counts.deleteReq}</span>
              <span className="bda-chip2__label">Delete Requests</span>
            </div>
            <span className="bda-chip2__icon">🗑️</span>
          </div>
        )}
      </div>

      {/* ── FILTERS ── */}
      <div className="bda-leads-filters">
        <div className="bda-search-wrap">
          <span className="bda-search-icon">🔍</span>
          <input
            className="bda-search"
            placeholder="Search by name, phone, email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="bda-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
        <select className="bda-filter-sel" value={statusF}
          onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="All">All Status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          {isCEO && <option value="DELETE_REQUESTED">Delete Requested</option>}
        </select>
        <select className="bda-filter-sel" value={sourceF}
          onChange={e => { setSourceF(e.target.value); setPage(1); }}>
          <option value="All">All Sources</option>
          {ALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bda-filter-sel" value={assignF}
          onChange={e => { setAssignF(e.target.value); setPage(1); }}>
          <option value="All">All Assignments</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <select className="bda-filter-sel" value={sort}
          onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A–Z</option>
        </select>
        {hasFilters && (
          <button className="bda-btn-outline" style={{ fontSize:12, padding:"6px 14px" }}
            onClick={clearFilters}>Clear Filters</button>
        )}
        <span className="bda-leads-count">
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── TABLE ── */}
      <div className="bda-table-card">
        {loading ? (
          <div style={{ padding:"24px 20px" }}>
            {[1,2,3,4,5,6].map(i => <Sk key={i} h={48} r={8} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bda-empty">
            <div className="bda-empty__icon">📋</div>
            <p className="bda-empty__title">No leads found</p>
            <p className="bda-empty__sub">Try adjusting your filters or add a new lead</p>
            <button className="bda-btn-primary" onClick={() => navigate("/bda/add-lead")}>+ Add Lead</button>
          </div>
        ) : (
          <div className="bda-table-wrap">
            <table className="bda-leads-table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Status</th><th>Source</th>
                  <th>City</th><th>Assigned</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(lead => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onEdit={setEditLead}
                    onJunk={(l) => setConfirmAct({ kind: isCEO ? "approve" : "request", lead: l })}
                    onApprove={(l) => setConfirmAct({ kind: "approve", lead: l })}
                    onReject={(l) => setConfirmAct({ kind: "reject", lead: l })}
                    onAssign={setAssignLead}
                    onQuickAssign={quickAssignToMe}
                    canAssign={canAssign(lead)}
                    bdaEmail={bdaEmail}
                    bdaName={bdaName}
                    isCEO={isCEO}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="bda-pagination">
          <button className="bda-pg-btn" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
          <div className="bda-pg-pages">
            {Array.from({ length: totalPages }, (_, i) => i+1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i-1] > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`d${i}`} className="bda-pg-dots">…</span>
                ) : (
                  <button key={p} className={`bda-pg-num ${page === p ? "active" : ""}`}
                    onClick={() => setPage(p)}>{p}</button>
                )
              )}
          </div>
          <button className="bda-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p+1)}>Next →</button>
          <span className="bda-pg-info">
            {(page-1)*PER_PAGE + 1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
          </span>
        </div>
      )}

      {/* ── ASSIGN MODAL ── */}
      {assignLead && (
        <AssignModal
          lead={assignLead}
          assignees={assignees}
          bdaEmail={bdaEmail}
          isCEO={isCEO}
          onClose={() => setAssignLead(null)}
          onDone={handleAssigned}
        />
      )}

      {/* ── DELETE / APPROVE / REJECT CONFIRM ── */}
      {confirmAct && (
        <ConfirmModal action={confirmAct} onClose={() => setConfirmAct(null)} onConfirm={runConfirm} />
      )}

      {toast && <div className={`bda-toast bda-toast--${toast.type}`}>{toast.msg}</div>}

      {/* ── PREFERRED-CALL-TIME POPUP (BDAs only) ── */}
      <PreferredTimeReminder
        email={bdaEmail}
        name={bdaName}
        enabled={!isCEO && !!user}
        onOpenLead={(id) => {
          const l = leads.find(x => x.id === id);
          if (l) setEditLead(l);
        }}
      />

      {/* ── EDIT MODAL ── */}
      {editLead && (
        <EditModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSave={handleSaved}
          bdaEmail={bdaEmail}
          bdaName={bdaName}
          isCEO={isCEO}
        />
      )}
    </div>
  );
};

export default BDALeads;