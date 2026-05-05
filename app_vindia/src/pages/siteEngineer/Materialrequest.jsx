// src/pages/siteEngineer/MaterialRequest.jsx
// NEW PAGE: Material request form → Procurement workflow
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";

const DRAFT_KEY = "matreq:draft:v3";
const QUEUE_KEY = "matreq:queue:v3";
const PAGE_SIZE = 8;

const UNITS = ["nos","kg","tonne","m³","m²","m","bag","litre","roll","set","LS"];
const CATEGORIES = ["Concrete & Cement","Steel & Rebar","Formwork","Masonry","MEP","Finishing","Safety","Other"];

const BLANK_ITEM = { description: "", category: "Steel & Rebar", qty: "", unit: "kg", spec: "" };
const BLANK = {
  project: "", zone: "", required_by: "",
  purpose: "",
  linked_activity: "",
  items: [{ ...BLANK_ITEM }],
  notes: "",
  attachments: [],
};

const ls = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:  k => { try { localStorage.removeItem(k); } catch {} },
};

function enqueue(payload) {
  const q = ls.load(QUEUE_KEY) || [];
  q.push({ id: `q_${Date.now()}`, payload, createdAt: new Date().toISOString() });
  ls.save(QUEUE_KEY, q);
}

async function flushQueue() {
  const q = ls.load(QUEUE_KEY);
  if (!Array.isArray(q) || !q.length) return;
  const rem = [];
  for (const item of q) {
    try {
      const res = await api.post("/material-request", item.payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
    } catch { rem.push(item); }
  }
  ls.save(QUEUE_KEY, rem);
}

function stableKey(it) {
  if (!it) return "";
  if (it.id != null) return String(it.id);
  return `${it.purpose || ""}|${it.zone || ""}|${it.createdAt || ""}`;
}

function validate(f) {
  const e = {};
  if (!f.purpose || f.purpose.trim().length < 3) e.purpose = "Describe the purpose (min 3 chars)";
  if (!f.required_by) e.required_by = "Required-by date is needed";
  if (!f.items.some(it => it.description.trim())) e.items = "Add at least one material item";
  return e;
}

function StatusBadge({ s }) {
  const cfg = {
    requested: { bg: "#E6F1FB", color: "#185FA5", border: "#90C1EF" },
    approved:  { bg: "#E1F5EE", color: "#085041", border: "#5DCAA5" },
    delivered: { bg: "#F1EFE8", color: "#3B3A37", border: "#B4B2A9" },
    rejected:  { bg: "#FCEBEB", color: "#791F1F", border: "#E8A0A0" },
  };
  const c = cfg[s] || cfg.requested;
  return (
    <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, fontWeight: 500 }}>
      {s ? s.charAt(0).toUpperCase() + s.slice(1) : "Requested"}
    </span>
  );
}

