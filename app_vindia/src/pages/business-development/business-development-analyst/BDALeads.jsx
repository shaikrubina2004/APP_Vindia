import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./BDALeads.css";

const API = "http://localhost:5000/api";

/* ─── helpers ─── */
function normalizeSource(raw) {
  if (!raw) return "Manual";
  const s = raw.toLowerCase().trim();
  if (s === "justdial" || s === "just dial") return "JustDial";
  if (["meta","facebook","facebook/meta","fb"].includes(s)) return "Facebook/Meta";
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
};
function srcStyle(raw) {
  const n = normalizeSource(raw);
  return SOURCE_COLOR[n] || SOURCE_COLOR[raw] || { bg:"#f1f5f9", color:"#475569" };
}

const STATUS_MAP = {
  new:             { bg:"#eff6ff", color:"#2563eb" },
  interested:      { bg:"#fdf4ff", color:"#7c3aed" },
  intrested:       { bg:"#fdf4ff", color:"#7c3aed" },
  "follow up":     { bg:"#fff7ed", color:"#ea580c" },
  converted:       { bg:"#f0fdf4", color:"#16a34a" },
  contacted:       { bg:"#ecfdf5", color:"#059669" },
  "not interested":{ bg:"#f8fafc", color:"#64748b" },
  junk:            { bg:"#fef2f2", color:"#dc2626" },
  junk_requested:  { bg:"#fef2f2", color:"#dc2626" },
};
function statusStyle(s) {
  return STATUS_MAP[(s||"").toLowerCase()] || { bg:"#f1f5f9", color:"#475569" };
}

const ALL_STATUSES = ["New","Interested","Follow Up","Converted","Not Interested","Contacted","Junk"];
const ALL_SOURCES  = ["JustDial","Facebook/Meta","Manual","Website","Walk-in","Referral"];
const MAX_TRACK_SEC = 300; // 5 minutes cap

const Sk = ({ h=16, r=6 }) => (
  <div className="bda-lsk" style={{ height:h, borderRadius:r }} />
);

