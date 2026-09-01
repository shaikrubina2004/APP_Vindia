// src/pages/siteEngineer/LabourRegistry.jsx
// Site Engineer registers each worker's personal details.
// PM can view all registered labour for their projects.
// Features:
//   - Register new worker with full personal + trade info
//   - Photo / ID document upload
//   - Search, filter, paginate registered workers
//   - Mark worker as active / inactive / suspended
//   - Export worker list

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import api from "../../services/api";
import "../../styles/Labourregistry.css";

/* ── Constants ───────────────────────────────────────────── */
const PAGE_SIZE = 10;

const TRADES = [
  "Mason","Carpenter","Steel Fixer / Rebar","Plumber","Electrician",
  "Welder","Painter","Plasterer","Tiler","Waterproofing Applicator",
  "MEP Technician","Crane Operator","Excavator Operator","Scaffolder",
  "Formwork Carpenter","General Labour","Supervisor","Foreman","Other",
];

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"];

const STATUS_CFG = {
  active:    { label:"Active",    bg:"#E1F5EE", color:"#085041", border:"#5DCAA5" },
  inactive:  { label:"Inactive",  bg:"#F1EFE8", color:"#444441", border:"#B4B2A9" },
  suspended: { label:"Suspended", bg:"#FCEBEB", color:"#791F1F", border:"#E8A0A0" },
};

const BLANK = {
  // Personal
  full_name: "", date_of_birth: "", gender: "male",
  blood_group: "Unknown", nationality: "",
  // ID
  id_type: "aadhaar", id_number: "", pf_number: "", esic_number: "",
  // Contact
  phone: "", emergency_contact_name: "", emergency_contact_phone: "",
  address: "",
  // Work
  trade: "", contractor_name: "", contractor_phone: "",
  daily_wage: "", project_id: "",
  // Medical
  medical_conditions: "", allergies: "",
  // Docs
  photo: null, id_doc: null,
};

function stableKey(w) { return w?.id != null ? String(w.id) : `${w?.full_name||""}|${w?.id_number||""}`; }
function fmtDate(s)   { return s ? new Date(s).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "—"; }
function age(dob)     { if (!dob) return "—"; const d = new Date(dob); const diff = Date.now() - d.getTime(); return Math.floor(diff / (1000*60*60*24*365.25)) + " yrs"; }

function StatusBadge({ s }) {
  const c = STATUS_CFG[s] || STATUS_CFG.active;
  return <span className="lr-badge" style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>{c.label}</span>;
}

function Avatar({ name, size = 36 }) {
  const initials = (name||"?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const colors   = ["#185FA5","#085041","#633806","#4A1A6E","#0A4174","#791F1F"];
  const color    = colors[(name||"").charCodeAt(0) % colors.length];
  return (
    <div className="lr-avatar" style={{ width:size, height:size, background:color, fontSize:size*0.38 }}>
      {initials}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function LabourRegistry() {
  const [tab, setTab]               = useState("registry"); // "registry" | "register"
  const [workers, setWorkers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState({ ...BLANK });
  const [errors, setErrors]         = useState({});
  const [submitting, setSub]        = useState(false);
  const [submitStatus, setStatus]   = useState("");
  const [search, setSearch]         = useState("");
  const [filterTrade, setFT]        = useState("all");
  const [filterStatus, setFS]       = useState("all");
  const [page, setPage]             = useState(1);
  const [expandedId, setExp]        = useState(null);
  const [updating, setUpdating]     = useState(null);
  const [projects, setProjects]     = useState([]);
  const [editId, setEditId] = useState(null);
  const photoRef  = useRef(null);
  const idDocRef  = useRef(null);
  const alive     = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadWorkers();
    loadProjects();
    return () => { alive.current = false; };
  }, []);

  async function loadWorkers() {
  setLoading(true);

  try {
    const res = await api.get("/labour-registry");

    if (!alive.current) return;

    setWorkers(Array.isArray(res?.data) ? res.data : []);
  } catch {
    // Keep the UI stable when the API is unavailable.
    setWorkers([]);
  } finally {
    if (alive.current) setLoading(false);
  }
}

  async function loadProjects() {
    try { const r = await api.get("/projects"); setProjects(Array.isArray(r?.data) ? r.data : []); } catch {}
  }

  const setF = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  }, []);

  /* ── Validate ───────────────────────────────────────────── */
  function validate(f) {
    const e = {};
    if (!f.full_name || f.full_name.trim().length < 2) e.full_name = "Full name required";
    if (!f.trade)                                       e.trade     = "Select a trade";
    if (!f.phone || f.phone.trim().length < 8)          e.phone     = "Valid phone number required";
    if (!f.id_number || f.id_number.trim().length < 4)  e.id_number = "ID number required";
    if (!f.contractor_name || f.contractor_name.trim().length < 2) e.contractor_name = "Contractor name required";
    if (!f.emergency_contact_name) e.emergency_contact_name = "Emergency contact name required";
    if (!f.emergency_contact_phone) e.emergency_contact_phone = "Emergency contact phone required";
    return e;
  }

  /* ── Submit ─────────────────────────────────────────────── */
  const submit = useCallback(async ev => {
    ev?.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }
    setSub(true); setStatus("Registering worker…");

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "photo" || k === "id_doc") return;
        fd.append(k, v ?? "");
      });
      if (form.photo)  fd.append("photo",  form.photo,  form.photo.name);
      if (form.id_doc) fd.append("id_doc", form.id_doc, form.id_doc.name);