function nowISO() { return new Date().toISOString().slice(0, 10); }
function plusDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function MaterialRequest() {
  const draft = ls.load(DRAFT_KEY);
  const [form, setForm]       = useState({ ...BLANK, required_by: plusDays(3), ...draft, attachments: [], items: draft?.items || [{ ...BLANK_ITEM }] });
  const [errors, setErrors]   = useState({});
  const [status, setStatus]   = useState("");
  const [submitting, setSub]  = useState(false);
  const [requests, setReqs]   = useState([]);
  const [listLoading, setLL]  = useState(true);
  const [search, setSearch]   = useState("");
  const [filterStat, setFS]   = useState("all");
  const [page, setPage]       = useState(1);
  const autoSave = useRef(null);
  const alive    = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadList();
    flushQueue().catch(() => {});
    return () => { alive.current = false; clearTimeout(autoSave.current); };
  }, []);

  async function loadList() {
    setLL(true);
    try {
      const res = await api.get("/material-request");
      if (!alive.current) return;
      const raw  = Array.isArray(res?.data) ? res.data.slice().reverse() : [];
      const seen = new Set();
      setReqs(raw.filter(it => { const k = stableKey(it); if (seen.has(k)) return false; seen.add(k); return true; }));
    } catch { /* offline */ }
    finally { if (alive.current) setLL(false); }
  }

  useEffect(() => {
    clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      const c = { ...form }; delete c.attachments; ls.save(DRAFT_KEY, c);
    }, 1200);
  }, [form]);

  const setF = useCallback((k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const c = { ...e }; delete c[k]; return c; });
    setStatus("");
  }, []);

  const setItem = useCallback((i, k, v) => {
    setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items }; });
    setErrors(e => { const c = { ...e }; delete c.items; return c; });
  }, []);

  const addItem = useCallback(() => {
    setForm(f => ({ ...f, items: [...f.items, { ...BLANK_ITEM }] }));
  }, []);

  const removeItem = useCallback(i => {
    setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }));
  }, []);

  const handleFiles = useCallback(e => {
    setForm(f => ({ ...f, attachments: [...f.attachments, ...Array.from(e.target.files || [])] }));
    e.target.value = null;
  }, []);

  const clearForm = useCallback(() => {
    ls.del(DRAFT_KEY);
    setForm({ ...BLANK, required_by: plusDays(3), items: [{ ...BLANK_ITEM }] });
    setErrors({});
    setStatus("");
  }, []);

  const submit = useCallback(async ev => {
    ev?.preventDefault();
    if (submitting) return;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus("Fix errors above"); return; }

    setSub(true); setStatus("Submitting…");

    const optimistic = {
      id: `local_${Date.now()}`,
      ...form,
      status: "requested",
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setReqs(s => [optimistic, ...s]);

    try {
      let res;
      const payload = { ...form, items: JSON.stringify(form.items) };
      if (form.attachments.length) {
        const fd = new FormData();
        ["project","zone","required_by","purpose","linked_activity","notes"].forEach(k => fd.append(k, form[k] || ""));
        fd.append("items", JSON.stringify(form.items));
        form.attachments.forEach(f => fd.append("attachments", f, f.name));
        res = await api.post("/material-request", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        const { attachments: _, ...clean } = payload;
        res = await api.post("/material-request", clean);
      }
      if (!res || (res.status && res.status >= 400)) throw new Error();
      await loadList();
      ls.del(DRAFT_KEY);
      setForm({ ...BLANK, required_by: plusDays(3), items: [{ ...BLANK_ITEM }] });
      setStatus("Material request submitted ✓");
    } catch {
      enqueue((({ attachments: _, ...p }) => p)(form));
      setReqs(s => s.map(it => it.id === optimistic.id ? { ...it, queued: true } : it));
      setStatus("Offline — queued for retry");
    } finally { if (alive.current) setSub(false); }
  }, [form, submitting]);

  const filtered = useMemo(() => {
    let list = requests.slice();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it =>
        (it.purpose || "").toLowerCase().includes(q) ||
        (it.zone    || "").toLowerCase().includes(q) ||
        (it.project || "").toLowerCase().includes(q)
      );
    }
    if (filterStat !== "all") list = list.filter(it => (it.status || "requested") === filterStat);
    return list;
  }, [requests, search, filterStat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages]);

  const stats = useMemo(() => ({
    total:     requests.length,
    requested: requests.filter(r => !r.status || r.status === "requested").length,
    approved:  requests.filter(r => r.status === "approved").length,
    delivered: requests.filter(r => r.status === "delivered").length,
  }), [requests]);

  const fmtDate = s => s ? new Date(s + "T12:00:00").toLocaleDateString("en-GB") : "—";

  const onSearch = useCallback(e => { setSearch(e.target.value); setPage(1); }, []);
  const onFS     = useCallback(e => { setFS(e.target.value);     setPage(1); }, []);

  /* ── shared input style ── */
  const inp = {
    width: "100%", padding: "8px 10px",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: "var(--border-radius-md)",
    fontSize: 13, background: "var(--color-background-primary)",
    color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
  };
  const lbl = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--color-text-secondary)", marginBottom: 5 };
  const sec = { marginBottom: 22 };
  const secTitle = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-text-tertiary)", marginBottom: 12, paddingBottom: 6, borderBottom: "0.5px solid var(--color-border-tertiary)" };
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

  return (
    <div style={{ padding: "0 0 40px" }}>

      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--color-text-tertiary)", marginBottom: 4 }}>Procurement</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Material Request</h1>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>Request materials → sent to Procurement for approval</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>

        {/* MAIN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* FORM */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>New Material Request</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => { ls.save(DRAFT_KEY, form); setStatus("Draft saved"); }} style={{ ...inp, width: "auto", padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Save Draft</button>
                <button type="button" onClick={clearForm} style={{ ...inp, width: "auto", padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Clear</button>
              </div>
            </div>

            <div style={{ padding: "20px 18px" }}>
              <form onSubmit={submit} noValidate>

                {/* DETAILS */}
                <div style={sec}>
                  <div style={secTitle}>Request Details</div>
                  <div style={grid2}>
                    <div>
                      <label style={lbl}>Project / Site</label>
                      <input style={inp} value={form.project} onChange={e => setF("project", e.target.value)} placeholder="Block C · Phase 2" />
                    </div>
                    <div>
                      <label style={lbl}>Zone / Area</label>
                      <input style={inp} value={form.zone} onChange={e => setF("zone", e.target.value)} placeholder="e.g. Level 3 / Grid A–D" />
                    </div>
                    <div>
                      <label style={lbl}>Required By Date *</label>
                      <input type="date" style={inp} value={form.required_by} onChange={e => setF("required_by", e.target.value)} />
                      {errors.required_by && <div style={{ fontSize: 11, color: "#b83232", marginTop: 4 }}>{errors.required_by}</div>}
                    </div>
                    <div>
                      <label style={lbl}>Linked Activity</label>
                      <input style={inp} value={form.linked_activity} onChange={e => setF("linked_activity", e.target.value)} placeholder="e.g. Level 3 column casting" />
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <label style={lbl}>Purpose / Justification *</label>
                    <textarea
                      style={{ ...inp, minHeight: 80, resize: "vertical" }}
                      value={form.purpose}
                      onChange={e => setF("purpose", e.target.value)}
                      placeholder="Why are these materials needed? Reference the activity and programme date."
                    />
                    {errors.purpose && <div style={{ fontSize: 11, color: "#b83232", marginTop: 4 }}>{errors.purpose}</div>}
                  </div>
                </div>

                {/* MATERIAL ITEMS */}
                <div style={sec}>
                  <div style={secTitle}>Material Items *</div>

                  {/* Column headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 1.5fr 28px", gap: 8, marginBottom: 6, padding: "0 2px" }}>
                    {["Description", "Category", "Qty", "Unit", "Spec / Grade", ""].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--color-text-tertiary)" }}>{h}</div>
                    ))}
                  </div>

                  {form.items.map((item, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 1.5fr 28px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <input style={inp} value={item.description} onChange={e => setItem(i, "description", e.target.value)} placeholder="e.g. TMT Rebar Fe500" />
                      <select style={inp} value={item.category} onChange={e => setItem(i, "category", e.target.value)}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input type="number" min="0" step="0.01" style={inp} value={item.qty} onChange={e => setItem(i, "qty", e.target.value)} placeholder="0" />
                      <select style={inp} value={item.unit} onChange={e => setItem(i, "unit", e.target.value)}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <input style={inp} value={item.spec} onChange={e => setItem(i, "spec", e.target.value)} placeholder="e.g. IS 1786, 12mm dia" />
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={form.items.length === 1}
                        style={{ background: "none", border: "none", color: "var(--color-text-tertiary)", cursor: "pointer", fontSize: 16, padding: 0 }}
                      >×</button>
                    </div>
                  ))}

                  {errors.items && <div style={{ fontSize: 11, color: "#b83232", marginBottom: 8 }}>{errors.items}</div>}

                  <button type="button" onClick={addItem} style={{ ...inp, width: "auto", padding: "6px 14px", fontSize: 12, cursor: "pointer", marginTop: 4 }}>
                    + Add Item
                  </button>
                </div>

                {/* NOTES & ATTACHMENTS */}
                <div style={sec}>
                  <div style={secTitle}>Notes &amp; Attachments</div>
                  <textarea
                    style={{ ...inp, minHeight: 70, resize: "vertical", marginBottom: 12 }}
                    value={form.notes}
                    onChange={e => setF("notes", e.target.value)}
                    placeholder="Any special handling, delivery instructions, or urgent notes for Procurement…"
                  />
                  <div>
                    <label style={lbl}>Attachments</label>
                    <input type="file" multiple onChange={handleFiles} style={{ fontSize: 12 }} />
                    {form.attachments.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        {form.attachments.map((f, i) => (
                          <div key={`${f.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, background: "var(--color-background-secondary)", padding: "5px 10px", borderRadius: "var(--border-radius-sm)" }}>
                            <span>📎</span>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                            <button type="button" onClick={() => setForm(f2 => ({ ...f2, attachments: f2.attachments.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SUBMIT */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: "9px 22px", background: "#0A4174", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", fontSize: 14, fontWeight: 500, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}
                  >
                    {submitting ? "Submitting…" : "Submit to Procurement"}
                  </button>
                  {status && (
                    <span style={{ fontSize: 13, color: status.includes("✓") ? "#085041" : status.includes("Offline") ? "#b83232" : "var(--color-text-secondary)" }}>
                      {status}
                    </span>
                  )}
                </div>

              </form>
            </div>
          </div>

          {/* REQUEST LIST */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>My Requests</div>
              <span style={{ fontSize: 11, padding: "3px 10px", background: "var(--color-background-secondary)", borderRadius: 20, border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{filtered.length} records</span>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 10, padding: "12px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "7px 10px" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <input value={search} onChange={onSearch} placeholder="Search requests…" style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--color-text-primary)", flex: 1 }} />
              </div>
              <select value={filterStat} onChange={onFS} style={{ ...inp, width: 160 }}>
                <option value="all">All status</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="delivered">Delivered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {listLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Loading…</div>
            ) : pageItems.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No material requests found</div>
            ) : (
              <>
                {pageItems.map(r => {
                  const items = (() => {
                    if (!r.items) return [];
                    if (typeof r.items === "string") { try { return JSON.parse(r.items); } catch { return []; } }
                    return Array.isArray(r.items) ? r.items : [];
                  })();
                  return (
                    <div key={stableKey(r)} style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                        <div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, fontWeight: 700, color: "#185FA5" }}>
                              {r.refNo || `MR-${String(r.id ?? "").padStart(3, "0")}`}
                            </span>
                            <StatusBadge s={r.status} />
                            {r.queued && <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--color-background-secondary)", borderRadius: 20, color: "var(--color-text-tertiary)" }}>Queued</span>}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>{r.purpose || "—"}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {r.zone         && <span>Zone: {r.zone}</span>}
                            {r.required_by  && <span>Required by: {fmtDate(r.required_by)}</span>}
                            {r.linked_activity && <span>Activity: {r.linked_activity}</span>}
                            {r.createdAt    && <span>Raised: {new Date(r.createdAt).toLocaleDateString("en-GB")}</span>}
                          </div>
                        </div>
                      </div>
                      {items.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {items.filter(it => it.description).map((it, ii) => (
                            <span key={ii} style={{ fontSize: 11, padding: "2px 10px", background: "var(--color-background-secondary)", borderRadius: 20, border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>
                              {it.description} — {it.qty} {it.unit}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Page {page} of {totalPages} · {filtered.length} records</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ ...inp, width: "auto", padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>← Prev</button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ ...inp, width: "auto", padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Next →</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ASIDE */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { title: "Stats", rows: [["Total Requests", stats.total],["Pending", stats.requested],["Approved", stats.approved],["Delivered", stats.delivered]] },
          ].map(card => (
            <div key={card.title} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 16 }}>
              <div style={secTitle}>{card.title}</div>
              {card.rows.map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>{l}</span>
                  <strong style={{ color: "var(--color-text-primary)" }}>{v}</strong>
                </div>
              ))}
            </div>
          ))}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 16 }}>
            <div style={secTitle}>Workflow</div>
            {[
              ["1. Site Engineer", "Raises request with items + required-by date"],
              ["2. Procurement", "Reviews and approves or rejects"],
              ["3. Delivery", "Material received on site, status → Delivered"],
            ].map(([step, desc]) => (
              <div key={step} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#185FA5", marginBottom: 2 }}>{step}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 16 }}>
            <div style={secTitle}>Tips</div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
              <li>Order at least 3 days before the activity start date.</li>
              <li>Include grade and spec for structural materials.</li>
              <li>Link to the activity in the programme.</li>
              <li>Drafts auto-save — come back and finish later.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}