/* ════════════════════════════════════════
   TIME TRACKER HOOK
   Starts a timer, returns elapsed seconds.
   On unmount or manual stop, fires callback
   with capped duration.
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
   LEAD ROW — expanded / collapsed
════════════════════════════════════════ */
const LeadRow = ({ lead, onEdit, onJunk, bdaEmail, bdaName }) => {
  const [open, setOpen] = useState(false);
  const src  = srcStyle(lead.source);
  const stat = statusStyle(lead.status);

  // Track time while expanded (view session)
  const handleViewStop = async (secs) => {
    if (!bdaEmail || secs <= 0) return;
    try {
      await axios.post(`${API}/leads/${lead.id}/track-time`, {
        bda_email:    bdaEmail,
        bda_name:     bdaName || bdaEmail,
        session_type: "view",
        duration_sec: secs,
      });
    } catch (_) { /* silent fail — don't interrupt UX */ }
  };

  const elapsed = useTimeTracker(open, handleViewStop);

  const handleToggle = () => setOpen(o => !o);

  return (
    <>
      <tr
        className={`blr ${open ? "blr--open" : ""}`}
        onClick={handleToggle}
      >
        <td>
          <div className="blr__name">{lead.name}</div>
          <div className="blr__phone">{lead.phone}</div>
        </td>
        <td className="blr__email">{lead.email || "—"}</td>
        <td>
          <span className="bda-pill" style={{ background: stat.bg, color: stat.color }}>
            {lead.status || "—"}
          </span>
        </td>
        <td>
          <span className="bda-pill" style={{ background: src.bg, color: src.color }}>
            {lead.source || "—"}
          </span>
        </td>
        <td className="blr__city">{lead.city || "—"}</td>
        <td className="blr__assign">{lead.assigned_to || "—"}</td>
        <td className="blr__date">
          {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
        </td>
        <td onClick={e => e.stopPropagation()}>
          <div className="blr__actions">
            <button className="blr__btn blr__btn--edit" onClick={() => onEdit(lead)}>Edit</button>
            <button className="blr__btn blr__btn--junk" onClick={() => onJunk(lead)}>Junk</button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="blr__detail-row">
          <td colSpan={8}>
            <div className="blr__detail">
              {/* Live timer badge */}
              <div className="blr__timer-badge">
                <span className="blr__timer-dot" />
                Viewing · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2,"0")} / 5:00
              </div>
              <div className="blr__detail-grid">
                <DetailItem label="WhatsApp"      value={lead.whatsapp} />
                <DetailItem label="Building Type" value={lead.building_type} />
                <DetailItem label="Floors"        value={lead.floors} />
                <DetailItem label="Plot Size"     value={lead.measurement} />
                <DetailItem label="Sq. Ft"        value={lead.sqft} />
                <DetailItem label="Budget"        value={lead.budget ? `₹${Number(lead.budget).toLocaleString("en-IN")}` : null} />
                <DetailItem label="Quotation Sent" value={lead.quotation_sent === true ? "Yes" : lead.quotation_sent === false ? "No" : null} />
                <DetailItem label="Follow-up"     value={lead.snooze_until ? new Date(lead.snooze_until).toLocaleDateString("en-IN") : null} />
                <DetailItem label="Description"   value={lead.description} wide />
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
   EDIT MODAL — with time tracking
════════════════════════════════════════ */
const EditModal = ({ lead, onClose, onSave, bdaEmail, bdaName }) => {
  const [form, setForm] = useState({ ...lead });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Track time while modal is open (edit session)
  const handleEditStop = async (secs) => {
    if (!bdaEmail || secs <= 0) return;
    try {
      await axios.post(`${API}/leads/${lead.id}/track-time`, {
        bda_email:    bdaEmail,
        bda_name:     bdaName || bdaEmail,
        session_type: "edit",
        duration_sec: secs,
      });
    } catch (_) { /* silent fail */ }
  };

  const elapsed = useTimeTracker(true, handleEditStop);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/leads/${lead.id}`, form);
      onSave();
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bda-modal-overlay" onClick={onClose}>
      <div className="bda-modal" onClick={e => e.stopPropagation()}>
        <div className="bda-modal__header">
          <h2 className="bda-modal__title">Edit Lead — {lead.name}</h2>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* Live timer in modal header */}
            <div className="bda-modal__timer">
              <span className="blr__timer-dot" />
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2,"0")} / 5:00
            </div>
            <button className="bda-modal__close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="bda-modal__body">
          <div className="bda-modal__grid">
            <Field label="Name"         value={form.name}         onChange={v => set("name",v)} />
            <Field label="Phone"        value={form.phone}        onChange={v => set("phone",v)} />
            <Field label="Email"        value={form.email}        onChange={v => set("email",v)} />
            <Field label="City"         value={form.city}         onChange={v => set("city",v)} />
            <FieldSelect label="Status" value={form.status}       onChange={v => set("status",v)} options={ALL_STATUSES} />
            <FieldSelect label="Source" value={form.source}       onChange={v => set("source",v)} options={ALL_SOURCES} />
            <Field label="Assigned To"  value={form.assigned_to}  onChange={v => set("assigned_to",v)} />
            <Field label="Budget (₹)"   value={form.budget}       onChange={v => set("budget",v)} />
            <Field label="Building Type" value={form.building_type} onChange={v => set("building_type",v)} />
            <Field label="Floors"       value={form.floors}       onChange={v => set("floors",v)} />
            <Field label="Sq. Ft"       value={form.sqft}         onChange={v => set("sqft",v)} />
            <Field label="Description"  value={form.description}  onChange={v => set("description",v)} wide />
          </div>
        </div>
        <div className="bda-modal__footer">
          <button className="bda-btn-outline" onClick={onClose}>Cancel</button>
          <button className="bda-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
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
   MAIN PAGE
   Pass bdaEmail + bdaName as props from your
   auth context / parent component.
   Example: <BDALeads bdaEmail="user@co.in" bdaName="Ravi Kumar" />
════════════════════════════════════════ */
const BDALeads = ({ bdaEmail, bdaName }) => {
  const navigate = useNavigate();
  const [leads,    setLeads]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [statusF,  setStatusF]  = useState("All");
  const [sourceF,  setSourceF]  = useState("All");
  const [assignF,  setAssignF]  = useState("All");
  const [sort,     setSort]     = useState("newest");
  const [page,     setPage]     = useState(1);
  const [editLead, setEditLead] = useState(null);
  const PER_PAGE = 12;

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/leads`);
      setLeads(res.data.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* filter + sort */
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

    if (statusF !== "All")
      arr = arr.filter(l => (l.status||"").toLowerCase() === statusF.toLowerCase());

    if (sourceF !== "All")
      arr = arr.filter(l => normalizeSource(l.source) === sourceF);

    if (assignF === "assigned")
      arr = arr.filter(l => l.assigned_to && l.assigned_to.trim() !== "");
    if (assignF === "unassigned")
      arr = arr.filter(l => !l.assigned_to || l.assigned_to.trim() === "");

    arr.sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sort === "name")   return (a.name||"").localeCompare(b.name||"");
      return 0;
    });

    return arr;
  }, [leads, search, statusF, sourceF, assignF, sort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const handleJunk = async (lead) => {
    if (!window.confirm(`Mark "${lead.name}" as junk?`)) return;
    try {
      await axios.put(`${API}/leads/${lead.id}/request-junk`);
      fetchLeads();
    } catch (err) { alert("Failed: " + err.message); }
  };

  const handleSaved = () => { setEditLead(null); fetchLeads(); };

  const clearFilters = () => {
    setStatusF("All");
    setSourceF("All");
    setAssignF("All");
    setSearch("");
    setPage(1);
  };

  const hasFilters = statusF !== "All" || sourceF !== "All" || assignF !== "All" || search;

  /* summary counts */
  const counts = useMemo(() => {
    const c = { total: leads.length, new: 0, followup: 0, converted: 0 };
    leads.forEach(l => {
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
          <button className="bda-btn-outline" onClick={fetchLeads}>↻ Refresh</button>
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
            onClick={clearFilters}>
            Clear Filters
          </button>
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
            <button className="bda-btn-primary" onClick={() => navigate("/bda/add-lead")}>
              + Add Lead
            </button>
          </div>
        ) : (
          <div className="bda-table-wrap">
            <table className="bda-leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>City</th>
                  <th>Assigned</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(lead => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onEdit={setEditLead}
                    onJunk={handleJunk}
                    bdaEmail={bdaEmail}
                    bdaName={bdaName}
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
          <button className="bda-pg-btn" disabled={page === 1} onClick={() => setPage(p => p-1)}>
            ← Prev
          </button>
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
                    onClick={() => setPage(p)}>
                    {p}
                  </button>
                )
              )}
          </div>
          <button className="bda-pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p+1)}>
            Next →
          </button>
          <span className="bda-pg-info">
            {(page-1)*PER_PAGE + 1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
          </span>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editLead && (
        <EditModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSave={handleSaved}
          bdaEmail={bdaEmail}
          bdaName={bdaName}
        />
      )}
    </div>
  );
};

export default BDALeads;