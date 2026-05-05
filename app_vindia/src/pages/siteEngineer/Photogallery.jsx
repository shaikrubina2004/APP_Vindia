// src/pages/siteEngineer/PhotoGallery.jsx
// Structured site photo gallery — tagged by zone, activity, date
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import "../../styles/PhotoGallery.css";

const QUEUE_KEY   = "photos:queue:v1";
const PAGE_SIZE   = 12;

const ACTIVITY_TAGS = [
  "Excavation", "Foundations", "Rebar Fixing", "Formwork", "Concrete Pour",
  "Curing", "Column Casting", "Slab Work", "Masonry", "MEP Rough-in",
  "Plastering", "Finishing", "Waterproofing", "Inspection", "Defect / NCR", "Other"
];

const ls = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function enqueue(payload) {
  const q = ls.load(QUEUE_KEY) || [];
  q.push({ id: `q_${Date.now()}`, payload, createdAt: new Date().toISOString() });
  ls.save(QUEUE_KEY, q);
}

function nowISO() { return new Date().toISOString().slice(0, 10); }
function stableKey(it) { return it?.id != null ? String(it.id) : `${it?.filename || ""}|${it?.createdAt || ""}`; }

const BLANK = { date: "", zone: "", activity: "", description: "", linked_rfi: "", linked_task: "", files: [] };

const inp = { width: "100%", padding: "8px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box" };
const lbl = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--color-text-secondary)", marginBottom: 5 };
const secTitle = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-text-tertiary)", marginBottom: 12, paddingBottom: 6, borderBottom: "0.5px solid var(--color-border-tertiary)" };

