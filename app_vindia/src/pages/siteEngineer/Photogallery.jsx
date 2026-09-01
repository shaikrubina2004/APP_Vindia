// src/pages/siteEngineer/PhotoGallery.jsx
// UPGRADED:
//   ✅ Before / After photo pairs per zone per day
//   ✅ Share photos to Progress, RFI, Snag, NCR pages
//   ✅ Client view — filtered, read-only, download-enabled
//   ✅ Download individual photo or full date-set as zip
//   ✅ Attach from other pages via URL params
//   ✅ Fully responsive

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import "../../styles/PhotoGallery.css";

/* ── Constants ───────────────────────────────────────────── */
const PAGE_SIZE = 12;
const QUEUE_KEY = "photos:queue:v2";

const ACTIVITY_TAGS = [
  "Excavation","Foundations","Rebar Fixing","Formwork","Concrete Pour",
  "Curing","Column Casting","Slab Work","Masonry","MEP Rough-in",
  "Plastering","Finishing","Waterproofing","Inspection","Defect / NCR",
  "Before Work","After Work","Other",
];

const SHARE_TARGETS = [
  { value: "progress",        label: "Progress Entry"    },
  { value: "rfi",             label: "RFI"               },
  { value: "snag",            label: "Snag List"         },
  { value: "ncr",             label: "NCR"               },
  { value: "diary",           label: "Daily Diary"       },
  { value: "approval",        label: "Approval Request"  },
  { value: "client_report",   label: "Client Report"     },
];