if (editId) {
  await api.put(`/labour-registry/${editId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
} else {
  await api.post("/labour-registry", fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
}      await loadWorkers();
      setForm({ ...BLANK });
      setEditId(null);
      setStatus("Worker registered successfully ✓");
      setTab("registry");
    } catch (err) {
      setStatus(err?.response?.data?.error || "Registration failed — check connection");
    } finally { if (alive.current) setSub(false); }
  }, [form]);

  /* ── Update status ──────────────────────────────────────── */
  const updateStatus = useCallback(async (id, status) => {
    if (updating) return;
    setUpdating(id);
    try {
      await api.patch(`/labour-registry/${id}/status`, { status });
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, status } : w));
    } catch { alert("Update failed"); }
    finally { if (alive.current) setUpdating(null); }
  }, [updating]);

  /* ── Filters ────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = workers.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        (w.full_name        ||"").toLowerCase().includes(q) ||
        (w.id_number        ||"").toLowerCase().includes(q) ||
        (w.trade            ||"").toLowerCase().includes(q) ||
        (w.contractor_name  ||"").toLowerCase().includes(q) ||
        (w.phone            ||"").toLowerCase().includes(q)
      );
    }
    if (filterTrade  !== "all") list = list.filter(w => w.trade  === filterTrade);
    if (filterStatus !== "all") list = list.filter(w => (w.status||"active") === filterStatus);
    return list;
  }, [workers, search, filterTrade, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const stats = useMemo(() => ({
    total:     workers.length,
    active:    workers.filter(w => !w.status || w.status === "active").length,
    trades:    [...new Set(workers.map(w => w.trade).filter(Boolean))].length,
    contracts: [...new Set(workers.map(w => w.contractor_name).filter(Boolean))].length,
  }), [workers]);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="lr-page">

      {/* HEADER */}
      <div className="lr-page-header">
        <div>
          <div className="lr-eyebrow">Site Engineer → Project Manager</div>
          <h1 className="lr-title">Labour Registry</h1>
          <div className="lr-sub">Register all workers on site — personal details, trade, contractor, emergency contacts</div>
        </div>
        <button className="lr-btn lr-btn--primary" onClick={() => { setTab(tab === "register" ? "registry" : "register"); setStatus(""); }}>
          {tab === "register" ? "← Back to Registry" : "+ Register Worker"}
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="lr-stats-bar">
        {[
          { icon:"👷", num:stats.total,     label:"Total Workers",     cls:"" },
          { icon:"✅", num:stats.active,    label:"Active on Site",    cls:"lr-stat--success" },
          { icon:"🔨", num:stats.trades,    label:"Trades Registered", cls:"" },
          { icon:"🏗",  num:stats.contracts, label:"Contractors",       cls:"" },
        ].map((s,i) => (
          <div key={i} className={`lr-stat-card ${s.cls}`}>
            <div className="lr-stat-icon">{s.icon}</div>
            <div className="lr-stat-info">
              <div className="lr-stat-num">{s.num}</div>
              <div className="lr-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ REGISTER FORM ═══════════════════════════════════ */}
      {tab === "register" && (
        <div className="lr-form-layout">
          <div className="lr-panel">
            <div className="lr-panel-head">
              <div className="lr-panel-title">Register New Worker</div>
              <div className="lr-panel-sub">All fields marked * are mandatory</div>
            </div>
            <div className="lr-panel-body">
              <form onSubmit={submit} noValidate>

                {/* ── PERSONAL INFORMATION ─────────────────── */}
                <div className="lr-section">
                  <div className="lr-section-title">
                    <span className="lr-section-icon">👤</span> Personal Information
                  </div>
                  <div className="lr-grid-3">
                    <div className="lr-field lr-full">
                      <label className="lr-label">Full Name *</label>
                      <input className="lr-input" value={form.full_name} onChange={e=>setF("full_name",e.target.value)} placeholder="As per government ID"/>
                      {errors.full_name && <div className="lr-error">{errors.full_name}</div>}
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Date of Birth</label>
                      <input type="date" className="lr-input" value={form.date_of_birth} onChange={e=>setF("date_of_birth",e.target.value)}/>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Gender</label>
                      <select className="lr-select" value={form.gender} onChange={e=>setF("gender",e.target.value)}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Blood Group</label>
                      <select className="lr-select" value={form.blood_group} onChange={e=>setF("blood_group",e.target.value)}>
                        {BLOOD_GROUPS.map(b=><option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Nationality</label>
                      <input className="lr-input" value={form.nationality} onChange={e=>setF("nationality",e.target.value)} placeholder="e.g. Indian"/>
                    </div>
                    <div className="lr-field lr-full">
                      <label className="lr-label">Home Address</label>
                      <textarea className="lr-textarea" value={form.address} onChange={e=>setF("address",e.target.value)} placeholder="Permanent home address" style={{minHeight:60}}/>
                    </div>
                  </div>
                </div>

                {/* ── ID & REGISTRATION NUMBERS ────────────── */}
                <div className="lr-section">
                  <div className="lr-section-title">
                    <span className="lr-section-icon">🪪</span> Identity &amp; Registration
                  </div>
                  <div className="lr-grid-3">
                    <div className="lr-field">
                      <label className="lr-label">ID Type</label>
                      <select className="lr-select" value={form.id_type} onChange={e=>setF("id_type",e.target.value)}>
                        <option value="aadhaar">Aadhaar Card</option>
                        <option value="voter">Voter ID</option>
                        <option value="passport">Passport</option>
                        <option value="driving">Driving Licence</option>
                        <option value="pan">PAN Card</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">ID Number *</label>
                      <input className="lr-input" value={form.id_number} onChange={e=>setF("id_number",e.target.value)} placeholder="Enter ID number"/>
                      {errors.id_number && <div className="lr-error">{errors.id_number}</div>}
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">PF Number</label>
                      <input className="lr-input" value={form.pf_number} onChange={e=>setF("pf_number",e.target.value)} placeholder="Provident Fund number"/>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">ESIC Number</label>
                      <input className="lr-input" value={form.esic_number} onChange={e=>setF("esic_number",e.target.value)} placeholder="Employee State Insurance"/>
                    </div>
                  </div>
                </div>

                {/* ── CONTACT ──────────────────────────────── */}
                <div className="lr-section">
                  <div className="lr-section-title">
                    <span className="lr-section-icon">📞</span> Contact Details
                  </div>
                  <div className="lr-grid-3">
                    <div className="lr-field">
                      <label className="lr-label">Mobile Number *</label>
                      <input className="lr-input" value={form.phone} onChange={e=>setF("phone",e.target.value)} placeholder="10-digit mobile number" type="tel"/>
                      {errors.phone && <div className="lr-error">{errors.phone}</div>}
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Emergency Contact Name *</label>
                      <input className="lr-input" value={form.emergency_contact_name} onChange={e=>setF("emergency_contact_name",e.target.value)} placeholder="Father / Spouse / Sibling"/>
                      {errors.emergency_contact_name && <div className="lr-error">{errors.emergency_contact_name}</div>}
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Emergency Contact Phone *</label>
                      <input className="lr-input" value={form.emergency_contact_phone} onChange={e=>setF("emergency_contact_phone",e.target.value)} placeholder="Emergency mobile number" type="tel"/>
                      {errors.emergency_contact_phone && <div className="lr-error">{errors.emergency_contact_phone}</div>}
                    </div>
                  </div>
                </div>

                {/* ── WORK DETAILS ─────────────────────────── */}
                <div className="lr-section">
                  <div className="lr-section-title">
                    <span className="lr-section-icon">🔨</span> Work Details
                  </div>
                  <div className="lr-grid-3">
                    <div className="lr-field">
                      <label className="lr-label">Trade / Skill *</label>
                      <select className="lr-select" value={form.trade} onChange={e=>setF("trade",e.target.value)}>
                        <option value="">Select trade…</option>
                        {TRADES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      {errors.trade && <div className="lr-error">{errors.trade}</div>}
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Project</label>
                      <select className="lr-select" value={form.project_id||""} onChange={e=>setF("project_id",e.target.value)}>
                        <option value="">Select project</option>
                        {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Daily Wage (₹)</label>
                      <input type="number" min="0" className="lr-input" value={form.daily_wage} onChange={e=>setF("daily_wage",e.target.value)} placeholder="e.g. 700"/>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Contractor Name *</label>
                      <input className="lr-input" value={form.contractor_name} onChange={e=>setF("contractor_name",e.target.value)} placeholder="Labour contractor / agency name"/>
                      {errors.contractor_name && <div className="lr-error">{errors.contractor_name}</div>}
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Contractor Phone</label>
                      <input className="lr-input" value={form.contractor_phone} onChange={e=>setF("contractor_phone",e.target.value)} placeholder="Contractor mobile number" type="tel"/>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Date Joined Site</label>
                      <input type="date" className="lr-input" value={form.date_joined||""} onChange={e=>setF("date_joined",e.target.value)}/>
                    </div>
                  </div>
                </div>

                {/* ── MEDICAL ──────────────────────────────── */}
                <div className="lr-section">
                  <div className="lr-section-title">
                    <span className="lr-section-icon">🏥</span> Medical Information
                  </div>
                  <div className="lr-grid-2">
                    <div className="lr-field">
                      <label className="lr-label">Known Medical Conditions</label>
                      <textarea className="lr-textarea" value={form.medical_conditions} onChange={e=>setF("medical_conditions",e.target.value)} placeholder="Diabetes, hypertension, heart condition, etc. (or 'None')"/>
                    </div>
                    <div className="lr-field">
                      <label className="lr-label">Known Allergies</label>
                      <textarea className="lr-textarea" value={form.allergies} onChange={e=>setF("allergies",e.target.value)} placeholder="Drug allergies, food allergies, etc. (or 'None')"/>
                    </div>
                  </div>
                </div>

                {/* ── DOCUMENTS ────────────────────────────── */}
                <div className="lr-section">
                  <div className="lr-section-title">
                    <span className="lr-section-icon">📄</span> Documents &amp; Photo
                  </div>
                  <div className="lr-doc-grid">
                    {/* Worker Photo */}
                    <div className="lr-doc-slot">
                      <div className="lr-doc-label">Worker Photo</div>
                      <div className="lr-doc-drop" onClick={()=>photoRef.current?.click()}>
                        {form.photo
                          ? <img src={URL.createObjectURL(form.photo)} alt="preview" className="lr-doc-preview"/>
                          : <><span className="lr-doc-icon">📷</span><span>Click to upload photo</span></>
                        }
                        <input ref={photoRef} type="file" accept="image/*" className="lr-file-hidden" onChange={e=>{ if(e.target.files[0]) setF("photo",e.target.files[0]); e.target.value=null; }}/>
                      </div>
                      {form.photo && <div className="lr-doc-name">{form.photo.name}</div>}
                    </div>

                    {/* ID Document */}
                    <div className="lr-doc-slot">
                      <div className="lr-doc-label">ID Document (scan / photo)</div>
                      <div className="lr-doc-drop" onClick={()=>idDocRef.current?.click()}>
                        {form.id_doc
                          ? <><span className="lr-doc-icon">✅</span><span>{form.id_doc.name}</span></>
                          : <><span className="lr-doc-icon">🪪</span><span>Click to upload ID</span></>
                        }
                        <input ref={idDocRef} type="file" accept="image/*,application/pdf" className="lr-file-hidden" onChange={e=>{ if(e.target.files[0]) setF("id_doc",e.target.files[0]); e.target.value=null; }}/>
                      </div>
                      {form.id_doc && <div className="lr-doc-name">{form.id_doc.name}</div>}
                    </div>
                  </div>
                </div>

                {/* SUBMIT */}
                <div className="lr-submit-row">
                  <button type="submit" className="lr-btn lr-btn--primary" disabled={submitting}>
                    {submitting ? "Registering…" : "✓ Register Worker"}
                  </button>
                  <button type="button" className="lr-btn lr-btn--ghost" onClick={()=>{ setForm({...BLANK}); setErrors({}); setStatus(""); }}>
                    Clear Form
                  </button>
                  {submitStatus && (
                    <span className={`lr-status ${submitStatus.includes("✓")?"lr-status--ok":submitStatus.includes("Fix")||submitStatus.includes("failed")?"lr-status--err":"lr-status--saving"}`}>
                      {submitStatus}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Aside tips */}
          <div className="lr-aside">
            <div className="lr-aside-card">
              <div className="lr-aside-title">Why We Collect This</div>
              <ul className="lr-aside-list">
                <li><strong>Legal compliance</strong> — required under labour laws</li>
                <li><strong>Emergency response</strong> — immediate contact if incident</li>
                <li><strong>Wage records</strong> — PF, ESIC, salary calculations</li>
                <li><strong>Site security</strong> — know who is on site at all times</li>
                <li><strong>Insurance claims</strong> — blood group and medical history</li>
              </ul>
            </div>
            <div className="lr-aside-card">
              <div className="lr-aside-title">Required Documents</div>
              <ul className="lr-aside-list">
                <li>Government-issued photo ID</li>
                <li>Recent passport photo</li>
                <li>PF / ESIC documents (if available)</li>
                <li>Medical fitness certificate (if applicable)</li>
              </ul>
            </div>
            <div className="lr-aside-card">
              <div className="lr-aside-title">Mandatory Fields</div>
              <div className="lr-aside-text">Full name, trade, phone, ID number, contractor name, and emergency contact are mandatory before the worker can start on site.</div>
            </div>
          </div>
        </div>
      )}

      {/* ══ REGISTRY LIST ═══════════════════════════════════ */}
      {tab === "registry" && (
        <>
          {/* Filters */}
          <div className="lr-filter-bar">
            <div className="lr-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search name, ID number, contractor, phone…"/>
            </div>
            <select className="lr-select lr-select--sm" value={filterTrade} onChange={e=>{setFT(e.target.value);setPage(1);}}>
              <option value="all">All trades</option>
              {TRADES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <select className="lr-select lr-select--sm" value={filterStatus} onChange={e=>{setFS(e.target.value);setPage(1);}}>
              <option value="all">All status</option>
              {Object.entries(STATUS_CFG).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
            </select>
            {(search||filterTrade!=="all"||filterStatus!=="all") && (
              <button className="lr-btn lr-btn--ghost lr-btn--sm" onClick={()=>{setSearch("");setFT("all");setFS("all");setPage(1);}}>Clear</button>
            )}
          </div>

          <div className="lr-panel">
            <div className="lr-panel-head">
              <div className="lr-panel-title">Registered Workers</div>
              <span className="lr-pill">{filtered.length} workers</span>
            </div>

            {loading ? (
              <div className="lr-loading"><div className="lr-spinner"/>Loading registry…</div>
            ) : pageItems.length === 0 ? (
              <div className="lr-empty">
                <div className="lr-empty-icon">👷</div>
                <div>{workers.length === 0 ? "No workers registered yet" : "No workers match this filter"}</div>
                <button className="lr-btn lr-btn--primary" onClick={()=>setTab("register")}>+ Register First Worker</button>
              </div>
            ) : pageItems.map(w => (
              <div key={stableKey(w)} className="lr-worker-row">

                {/* Summary */}
                <div className="lr-worker-summary" onClick={()=>setExp(expandedId===w.id?null:w.id)}>
                  <Avatar name={w.full_name} size={42}/>
                  <div className="lr-worker-info">
                    <div className="lr-worker-name">{w.full_name}</div>
                    <div className="lr-worker-meta">
                      <span className="lr-trade-tag">{w.trade||"—"}</span>
                      {w.contractor_name && <span>·  {w.contractor_name}</span>}
                      {w.phone          && <span>·  {w.phone}</span>}
                    </div>
                  </div>
                  <div className="lr-worker-right">
                    <StatusBadge s={w.status||"active"}/>
                    <span className="lr-expand-btn">{expandedId===w.id?"▲":"▼"}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === w.id && (
                  <div className="lr-worker-detail">
                    <div className="lr-detail-grid">

                      {/* Personal */}
                      <div className="lr-detail-section">
                        <div className="lr-detail-title">Personal</div>
                        {[
                          ["Date of Birth", fmtDate(w.date_of_birth) + (w.date_of_birth ? ` (${age(w.date_of_birth)})` : "")],
                          ["Gender",        w.gender],
                          ["Blood Group",   w.blood_group],
                          ["Nationality",   w.nationality],
                          ["Address",       w.address],
                        ].map(([l,v])=>v&&<div key={l} className="lr-detail-row"><span>{l}</span><strong>{v}</strong></div>)}
                      </div>

                      {/* ID & Registration */}
                      <div className="lr-detail-section">
                        <div className="lr-detail-title">Identity</div>
                        {[
                          ["ID Type",    w.id_type?.toUpperCase()],
                          ["ID Number",  w.id_number],
                          ["PF Number",  w.pf_number],
                          ["ESIC Number",w.esic_number],
                        ].map(([l,v])=>v&&<div key={l} className="lr-detail-row"><span>{l}</span><strong>{v}</strong></div>)}
                      </div>

                      {/* Contact */}
                      <div className="lr-detail-section">
                        <div className="lr-detail-title">Contact</div>
                        {[
                          ["Mobile",         w.phone],
                          ["Emergency Name",  w.emergency_contact_name],
                          ["Emergency Phone", w.emergency_contact_phone],
                        ].map(([l,v])=>v&&<div key={l} className="lr-detail-row"><span>{l}</span><strong>{v}</strong></div>)}
                      </div>

                      {/* Work */}
                      <div className="lr-detail-section">
                        <div className="lr-detail-title">Work</div>
                        {[
                          ["Trade",          w.trade],
                          ["Contractor",     w.contractor_name],
                          ["Contractor Ph",  w.contractor_phone],
                          ["Daily Wage",     w.daily_wage ? `₹${Number(w.daily_wage).toLocaleString()}` : ""],
                          ["Joined Site",    fmtDate(w.date_joined)],
                          ["Registered By",  w.registered_by_name],
                        ].map(([l,v])=>v&&v!=="—"&&<div key={l} className="lr-detail-row"><span>{l}</span><strong>{v}</strong></div>)}
                      </div>

                      {/* Medical */}
                      {(w.medical_conditions||w.allergies) && (
                        <div className="lr-detail-section">
                          <div className="lr-detail-title">Medical</div>
                          {w.medical_conditions && <div className="lr-detail-row"><span>Conditions</span><strong>{w.medical_conditions}</strong></div>}
                          {w.allergies          && <div className="lr-detail-row"><span>Allergies</span><strong>{w.allergies}</strong></div>}
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    {(w.photo_url || w.id_doc_url) && (
                      <div className="lr-doc-links">
                        {w.photo_url   && <a href={w.photo_url}   target="_blank" rel="noopener noreferrer" className="lr-doc-link">📷 View Photo</a>}
                        {w.id_doc_url  && <a href={w.id_doc_url}  target="_blank" rel="noopener noreferrer" className="lr-doc-link">🪪 View ID Document</a>}
                      </div>
                    )}

                    {/* Status actions */}
                    <div className="lr-worker-actions">
                      {(w.status||"active") !== "active" && (
                        <button className="lr-btn lr-btn--success lr-btn--sm" onClick={()=>updateStatus(w.id,"active")} disabled={updating===w.id}>
                          ✓ Set Active
                        </button>
                      )}
                      {(w.status||"active") !== "inactive" && (
                        <button className="lr-btn lr-btn--ghost lr-btn--sm" onClick={()=>updateStatus(w.id,"inactive")} disabled={updating===w.id}>
                          Mark Inactive
                        </button>
                      )}
                      <button
  className="lr-btn lr-btn--ghost lr-btn--sm"
  onClick={() => {
    setForm({ ...BLANK, ...w });
    setEditId(w.id);
    setTab("register");
  }}
>
  ✏ Edit
</button>
                      {(w.status||"active") !== "suspended" && (
                        <button className="lr-btn lr-btn--danger lr-btn--sm" onClick={()=>updateStatus(w.id,"suspended")} disabled={updating===w.id}>
                          ⚠ Suspend
                        </button>
                      )}
                      {updating === w.id && <span className="lr-updating">Updating…</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="lr-pagination">
                <span className="lr-page-info">Page {page} of {totalPages} · {filtered.length} workers</span>
                <div className="lr-page-btns">
                  <button className="lr-page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>← Prev</button>
                  <button className="lr-page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}