export default function PhotoGallery() {
  const [form, setForm]       = useState({ ...BLANK, date: nowISO() });
  const [status, setStatus]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos]   = useState([]);
  const [listLoading, setLL]  = useState(true);
  const [search, setSearch]   = useState("");
  const [filterZone, setFZ]   = useState("");
  const [filterAct, setFA]    = useState("");
  const [filterDate, setFD]   = useState("");
  const [lightbox, setLightbox] = useState(null); // photo object
  const [page, setPage]       = useState(1);
  const [tab, setTab]         = useState("gallery"); // "gallery" | "upload"
  const alive = useRef(true);
  const fileRef = useRef(null);

  useEffect(() => {
    alive.current = true;
    loadPhotos();
    return () => { alive.current = false; };
  }, []);

  async function loadPhotos() {
    setLL(true);
    try {
      const res = await api.get("/photos");
      if (!alive.current) return;
      const raw  = Array.isArray(res?.data) ? res.data.slice().reverse() : [];
      const seen = new Set();
      setPhotos(raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; }));
    } catch { /* offline — show empty */ }
    finally { if (alive.current) setLL(false); }
  }

  const setF = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  const handleFiles = useCallback(e => {
    setForm(f => ({ ...f, files: [...f.files, ...Array.from(e.target.files || [])] }));
    e.target.value = null;
  }, []);

  const removeFile = useCallback(i => setForm(f => ({ ...f, files: f.files.filter((_, j) => j !== i) })), []);

  const upload = useCallback(async ev => {
    ev?.preventDefault();
    if (!form.files.length) { setStatus("Select at least one photo"); return; }
    setUploading(true); setStatus("Uploading…");
    try {
      const fd = new FormData();
      ["date","zone","activity","description","linked_rfi","linked_task"].forEach(k => fd.append(k, form[k] || ""));
      form.files.forEach(f => fd.append("photos", f, f.name));
      const res = await api.post("/photos", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadPhotos();
      setForm({ ...BLANK, date: nowISO() });
      setStatus(`${form.files.length} photo${form.files.length > 1 ? "s" : ""} uploaded ✓`);
      setTab("gallery");
    } catch {
      enqueue({ _fd: true, meta: { zone: form.zone, activity: form.activity, count: form.files.length } });
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setUploading(false); }
  }, [form]);

  // All zones and activities from uploaded photos (for filter dropdowns)
  const allZones      = useMemo(() => [...new Set(photos.map(p => p.zone).filter(Boolean))], [photos]);
  const allActivities = useMemo(() => [...new Set(photos.map(p => p.activity).filter(Boolean))], [photos]);

  const filtered = useMemo(() => {
    let list = photos.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => (p.zone || "").toLowerCase().includes(q) || (p.activity || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }
    if (filterZone) list = list.filter(p => p.zone === filterZone);
    if (filterAct)  list = list.filter(p => p.activity === filterAct);
    if (filterDate) list = list.filter(p => (p.date || p.createdAt || "").slice(0, 10) === filterDate);
    return list;
  }, [photos, search, filterZone, filterAct, filterDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  // Group by date for gallery display
  const grouped = useMemo(() => {
    const groups = {};
    pageItems.forEach(p => {
      const d = (p.date || p.createdAt || "").slice(0, 10) || "Unknown";
      if (!groups[d]) groups[d] = [];
      groups[d].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [pageItems]);

  const fmtDate = s => s ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="pg-page" style={{ padding: "0 0 40px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--color-text-tertiary)", marginBottom: 4 }}>Documentation</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Site Photo Gallery</h1>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>Tagged by date, zone and activity — used for client proof and disputes</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, padding: "3px 10px", background: "var(--color-background-secondary)", borderRadius: 20, border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{photos.length} photos</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 20 }}>
        {[["gallery","📸 Gallery"],["upload","⬆ Upload Photos"]].map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding: "10px 18px", fontSize: 13, fontWeight: tab === v ? 500 : 400, color: tab === v ? "var(--color-text-primary)" : "var(--color-text-secondary)", border: "none", borderBottom: tab === v ? "2px solid #378ADD" : "2px solid transparent", background: "none", cursor: "pointer", marginBottom: "-0.5px" }}>
            {label}
          </button>
        ))}
      </div>

      {/* UPLOAD TAB */}
      {tab === "upload" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, alignItems: "start" }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 14, fontWeight: 500 }}>Upload Site Photos</div>
            <div style={{ padding: 20 }}>
              <form onSubmit={upload} noValidate>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Date</label>
                    <input type="date" style={inp} value={form.date} onChange={e => setF("date", e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Zone</label>
                    <input style={inp} value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 2 / Grid C3" list="gallery-zones" />
                    <datalist id="gallery-zones">{allZones.map(z => <option key={z} value={z} />)}</datalist>
                  </div>
                  <div>
                    <label style={lbl}>Activity Tag</label>
                    <select style={inp} value={form.activity} onChange={e => setF("activity", e.target.value)}>
                      <option value="">Select activity…</option>
                      {ACTIVITY_TAGS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Description</label>
                    <input style={inp} value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Brief notes about these photos" />
                  </div>
                  <div>
                    <label style={lbl}>Linked RFI</label>
                    <input style={inp} value={form.linked_rfi} onChange={e => setF("linked_rfi", e.target.value)} placeholder="e.g. RFI-007" />
                  </div>
                  <div>
                    <label style={lbl}>Linked Task</label>
                    <input style={inp} value={form.linked_task} onChange={e => setF("linked_task", e.target.value)} placeholder="e.g. TASK-001" />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={lbl}>Photos *</label>
                  <div
                    style={{ border: "1.5px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", padding: 32, textAlign: "center", cursor: "pointer", background: "var(--color-background-secondary)" }}
                    onClick={() => fileRef.current?.click()}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Click to select photos or drag and drop</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>JPG, PNG, HEIC — multiple files supported</div>
                    <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFiles} style={{ display: "none" }} />
                  </div>
                  {form.files.length > 0 && (
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
                      {form.files.map((f, i) => {
                        const url = URL.createObjectURL(f);
                        return (
                          <div key={`${f.name}-${i}`} style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--border-radius-md)", overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)" }}>
                            <img src={url} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <button type="button" onClick={() => removeFile(i)} style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 99, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="submit" disabled={uploading} style={{ padding: "9px 22px", background: "#0A4174", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? "Uploading…" : `Upload ${form.files.length || ""} Photo${form.files.length !== 1 ? "s" : ""}`}
                  </button>
                  {status && <span style={{ fontSize: 13, color: status.includes("✓") ? "#085041" : "#b83232" }}>{status}</span>}
                </div>
              </form>
            </div>
          </div>

          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 16 }}>
            <div style={secTitle}>Tips</div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 2 }}>
              <li>Always tag by zone for dispute resolution.</li>
              <li>Photos before and after concrete pour are essential.</li>
              <li>Link NCR photos to their NCR reference.</li>
              <li>Use "Inspection" tag for ITP evidence.</li>
              <li>Photos are legally admissible as site records.</li>
            </ul>
          </div>
        </div>
      )}

      {/* GALLERY TAB */}
      {tab === "gallery" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "7px 10px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search zone, activity, description…" style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--color-text-primary)", flex: 1 }} />
            </div>
            <select value={filterZone} onChange={e => { setFZ(e.target.value); setPage(1); }} style={{ ...inp, width: 160 }}>
              <option value="">All zones</option>
              {allZones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <select value={filterAct} onChange={e => { setFA(e.target.value); setPage(1); }} style={{ ...inp, width: 160 }}>
              <option value="">All activities</option>
              {ACTIVITY_TAGS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="date" style={{ ...inp, width: 160 }} value={filterDate} onChange={e => { setFD(e.target.value); setPage(1); }} />
            {(search || filterZone || filterAct || filterDate) && (
              <button onClick={() => { setSearch(""); setFZ(""); setFA(""); setFD(""); setPage(1); }} style={{ ...inp, width: "auto", padding: "7px 14px", fontSize: 12, cursor: "pointer", color: "#185FA5" }}>Clear filters</button>
            )}
          </div>

          {listLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Loading photos…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
              <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>No photos yet — upload your first site photos</div>
              <button onClick={() => setTab("upload")} style={{ marginTop: 16, padding: "8px 20px", background: "#0A4174", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer" }}>Upload Photos</button>
            </div>
          ) : (
            <>
              {grouped.map(([date, items]) => (
                <div key={date} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-text-tertiary)", marginBottom: 12, paddingBottom: 6, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {fmtDate(date)} <span style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}>· {items.length} photo{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {items.map(p => (
                      <div
                        key={stableKey(p)}
                        style={{ borderRadius: "var(--border-radius-md)", overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)", cursor: "pointer", background: "var(--color-background-secondary)", transition: "transform 0.15s, box-shadow 0.15s" }}
                        onClick={() => setLightbox(p)}
                        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        {p.url ? (
                          <img src={p.url} alt={p.description || p.activity || "Site photo"} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                        ) : (
                          <div style={{ width: "100%", aspectRatio: "4/3", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📷</div>
                        )}
                        <div style={{ padding: "8px 10px" }}>
                          {p.activity && <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.activity}</div>}
                          {p.zone     && <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.zone}</div>}
                          {(p.linked_rfi || p.linked_task) && (
                            <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {p.linked_rfi  && <span style={{ fontSize: 9, padding: "1px 6px", background: "#FAEEDA", color: "#633806", borderRadius: 20 }}>{p.linked_rfi}</span>}
                              {p.linked_task && <span style={{ fontSize: 9, padding: "1px 6px", background: "#E6F1FB", color: "#185FA5", borderRadius: 20 }}>{p.linked_task}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Page {page} of {totalPages} · {filtered.length} photos</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ ...inp, width: "auto", padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>← Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ ...inp, width: "auto", padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Next →</button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setLightbox(null)}
        >
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", maxWidth: 700, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            {lightbox.url && <img src={lightbox.url} alt="" style={{ width: "100%", maxHeight: 450, objectFit: "contain", background: "#000" }} />}
            <div style={{ padding: "16px 20px" }}>
              {lightbox.activity    && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{lightbox.activity}</div>}
              {lightbox.zone        && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Zone: {lightbox.zone}</div>}
              {lightbox.description && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>{lightbox.description}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {lightbox.linked_rfi  && <span style={{ fontSize: 11, padding: "2px 8px", background: "#FAEEDA", color: "#633806", borderRadius: 20 }}>{lightbox.linked_rfi}</span>}
                {lightbox.linked_task && <span style={{ fontSize: 11, padding: "2px 8px", background: "#E6F1FB", color: "#185FA5", borderRadius: 20 }}>{lightbox.linked_task}</span>}
              </div>
            </div>
            <button onClick={() => setLightbox(null)} style={{ margin: "0 20px 16px", padding: "8px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}