/* ── Helpers ─────────────────────────────────────────────── */
const ls = {
  load: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function enqueue(p) {
  const q = ls.load(QUEUE_KEY) || [];
  q.push({ id: `q_${Date.now()}`, payload: p, createdAt: new Date().toISOString() });
  ls.save(QUEUE_KEY, q);
}

function nowISO()   { return new Date().toISOString().slice(0, 10); }
function stableKey(it) { return it?.id != null ? String(it.id) : `${it?.filename || ""}|${it?.createdAt || ""}`; }
function fmtDate(s) {
  return s ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short", year:"numeric" }) : "—";
}

const BLANK = {
  date: "", zone: "", activity: "", phase: "general",
  description: "", linked_rfi: "", linked_task: "",
  project_id: "", milestone_id: "", task_id: "",
  visibility: "internal", // "internal" | "client" | "shared"
  files: [],
};

/* ── Phase badge ─────────────────────────────────────────── */
function PhaseBadge({ phase }) {
  const cfg = {
    before:  { label: "Before Work", bg: "#FAEEDA", color: "#633806", border: "#EF9F27" },
    after:   { label: "After Work",  bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
    general: { label: "General",     bg: "#E6F1FB", color: "#185FA5", border: "#90C1EF" },
    defect:  { label: "Defect",      bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
  };
  const c = cfg[phase] || cfg.general;
  return (
    <span className="pg-phase-badge" style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function PhotoGallery() {
  const [searchParams] = useSearchParams();

  // Pre-fill from other pages (e.g. Progress passes ?link=progress&ref=PROG-001)
  const prefillLink = searchParams.get("link") || "";
  const prefillRef  = searchParams.get("ref")  || "";

  const [form, setForm]           = useState({ ...BLANK, date: nowISO(), linked_task: prefillRef });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUS]     = useState("");
  const [photos, setPhotos]       = useState([]);
  const [listLoading, setLL]      = useState(true);
  const [tab, setTab]             = useState("gallery");
  const [lightbox, setLightbox]   = useState(null);
  const [shareModal, setShareModal] = useState(null); // photo object
  const [shareTarget, setShareTarget] = useState("progress");
  const [shareRef, setShareRef]   = useState("");
  const [shareSaving, setShareSaving] = useState(false);
  const [viewMode, setViewMode]   = useState("all"); // "all" | "client" | "before-after"
  const [search, setSearch]       = useState("");
  const [filterZone, setFZ]       = useState("");
  const [filterAct, setFA]        = useState("");
  const [filterDate, setFD]       = useState("");
  const [filterPhase, setFP]      = useState("");
  const [page, setPage]           = useState(1);
  const [projects, setProjects]   = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks]         = useState([]);
  const fileRef = useRef(null);
  const alive   = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadPhotos();
    loadProjects();
    if (prefillLink) setTab("upload");
    return () => { alive.current = false; };
  }, []);

  /* ── Load functions ─────────────────────────────────────── */
  async function loadPhotos() {
    setLL(true);
    try {
      const res = await api.get("/photos");
      if (!alive.current) return;
      const raw  = Array.isArray(res?.data) ? res.data.slice().reverse() : [];
      const seen = new Set();
      setPhotos(raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; }));
    } catch { /* offline */ }
    finally { if (alive.current) setLL(false); }
  }

  async function loadProjects() {
    try { const r = await api.get("/projects"); setProjects(Array.isArray(r?.data) ? r.data : []); } catch {}
  }
  async function loadMilestones(pid) {
    try { const r = await api.get(`/diary/milestones?project_id=${pid}`); setMilestones(r?.data || []); } catch {}
  }
  async function loadTasks(mid) {
    try { const r = await api.get(`/diary/wbs?milestone_id=${mid}&project_id=${form.project_id}`); setTasks(r?.data || []); } catch {}
  }

  /* ── Form helpers ───────────────────────────────────────── */
  const setF = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

 const handleFiles = (e) => {
  

  const file = e.target.files[0];
  setForm(f => ({ ...f, files: file ? [file] : [] }));
};

  const removeFile = useCallback(i => setForm(f => ({ ...f, files: f.files.filter((_, j) => j !== i) })), []);

  /* ── Upload ─────────────────────────────────────────────── */
  const upload = useCallback(async ev => {
    ev?.preventDefault();

    if (!form.files.length) { setUS("Select at least one photo"); return; }
    setUploading(true); setUS("Uploading…");
    try {
      const fd = new FormData();
      ["date","zone","activity","phase","description","linked_rfi","linked_task",
       "project_id","milestone_id","task_id","visibility"].forEach(k => fd.append(k, form[k] || ""));
      fd.append("photo", form.files[0]); // only ONE file

      const res = await api.post("/photos", fd, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});
      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadPhotos();
      setForm({ ...BLANK, date: nowISO() });
      setUS(`${form.files.length} photo${form.files.length > 1 ? "s" : ""} uploaded ✓`);
      setTab("gallery");
    } catch {
      enqueue({ zone: form.zone, activity: form.activity, count: form.files.length });
      setUS("Offline — queued for retry");
    } finally { if (alive.current) setUploading(false); }
  }, [form]);

  /* ── Share photo to another page ───────────────────────── */
  const sharePhoto = useCallback(async () => {
    if (!shareModal || !shareTarget) return;
    setShareSaving(true);
    try {
      await api.post("/photos/share", {
        photo_id:   shareModal.id,
        target:     shareTarget,
        linked_ref: shareRef,
      });
      setShareModal(null); setShareRef("");
      alert(`Photo shared to ${SHARE_TARGETS.find(t=>t.value===shareTarget)?.label} ✓`);
    } catch {
      alert("Share failed — check connection");
    } finally { setShareSaving(false); }
  }, [shareModal, shareTarget, shareRef]);

  /* ── Download single photo ──────────────────────────────── */
  const downloadPhoto = useCallback((photo) => {
  if (!photo?.url) return;

  const a = document.createElement("a");
  a.href = photo.url;
  a.download = photo.filename || `photo-${photo.id}.jpg`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}, []);

  /* ── Download set as zip (calls backend endpoint) ──────── */
  const downloadSet = useCallback(async (dateStr) => {
    try {
      const res = await api.get(`/photos/download-set?date=${dateStr}`, { responseType: "blob" });
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `site-photos-${dateStr}.zip`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { alert("Download failed — zip endpoint not yet set up"); }
  }, []);

  /* ── Filters ────────────────────────────────────────────── */
  const allZones = useMemo(() => [...new Set(photos.map(p => p.zone).filter(Boolean))], [photos]);
  const allActs  = useMemo(() => [...new Set(photos.map(p => p.activity).filter(Boolean))], [photos]);

  const filtered = useMemo(() => {
    let list = photos.slice();
    if (viewMode === "client")       list = list.filter(p => p.visibility === "client" || p.visibility === "shared");
    if (viewMode === "before-after") list = list.filter(p => p.phase === "before" || p.phase === "after");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => (p.zone||"").toLowerCase().includes(q) || (p.activity||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q));
    }
    if (filterZone)  list = list.filter(p => p.zone === filterZone);
    if (filterAct)   list = list.filter(p => p.activity === filterAct);
    if (filterDate)  list = list.filter(p => (p.date||p.createdAt||"").slice(0,10) === filterDate);
    if (filterPhase) list = list.filter(p => p.phase === filterPhase);
    return list;
  }, [photos, search, filterZone, filterAct, filterDate, filterPhase, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  /* ── Group by date for gallery ──────────────────────────── */
  const grouped = useMemo(() => {
    const g = {};
    pageItems.forEach(p => {
      const d = (p.date||p.createdAt||"").slice(0,10) || "Unknown";
      if (!g[d]) g[d] = [];
      g[d].push(p);
    });
    return Object.entries(g).sort(([a],[b]) => b.localeCompare(a));
  }, [pageItems]);

  /* ── Before/After pairs view ────────────────────────────── */
  const beforeAfterPairs = useMemo(() => {
    const pairs = {};
    filtered.filter(p => p.phase === "before" || p.phase === "after").forEach(p => {
      const key = `${(p.date||"").slice(0,10)}|${p.zone||""}|${p.activity||""}`;
      if (!pairs[key]) pairs[key] = { before: null, after: null, zone: p.zone, activity: p.activity, date: (p.date||"").slice(0,10) };
      if (p.phase === "before") pairs[key].before = p;
      if (p.phase === "after")  pairs[key].after  = p;
    });
    return Object.values(pairs);
  }, [filtered]);

  const stats = useMemo(() => ({
    total:  photos.length,
    client: photos.filter(p => p.visibility === "client" || p.visibility === "shared").length,
    pairs:  photos.filter(p => p.phase === "before" || p.phase === "after").length,
  }), [photos]);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="pg-page">

      {/* HEADER */}
      <div className="pg-page-header">
        <div>
          <div className="pg-eyebrow">Site Documentation</div>
          <h1 className="pg-title">Photo Gallery</h1>
          <div className="pg-sub">Before/after evidence · Share to other modules · Client-visible photos</div>
        </div>
        <div className="pg-header-right">
          <span className="pg-pill pg-pill--muted">{stats.total} photos</span>
          <span className="pg-pill pg-pill--client">{stats.client} client-visible</span>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="pg-stats-bar">
        {[
          { icon:"📷", num:stats.total,  label:"Total Photos",       cls:"" },
          { icon:"🔄", num:stats.pairs,  label:"Before/After Pairs", cls:"" },
          { icon:"👤", num:stats.client, label:"Client Visible",     cls:stats.client>0?"pg-stat--client":"" },
          { icon:"📅", num:grouped.length, label:"Days with Photos", cls:"" },
        ].map((s,i) => (
          <div key={i} className={`pg-stat-card ${s.cls}`}>
            <div className="pg-stat-icon">{s.icon}</div>
            <div className="pg-stat-info">
              <div className="pg-stat-num">{s.num}</div>
              <div className="pg-stat-lbl">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="pg-tabs">
        {[
          ["gallery","📸 Gallery"],
          ["upload","⬆ Upload"],
          ["before-after","🔄 Before/After"],
          ["client","👤 Client View"],
        ].map(([v,label]) => (
          <button key={v} className={`pg-tab${tab===v?" pg-tab--active":""}`}
            onClick={() => { setTab(v); if(v==="before-after") setViewMode("before-after"); else if(v==="client") setViewMode("client"); else setViewMode("all"); }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ UPLOAD TAB ══════════════════════════════════════ */}
      {tab === "upload" && (
        <div className="pg-upload-layout">
          <div className="pg-panel">
            <div className="pg-panel-head">
              <div className="pg-panel-title">Upload Site Photos</div>
              {prefillLink && (
                <span className="pg-prefill-tag">Linking to {prefillLink.toUpperCase()} {prefillRef}</span>
              )}
            </div>
            <div className="pg-panel-body">
              <form onSubmit={upload} noValidate>

                {/* Phase selector */}
                <div className="pg-form-section">
                  <div className="pg-section-title">Photo Phase *</div>
                  <div className="pg-phase-grid">
                    {[
                      { value:"before",  icon:"🌅", label:"Before Work",  desc:"Start of day / before activity begins" },
                      { value:"after",   icon:"🌇", label:"After Work",   desc:"End of day / after activity completes" },
                      { value:"general", icon:"📷", label:"General",      desc:"Progress, inspection, materials, etc." },
                      { value:"defect",  icon:"⚠️", label:"Defect / NCR", desc:"Quality issue, snag or non-conformance" },
                    ].map(p => (
                      <div key={p.value}
                        className={`pg-phase-card${form.phase===p.value?" pg-phase-card--active":""}`}
                        onClick={() => setF("phase", p.value)}>
                        <div className="pg-phase-card-icon">{p.icon}</div>
                        <div className="pg-phase-card-label">{p.label}</div>
                        <div className="pg-phase-card-desc">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tag info */}
                <div className="pg-form-section">
                  <div className="pg-section-title">Tag Information</div>
                  <div className="pg-grid-3">
                    <div className="pg-field">
                      <label className="pg-label">Date</label>
                      <input type="date" className="pg-input" value={form.date} onChange={e=>setF("date",e.target.value)}/>
                    </div>
                    <div className="pg-field">
                      <label className="pg-label">Zone / Location</label>
                      <input className="pg-input" value={form.zone} onChange={e=>setF("zone",e.target.value)} placeholder="e.g. Level 2 / Grid C3" list="pg-zones"/>
                      <datalist id="pg-zones">{allZones.map(z=><option key={z} value={z}/>)}</datalist>
                    </div>
                    <div className="pg-field">
                      <label className="pg-label">Activity Tag</label>
                      <select className="pg-select" value={form.activity} onChange={e=>setF("activity",e.target.value)}>
                        <option value="">Select activity…</option>
                        {ACTIVITY_TAGS.map(a=><option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="pg-field pg-field--full">
                      <label className="pg-label">Description</label>
                      <input className="pg-input" value={form.description} onChange={e=>setF("description",e.target.value)} placeholder="Brief notes about these photos — what was done, what is shown"/>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="pg-form-section">
                  <div className="pg-section-title">Links &amp; Visibility</div>
                  <div className="pg-grid-3">
                    <div className="pg-field">
                      <label className="pg-label">Linked RFI</label>
                      <input className="pg-input" value={form.linked_rfi} onChange={e=>setF("linked_rfi",e.target.value)} placeholder="RFI-007"/>
                    </div>
                    <div className="pg-field">
                      <label className="pg-label">Linked Task / Ref</label>
                      <input className="pg-input" value={form.linked_task} onChange={e=>setF("linked_task",e.target.value)} placeholder="TASK-001 or PROG-REF"/>
                    </div>
                    <div className="pg-field">
                      <label className="pg-label">Visibility</label>
                      <select className="pg-select" value={form.visibility} onChange={e=>setF("visibility",e.target.value)}>
                        <option value="internal">Internal Only</option>
                        <option value="client">Client Visible</option>
                        <option value="shared">Shared (All Roles)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Project / Milestone / Task */}
                <div className="pg-form-section">
                  <div className="pg-section-title">Link to Programme</div>
                  <div className="pg-grid-3">
                    <div className="pg-field">
                      <label className="pg-label">Project</label>
                      <select className="pg-select" value={form.project_id||""} onChange={e=>{
                        setF("project_id",e.target.value); setF("milestone_id",""); setF("task_id","");
                        setMilestones([]); setTasks([]);
                        if(e.target.value) loadMilestones(e.target.value);
                      }}>
                        <option value="">Select project</option>
                        {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="pg-field">
                      <label className="pg-label">Milestone</label>
                      <select className="pg-select" value={form.milestone_id||""} disabled={!form.project_id} onChange={e=>{
                        setF("milestone_id",e.target.value); setF("task_id",""); setTasks([]);
                        if(e.target.value) loadTasks(e.target.value);
                      }}>
                        <option value="">Select milestone</option>
                        {milestones.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="pg-field">
                      <label className="pg-label">Task (WBS)</label>
                      <select className="pg-select" value={form.task_id||""} disabled={!form.milestone_id} onChange={e=>setF("task_id",e.target.value)}>
                        <option value="">Select task</option>
                        {tasks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Drop zone */}
                <div className="pg-form-section">
                  <div className="pg-section-title">Photos *</div>
                <div className="pg-drop-zone" onClick={() => fileRef.current?.click()}>
  
  <input
    ref={fileRef}
    type="file"
    accept="image/*,video/*"
    onChange={handleFiles}
    className="pg-file-hidden"
  />

  <span className="pg-drop-icon">📷</span>
  <div className="pg-drop-text">Click to select a photo or video</div>
<div className="pg-drop-hint">JPG, PNG, WEBP, MP4</div>

</div>

                    
                  {form.files.length > 0 && (
                    <div className="pg-preview-grid">
                      {form.files.map((f,i) => (
                        <div key={`${f.name}-${i}`} className="pg-preview-item">
                          <img src={URL.createObjectURL(f)} alt={f.name} className="pg-preview-img"/>
                          <button type="button" className="pg-preview-remove" onClick={()=>removeFile(i)}>×</button>
                          <div className="pg-preview-name">{f.name.slice(0,18)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pg-submit-row">
                  <button type="submit" className="pg-btn pg-btn--primary" disabled={uploading}>
                    {uploading ? "Uploading…" : "Upload Photo"}
                  </button>
                  {uploadStatus && (
                    <span className={`pg-status ${uploadStatus.includes("✓")?"pg-status--ok":uploadStatus.includes("Offline")?"pg-status--err":"pg-status--saving"}`}>
                      {uploadStatus}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Tips aside */}
          <div className="pg-aside-card">
            <div className="pg-aside-title">Photo Tips</div>
            <ul className="pg-tips">
              <li><strong>Before/After</strong> — always take both for each activity. These are your legal proof.</li>
              <li>Use <strong>Client Visible</strong> for progress photos you want the client to see.</li>
              <li>Tag the zone precisely — disputes are resolved by location.</li>
              <li>Link to RFI when the photo shows a design conflict.</li>
              <li>Defect photos must be linked to the Snag or NCR ref.</li>
              <li>Download sets by date for handover documentation.</li>
            </ul>
            <div className="pg-aside-title" style={{marginTop:14}}>Visibility</div>
            <div style={{padding:"8px 16px",fontSize:12}}>
              <div className="pg-vis-row"><span className="pg-vis-dot pg-vis-dot--internal"/>Internal — team only</div>
              <div className="pg-vis-row"><span className="pg-vis-dot pg-vis-dot--client"/>Client — client portal</div>
              <div className="pg-vis-row"><span className="pg-vis-dot pg-vis-dot--shared"/>Shared — all roles</div>
            </div>
          </div>
        </div>
      )}

      {/* ══ BEFORE/AFTER TAB ════════════════════════════════ */}
      {tab === "before-after" && (
        <>
          <div className="pg-ba-header">
            <div className="pg-ba-title">Before &amp; After Pairs</div>
            <div className="pg-ba-sub">Each row shows the before and after photo for the same zone and activity</div>
          </div>

          {beforeAfterPairs.length === 0 ? (
            <div className="pg-empty">
              <div className="pg-empty-icon">🔄</div>
              <div>No before/after pairs yet</div>
              <button className="pg-btn pg-btn--primary" onClick={()=>setTab("upload")}>Upload Before/After Photos</button>
            </div>
          ) : (
            <div className="pg-ba-list">
              {beforeAfterPairs.map((pair, i) => (
                <div key={i} className="pg-ba-pair">
                  <div className="pg-ba-pair-header">
                    <div>
                      <div className="pg-ba-zone">{pair.zone || "—"}</div>
                      <div className="pg-ba-activity">{pair.activity || "—"} · {fmtDate(pair.date)}</div>
                    </div>
                    <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={()=>downloadSet(pair.date)}>
                      ⬇ Download Set
                    </button>
                  </div>
                  <div className="pg-ba-photos">
                    {/* BEFORE */}
                    <div className="pg-ba-slot">
                      <div className="pg-ba-slot-label pg-ba-slot-label--before">🌅 Before Work</div>
                      {pair.before ? (
                        <div className="pg-ba-photo" onClick={()=>setLightbox(pair.before)}>
                          {pair.before.url
  ? <img
      src={pair.before.url}
      alt="before"
      className="pg-ba-img"
    />
  : <div className="pg-ba-placeholder">📷</div>
}
                          <div className="pg-ba-photo-actions">
                            <button onClick={e=>{e.stopPropagation();downloadPhoto(pair.before)}} className="pg-icon-btn" title="Download">⬇</button>
                            <button onClick={e=>{e.stopPropagation();setShareModal(pair.before)}} className="pg-icon-btn" title="Share">↗</button>
                          </div>
                        </div>
                      ) : (
                        <div className="pg-ba-missing" onClick={()=>setTab("upload")}>
                          <span>+ Add Before Photo</span>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="pg-ba-arrow">→</div>

                    {/* AFTER */}
                    <div className="pg-ba-slot">
                      <div className="pg-ba-slot-label pg-ba-slot-label--after">🌇 After Work</div>
                      {pair.after ? (
                        <div className="pg-ba-photo" onClick={()=>setLightbox(pair.after)}>
                          {pair.after.url
                            ? <img src={pair.after.url} alt="after" className="pg-ba-img"/>
                            : <div className="pg-ba-placeholder">📷</div>
                          }
                          <div className="pg-ba-photo-actions">
                            <button onClick={e=>{e.stopPropagation();downloadPhoto(pair.after)}} className="pg-icon-btn" title="Download">⬇</button>
                            <button onClick={e=>{e.stopPropagation();setShareModal(pair.after)}} className="pg-icon-btn" title="Share">↗</button>
                          </div>
                        </div>
                      ) : (
                        <div className="pg-ba-missing" onClick={()=>setTab("upload")}>
                          <span>+ Add After Photo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ CLIENT VIEW TAB ═════════════════════════════════ */}
      {tab === "client" && (
        <>
          <div className="pg-client-notice">
            <span className="pg-client-icon">👤</span>
            <div>
              <strong>Client View</strong>
              <div>Showing only photos marked "Client Visible" or "Shared". This is what the client sees in their portal.</div>
            </div>
          </div>
          {/* Falls through to gallery render below with viewMode="client" */}
        </>
      )}

      {/* ══ GALLERY (all tabs except upload & before-after) ══ */}
      {tab !== "upload" && tab !== "before-after" && (
        <>
          {/* Filters */}
          <div className="pg-filter-bar">
            <div className="pg-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search zone, activity…"/>
            </div>
            <select className="pg-select pg-select--sm" value={filterZone} onChange={e=>{setFZ(e.target.value);setPage(1);}}>
              <option value="">All zones</option>
              {allZones.map(z=><option key={z} value={z}>{z}</option>)}
            </select>
            <select className="pg-select pg-select--sm" value={filterAct} onChange={e=>{setFA(e.target.value);setPage(1);}}>
              <option value="">All activities</option>
              {ACTIVITY_TAGS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
            <select className="pg-select pg-select--sm" value={filterPhase} onChange={e=>{setFP(e.target.value);setPage(1);}}>
              <option value="">All phases</option>
              <option value="before">Before Work</option>
              <option value="after">After Work</option>
              <option value="general">General</option>
              <option value="defect">Defect</option>
            </select>
            <input type="date" className="pg-input pg-input--sm" value={filterDate} onChange={e=>{setFD(e.target.value);setPage(1);}}/>
            {(search||filterZone||filterAct||filterDate||filterPhase) && (
              <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={()=>{setSearch("");setFZ("");setFA("");setFD("");setFP("");setPage(1);}}>Clear</button>
            )}
          </div>

          {listLoading ? (
            <div className="pg-loading"><div className="pg-spinner"/>Loading photos…</div>
          ) : filtered.length === 0 ? (
            <div className="pg-empty">
              <div className="pg-empty-icon">📷</div>
              <div>{tab==="client" ? "No client-visible photos yet — mark photos as 'Client Visible' when uploading" : "No photos found"}</div>
              <button className="pg-btn pg-btn--primary" onClick={()=>setTab("upload")}>Upload Photos</button>
            </div>
          ) : (
            <>
              {grouped.map(([date, items]) => (
                <div key={date} className="pg-group">
                  <div className="pg-group-header">
                    <span className="pg-group-date">{fmtDate(date)}</span>
                    <div className="pg-group-actions">
                      <span className="pg-group-count">{items.length} photo{items.length!==1?"s":""}</span>
                      <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={()=>downloadSet(date)}>
                        ⬇ Download Set
                      </button>
                    </div>
                  </div>

                  <div className="pg-photo-grid">
                    {items.map(p => (
                      <div key={stableKey(p)} className="pg-photo-card" onClick={()=>setLightbox(p)}>
                        {p.url
  ? <img
      src={p.url}
      alt={p.activity || "Site photo"}
      className="pg-photo-img"
    />
  : <div className="pg-photo-placeholder">📷</div>
}
                        <div className="pg-photo-meta">
                          <div className="pg-photo-top">
                            {p.phase && p.phase !== "general" && <PhaseBadge phase={p.phase}/>}
                            {p.visibility === "client" && <span className="pg-vis-tag">👤</span>}
                          </div>
                          {p.activity && <div className="pg-photo-activity">{p.activity}</div>}
                          {p.zone     && <div className="pg-photo-zone">{p.zone}</div>}
                          {(p.linked_rfi||p.linked_task) && (
                            <div className="pg-photo-links">
                              {p.linked_rfi  && <span className="pg-link-tag pg-link-tag--rfi">{p.linked_rfi}</span>}
                              {p.linked_task && <span className="pg-link-tag pg-link-tag--task">{p.linked_task}</span>}
                            </div>
                          )}
                        </div>
                        {/* Hover actions */}
                        <div className="pg-photo-hover-actions">
                          <button className="pg-icon-btn" title="Download" onClick={e=>{e.stopPropagation();downloadPhoto(p);}}>⬇</button>
                          <button className="pg-icon-btn" title="Share to module" onClick={e=>{e.stopPropagation();setShareModal(p);}}>↗</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              <div className="pg-pagination">
                <span className="pg-page-info">Page {page} of {totalPages} · {filtered.length} photos</span>
                <div className="pg-page-btns">
                  <button className="pg-page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>← Prev</button>
                  <button className="pg-page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next →</button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══ LIGHTBOX ════════════════════════════════════════ */}
      {lightbox && (
        <div className="pg-lightbox-overlay" onClick={()=>setLightbox(null)}>
          <div className="pg-lightbox-panel" onClick={e=>e.stopPropagation()}>
            <div className="pg-lightbox-head">
              <div>
                {lightbox.phase && lightbox.phase!=="general" && <PhaseBadge phase={lightbox.phase}/>}
                <div className="pg-lightbox-title">{lightbox.activity||"Site Photo"}</div>
                <div className="pg-lightbox-meta">
                  {lightbox.zone && <span>Zone: {lightbox.zone}</span>}
                  {lightbox.date && <span> · {fmtDate((lightbox.date||"").slice(0,10))}</span>}
                </div>
              </div>
              <div className="pg-lightbox-head-actions">
                <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={()=>downloadPhoto(lightbox)}>⬇ Download</button>
                <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={()=>{setShareModal(lightbox);setLightbox(null);}}>↗ Share</button>
                <button className="pg-lightbox-close" onClick={()=>setLightbox(null)}>✕</button>
              </div>
            </div>
            {lightbox.url && (
  <img
    src={lightbox.url}
    alt=""
    className="pg-lightbox-img"
  />
)}
            {lightbox.description && <div className="pg-lightbox-desc">{lightbox.description}</div>}
            {(lightbox.linked_rfi||lightbox.linked_task) && (
              <div className="pg-photo-links" style={{padding:"8px 20px"}}>
                {lightbox.linked_rfi  && <span className="pg-link-tag pg-link-tag--rfi">{lightbox.linked_rfi}</span>}
                {lightbox.linked_task && <span className="pg-link-tag pg-link-tag--task">{lightbox.linked_task}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ SHARE MODAL ═════════════════════════════════════ */}
      {shareModal && (
        <div className="pg-lightbox-overlay" onClick={()=>setShareModal(null)}>
          <div className="pg-share-modal" onClick={e=>e.stopPropagation()}>
            <div className="pg-share-head">
              <div className="pg-share-title">Share Photo to Module</div>
              <button className="pg-lightbox-close" onClick={()=>setShareModal(null)}>✕</button>
            </div>
            <div className="pg-share-body">
              
{shareModal.url && (
  <img
    src={shareModal.url}
    alt=""
    className="pg-share-preview"
  />
)}
              <div className="pg-field" style={{marginTop:16}}>
                <label className="pg-label">Send to</label>
                <select className="pg-select" value={shareTarget} onChange={e=>setShareTarget(e.target.value)}>
                  {SHARE_TARGETS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="pg-field" style={{marginTop:12}}>
                <label className="pg-label">Reference Number (optional)</label>
                <input className="pg-input" value={shareRef} onChange={e=>setShareRef(e.target.value)} placeholder="e.g. PROG-001, RFI-007, NCR-002"/>
              </div>
              <div className="pg-share-info">
                This photo will be attached to the selected module and visible to anyone who can access that record.
              </div>
              <div className="pg-submit-row" style={{marginTop:16}}>
                <button className="pg-btn pg-btn--primary" onClick={sharePhoto} disabled={shareSaving}>
                  {shareSaving?"Sharing…":"↗ Share Photo"}
                </button>
                <button className="pg-btn pg-btn--ghost" onClick={()=>setShareModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}