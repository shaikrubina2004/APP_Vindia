import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/useAuth";
import "./BDAFollowUp.css";

const API = "http://localhost:5000/api";

const STATUSES = ["New","Interested","Follow Up","Converted","Not Interested","Contacted","Junk"];

/* ─── helpers ─── */
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}
function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

/* Compare only date part (ignore time) */
function toDateOnly(d) {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
function todayDate() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
function isToday(d) {
  if (!d) return false;
  return toDateOnly(d).getTime() === todayDate().getTime();
}
function isOverdue(d) {
  if (!d) return false;
  return toDateOnly(d).getTime() < todayDate().getTime();
}
function isUpcoming(d) {
  if (!d) return false;
  return toDateOnly(d).getTime() > todayDate().getTime();
}
function daysOverdue(d) {
  const diff = todayDate() - toDateOnly(d);
  return Math.floor(diff / 86400000);
}

const CLOSED = ["converted", "not interested", "junk", "junk_requested"];
const isClosed = (status) => CLOSED.includes((status || "").toLowerCase());

/* Hours left before an un-followed-up lead is escalated back to the pool */
function hoursLeft(assignedAt, escalationHours) {
  if (!assignedAt || !escalationHours) return null;
  const left = escalationHours - (Date.now() - new Date(assignedAt).getTime()) / 3600000;
  return Math.max(0, Math.ceil(left));
}

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

const Sk = () => <div className="fu-sk" />;

/* ════════════════════════════════════════
   ADD FOLLOW-UP MODAL
════════════════════════════════════════ */
const AddFollowUpModal = ({ lead, onClose, onSaved }) => {
  const [note, setNote]         = useState("");
  const [status, setStatus]     = useState(lead.status || "");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const handleSave = async () => {
    if (!note.trim()) { setErr("Note is required"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/leads/${lead.id}/followups`, {
        note, status, nextFollowUp: nextDate || null,
      });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fu-overlay" onClick={onClose}>
      <div className="fu-modal" onClick={e => e.stopPropagation()}>
        <div className="fu-modal__header">
          <div>
            <h2 className="fu-modal__title">Add Follow-up</h2>
            <p className="fu-modal__sub">{lead.name} · {lead.phone}</p>
          </div>
          <button className="fu-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="fu-modal__body">
          {err && <div className="fu-alert fu-alert--error">⚠ {err}</div>}

          <div className="fu-field">
            <label className="fu-label">Note <span className="fu-req">*</span></label>
            <textarea className="fu-input fu-textarea" rows={3}
              placeholder="What happened during this follow-up?"
              value={note} onChange={e => { setNote(e.target.value); setErr(""); }} />
          </div>

          <div className="fu-modal__row">
            <div className="fu-field">
              <label className="fu-label">Update Status</label>
              <select className="fu-input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">— Keep current —</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="fu-field">
              <label className="fu-label">Next Follow-up Date</label>
              <input className="fu-input" type="date"
                min={new Date().toISOString().slice(0,10)}
                value={nextDate} onChange={e => setNextDate(e.target.value)} />
            </div>
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
    </div>
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
const LeadCard = ({ lead, badge, onFollowUp, escalationHours }) => {
  const left = badge === "fresh" ? hoursLeft(lead.assigned_at, escalationHours) : null;
  return (
  <div className={`fu-card fu-card--${badge}`}>
    {badge === "fresh" && (
      <div className={`fu-card__fresh-bar ${left !== null && left <= 4 ? "is-urgent" : ""}`}>
        🆕 Needs first follow-up
        {left !== null && ` · ${left}h left before it moves to other BDAs`}
      </div>
    )}
    {badge === "overdue" && (
      <div className="fu-card__overdue-bar">
        ⚠ {daysOverdue(lead.next_followup)} day{daysOverdue(lead.next_followup) !== 1 ? "s" : ""} overdue
      </div>
    )}
    {badge === "today" && (
      <div className="fu-card__today-bar">📅 Due Today</div>
    )}
    {badge === "upcoming" && (
      <div className="fu-card__upcoming-bar">🔔 {formatDate(lead.next_followup)}</div>
    )}
    {badge === "all" && (
      <div className="fu-card__all-bar">📋 Follow-up</div>
    )}

    <div className="fu-card__body">
      <div className="fu-card__info">
        <h3 className="fu-card__name">{lead.name}</h3>
        <p className="fu-card__phone">{lead.phone}</p>
        {lead.city && <p className="fu-card__city">📍 {lead.city}</p>}
      </div>
      <StatusPill status={lead.status} />
    </div>

    {lead.last_note && (
      <p className="fu-card__note">💬 {lead.last_note}</p>
    )}

    <div className="fu-card__footer">
      <span className="fu-card__source">{lead.source || "Manual"}</span>
      {lead.assigned_to && <span className="fu-card__assign">👤 {lead.assigned_to.trim()}</span>}
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

  // ✅ Same pattern as BDALeads — role/name needed to filter data per-user
  const { user } = useAuth();
  const role  = user?.role  || null;   // role CODE, e.g. "bda"
  const name  = user?.name  || null;
  const email = user?.email || "";

  const [loading, setLoading]   = useState(true);
  const [allLeads, setAllLeads] = useState([]);
  const [followUps, setFollowUps] = useState([]); // records from followups table
  const [search, setSearch]     = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [modalLead, setModalLead] = useState(null);
  const [escalationHours, setEscalationHours] = useState(24);
  const tabChosen = useRef(false);   // true once the user (or first load) picked a tab

  useEffect(() => { loadData(); }, []);

  // Keep the list fresh: newly assigned / escalated leads appear on their own
  useEffect(() => {
    const id = setInterval(() => loadData(true), 60000);
    return () => clearInterval(id);
  }, [role, name, email]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Only leads ASSIGNED to this BDA (CEO: every assigned lead).
      // The unassigned pool lives on the Leads page, not here.
      const params = { role, name, email };
      const [leadsRes, todayRes, pendingRes] = await Promise.all([
        axios.get(`${API}/leads`, { params: { ...params, assigned_only: 1 } }),
        axios.get(`${API}/leads/follow-ups/today`, { params }),
        axios.get(`${API}/leads/follow-ups/pending`, { params }),
      ]);
      setAllLeads(leadsRes.data.leads || []);
      if (leadsRes.data.escalationHours) setEscalationHours(leadsRes.data.escalationHours);
      setFollowUps([
        ...(todayRes.data.todayFollowUps    || []).map(f => ({ ...f, _type: "today" })),
        ...(pendingRes.data.pendingFollowUps || []).map(f => ({ ...f, _type: "overdue" })),
      ]);
    } catch (err) {
      console.error("Follow up load error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /* ══════════════════════════════════════
     CATEGORIZE LEADS
     
     Priority order for a lead:
     1. snooze_until == today  → "today"
     2. snooze_until < today   → "overdue"
     3. snooze_until > today   → "upcoming"
     4. No snooze, but followups table has a record with next_followup == today → "today"
     5. No snooze, but followups table has a record with next_followup < today  → "overdue"
     6. No snooze, but followups table has a record with next_followup > today  → "upcoming"
     7. No snooze, status is any active status → "all"
     
     "All Follow-ups" = every lead that is NOT deleted, regardless of status
     (so BDA can follow up on any lead)
  ══════════════════════════════════════ */
  const categorized = useMemo(() => {
    const todaySet    = new Map(); // id → lead
    const overdueSet  = new Map();
    const upcomingSet = new Map();
    const allSet      = new Map(); // every lead assigned to me
    const freshSet    = new Map(); // assigned, but no follow-up logged yet

    // Build a map: lead_id → latest followup next_followup date from followups table
    const fuMap = new Map();
    followUps.forEach(fu => {
      if (!fu.next_followup) return;
      const existing = fuMap.get(fu.lead_id);
      // keep the most recent followup entry by created_at
      if (!existing || new Date(fu.created_at) > new Date(existing.created_at)) {
        fuMap.set(fu.lead_id, fu);
      }
    });

    allLeads.forEach(lead => {
      // Add to "all" always
      allSet.set(lead.id, lead);

      // Determine the effective next follow-up date:
      // prefer snooze_until from leads table, fallback to followups table
      const snooze  = lead.snooze_until;
      const fuEntry = fuMap.get(lead.id);
      const fuDate  = fuEntry?.next_followup;

      // Check snooze_until first
      if (snooze) {
        if (isToday(snooze)) {
          todaySet.set(lead.id, { ...lead, next_followup: snooze, last_note: fuEntry?.note });
          return;
        }
        if (isOverdue(snooze)) {
          overdueSet.set(lead.id, { ...lead, next_followup: snooze, last_note: fuEntry?.note });
          return;
        }
        if (isUpcoming(snooze)) {
          upcomingSet.set(lead.id, { ...lead, next_followup: snooze, last_note: fuEntry?.note });
          return;
        }
      }

      // Fallback: check followups table next_followup
      if (fuDate) {
        if (isToday(fuDate)) {
          todaySet.set(lead.id, { ...lead, next_followup: fuDate, last_note: fuEntry?.note });
          return;
        }
        if (isOverdue(fuDate)) {
          overdueSet.set(lead.id, { ...lead, next_followup: fuDate, last_note: fuEntry?.note });
          return;
        }
        if (isUpcoming(fuDate)) {
          upcomingSet.set(lead.id, { ...lead, next_followup: fuDate, last_note: fuEntry?.note });
          return;
        }
      }

      // Assigned but never followed up and nothing scheduled → "Not Started".
      // This is the clock that escalates to other BDAs if ignored.
      if (!isClosed(lead.status) && !(lead.followup_count > 0) && !snooze) {
        freshSet.set(lead.id, lead);
      }
    });

    // Sort overdue: most overdue first
    const sortedOverdue = [...overdueSet.values()].sort(
      (a, b) => new Date(a.next_followup) - new Date(b.next_followup)
    );
    // Sort upcoming: soonest first
    const sortedUpcoming = [...upcomingSet.values()].sort(
      (a, b) => new Date(a.next_followup) - new Date(b.next_followup)
    );

    // Oldest assignment first = closest to escalation
    const sortedFresh = [...freshSet.values()].sort(
      (a, b) => new Date(a.assigned_at || a.created_at) - new Date(b.assigned_at || b.created_at)
    );

    return {
      fresh:    sortedFresh,
      today:    [...todaySet.values()],
      overdue:  sortedOverdue,
      upcoming: sortedUpcoming,
      all:      [...allSet.values()],
    };
  }, [allLeads, followUps]);

  const counts = {
    fresh:    categorized.fresh.length,
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

  // First load: land on "Not Started" if there are freshly assigned leads waiting
  useEffect(() => {
    if (loading || tabChosen.current) return;
    tabChosen.current = true;
    if (categorized.fresh.length > 0) setActiveTab("fresh");
  }, [loading, categorized]);

  const handleSaved = () => { setModalLead(null); loadData(); };

  const TABS = [
    { key:"fresh",    label:"Not Started",    color:"#0ea5e9" },
    { key:"today",    label:"Today",         color:"#ef4444" },
    { key:"overdue",  label:"Overdue",        color:"#f59e0b" },
    { key:"upcoming", label:"Upcoming",       color:"#2563eb" },
    { key:"all",      label:"All Assigned",   color:"#7c3aed" },
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
            Leads (Assign)
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="fu-summary">
        <div className="fu-sum-card fu-sum-card--sky">
          <span className="fu-sum-card__num">{counts.fresh}</span>
          <span className="fu-sum-card__label">Not Started</span>
          <span className="fu-sum-card__icon">🆕</span>
        </div>
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
          <span className="fu-sum-card__label">My Leads</span>
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
                onClick={() => { tabChosen.current = true; setActiveTab(t.key); }}
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
                  border:       isActive
                    ? `1.5px solid ${t.color}`
                    : "1.5px solid #e2e8f0",
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
            {activeTab === "today" ? "🎉" : activeTab === "overdue" ? "✅" : activeTab === "fresh" ? "👍" : "📭"}
          </div>
          <p className="fu-empty__title">
            {activeTab === "fresh"    ? "Nothing waiting to be started!" :
             activeTab === "today"    ? "No follow-ups due today!"  :
             activeTab === "overdue"  ? "No overdue follow-ups!"    :
             activeTab === "upcoming" ? "No upcoming follow-ups"    :
             "No assigned leads yet"}
          </p>
          <p className="fu-empty__sub">
            {search
              ? "Try a different search term"
              : activeTab === "all"
                ? "Pick up leads from the Leads page — they appear here once assigned to you"
                : "Check other tabs"}
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
                onFollowUp={setModalLead}
                escalationHours={escalationHours}
              />
            ))}
          </div>
        </>
      )}

      {/* ── MODAL ── */}
      {modalLead && (
        <AddFollowUpModal
          lead={modalLead}
          onClose={() => setModalLead(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default BDAFollowUp;