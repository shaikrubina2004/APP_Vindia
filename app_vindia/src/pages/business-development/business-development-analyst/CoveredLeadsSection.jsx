import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import "./CoveredLeadsSection.css";

const STATUSES = ["New", "Interested", "Follow Up", "Converted", "Not Interested", "Contacted", "Junk"];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function daysLate(d) {
  if (!d) return 0;
  const due = new Date(d); due.setHours(0, 0, 0, 0);
  const now = new Date();  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now - due) / 86400000));
}

/* ── Follow-up form for a covered lead ── */
const CoverFollowUpModal = ({ lead, onClose, onSaved }) => {
  const [note, setNote]         = useState("");
  const [status, setStatus]     = useState(lead.status || "");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const save = async () => {
    if (!note.trim()) { setErr("Note is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/lead-cover/${lead.id}/follow-up`, {
        note, status, nextFollowUp: nextDate || null,
      });
      onSaved(res.data?.message);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cvs-overlay" onClick={onClose}>
      <div className="cvs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cvs-modal__head">
          <div>
            <h3>Follow up: {lead.name}</h3>
            <p>{lead.phone} · {lead.owner_name?.trim()}'s lead</p>
          </div>
          <button className="cvs-x" onClick={onClose}>✕</button>
        </div>

        <p className="cvs-modal__info">
          Once you save, <b>{lead.name} becomes your lead</b>.
        </p>

        {err && <div className="cvs-err">⚠ {err}</div>}

        <label className="cvs-label">Note <span>*</span></label>
        <textarea className="cvs-input" rows={3} placeholder="What happened on the call?"
          value={note} onChange={(e) => { setNote(e.target.value); setErr(""); }} />

        <div className="cvs-row">
          <div>
            <label className="cvs-label">Update status</label>
            <select className="cvs-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">— Keep current —</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="cvs-label">Next follow-up date</label>
            <input className="cvs-input" type="date" min={new Date().toISOString().slice(0, 10)}
              value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
        </div>

        <div className="cvs-modal__foot">
          <button className="cvs-btn cvs-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="cvs-btn cvs-btn--primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "✅ Save follow-up"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Shown on the BDA Follow-ups page:
   • leads of OTHER BDAs whose follow-up was missed and handed to me
   • my own leads that someone else is currently covering
   Renders nothing when there is nothing to show.
   ══════════════════════════════════════════════════════════ */
export default function CoveredLeadsSection({ onChanged }) {
  const [mine, setMine]         = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [modalLead, setModalLead] = useState(null);
  const [toast, setToast]       = useState("");

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api.get("/lead-cover/mine"), api.get("/lead-cover/outgoing")]);
      setMine(a.data.data || []);
      setOutgoing(b.data.data || []);
    } catch { /* not a BDA / offline — show nothing */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const saved = (msg) => {
    setModalLead(null);
    setToast(msg || "Follow-up saved.");
    load();
    if (onChanged) onChanged();
  };

  if (!mine.length && !outgoing.length && !toast) return null;

  return (
    <section className="cvs-section">
      {mine.length > 0 && (
        <div className="cvs-card">
          <div className="cvs-card__head">
            <h2>📞 Covering for other BDAs <span className="cvs-count">{mine.length}</span></h2>
            <p>
              These leads' owners missed the follow-up date. Call the client and log a follow-up —
              the lead then becomes yours.
            </p>
          </div>

          <div className="cvs-grid">
            {mine.map((l) => (
              <div key={l.id} className="cvs-lead">
                <div className="cvs-lead__bar">
                  ⚠ {daysLate(l.next_followup) > 0
                    ? `${daysLate(l.next_followup)} day${daysLate(l.next_followup) !== 1 ? "s" : ""} overdue`
                    : "Due"} · {fmtDate(l.next_followup)}
                </div>
                <div className="cvs-lead__body">
                  <div>
                    <h3>{l.name}</h3>
                    {l.phone && <a className="cvs-phone" href={`tel:${l.phone}`}>📞 {l.phone}</a>}
                    {l.city && <p className="cvs-muted">📍 {l.city}</p>}
                  </div>
                  <span className="cvs-status">{l.status || "—"}</span>
                </div>
                {l.last_note && <p className="cvs-note">💬 {l.last_note}</p>}
                <div className="cvs-lead__foot">
                  <span className="cvs-owner">👤 {l.owner_name?.trim()}'s lead</span>
                  <button className="cvs-btn cvs-btn--primary" onClick={() => setModalLead(l)}>+ Follow Up</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="cvs-info">
          <b>ℹ You missed a follow-up</b> — {outgoing.length === 1 ? "this lead has" : "these leads have"} been
          passed to another BDA. Follow up first if you want to keep {outgoing.length === 1 ? "it" : "them"}:
          <ul>
            {outgoing.map((o) => (
              <li key={o.id}>
                <b>{o.name}</b> → {o.cover_name} (due {fmtDate(o.next_followup)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && <div className="cvs-toast">{toast}</div>}
      {modalLead && <CoverFollowUpModal lead={modalLead} onClose={() => setModalLead(null)} onSaved={saved} />}
    </section>
  );
}