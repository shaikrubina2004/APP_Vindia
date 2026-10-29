import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as teamApi from "../api/teamApi";

// Floating "My Project Team" button, mounted once in AppLayout so it appears on every page.
//  * click it -> a read-only panel with your project's team (Team tab) and recent updates (Activity tab)
//  * when something new happens (someone joins/leaves, a task is assigned...) a pop-out appears
//  * hides itself when you are not on any project, or for accounts without access (e.g. clients)
// The API only returns projects you belong to and never sends wages, ID documents or incident notes.
// All styling is scoped under .ptf so it cannot clash with the app's own CSS.
const POLL_MS = 20000;   // how often to look for new activity (paused while the tab is hidden)
const TOAST_MS = 9000;   // how long a pop-out stays (pauses while the mouse is over it)
const MAX_TOASTS = 3;
const PREVIEW = 8;       // people shown per group before "Show all"
const SEARCH_AT = 10;    // show the search box once a project has this many people
const STALE_MS = 15000;  // reuse data younger than this when the widget re-mounts on navigation

// Survives page-to-page navigation (each page re-mounts the layout), so we do not refetch on every
// click and a pop-out that arrives while you are navigating is still shown.
const store = { projects: null, activity: null, baseline: null, hidden: false, fetchedAt: 0 };
export const resetTeamWidgetStore = () => Object.assign(store, { projects: null, activity: null, baseline: null, hidden: false, fetchedAt: 0 });

const STAFF_TONES = [["#e0ebff", "#1d4ed8"], ["#e0f2fe", "#0369a1"], ["#ede9fe", "#6d28d9"], ["#cffafe", "#0e7490"], ["#fce7f3", "#be185d"]];
const LABOUR_TONES = [["#fef3c7", "#b45309"], ["#ffedd5", "#c2410c"], ["#fee2e2", "#b91c1c"], ["#ecfccb", "#4d7c0f"], ["#f1f5f9", "#475569"]];
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const initials = (name) => {
  const w = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || "?") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};
const ago = (iso) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const IconPeople = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
);

const CSS = `
.ptf{--ink:#0f172a;--muted:#64748b;--line:#e5eaf3;--blue:#2563eb;position:fixed;right:24px;bottom:24px;z-index:1050;font-family:inherit;line-height:1.35;color:var(--ink)}
.ptf *{box-sizing:border-box}
.ptf-fab{position:relative;display:grid;place-items:center;width:58px;height:58px;border:none;border-radius:50%;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;cursor:pointer;box-shadow:0 8px 22px -6px rgba(37,99,235,.65),0 2px 6px rgba(15,23,42,.18);transition:transform .15s,box-shadow .15s}
.ptf-fab:hover{transform:translateY(-2px);box-shadow:0 12px 26px -6px rgba(37,99,235,.7),0 2px 8px rgba(15,23,42,.2)}
.ptf-fab:focus-visible{outline:3px solid #93b4ff;outline-offset:3px}
.ptf-fab.ring:after{content:"";position:absolute;inset:-4px;border-radius:50%;border:3px solid rgba(37,99,235,.5);animation:ptf-ring 1.2s ease-out 3}
.ptf-badge{position:absolute;top:-3px;right:-3px;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#ef4444;color:#fff;border:2px solid #fff;font-size:11.5px;font-weight:700;display:grid;place-items:center}
.ptf-panel{position:absolute;right:0;bottom:74px;width:400px;max-width:calc(100vw - 24px);max-height:min(640px,calc(100vh - 120px));display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 24px 60px -16px rgba(15,23,42,.35),0 4px 14px rgba(15,23,42,.08);overflow:hidden;animation:ptf-pop .22s cubic-bezier(.2,.8,.2,1);transform-origin:bottom right}
.ptf-top{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:16px 16px 10px}
.ptf-title{margin:0;font-size:16px;font-weight:700;letter-spacing:-.01em}
.ptf-sub{margin:2px 0 0;font-size:12.5px;color:var(--muted)}
.ptf-x{flex:none;display:grid;place-items:center;width:30px;height:30px;border:none;border-radius:8px;background:#f1f5f9;color:#475569;cursor:pointer}
.ptf-x:hover{background:#e2e8f0}
.ptf-tabs{display:flex;gap:4px;padding:0 16px;border-bottom:1px solid var(--line)}
.ptf-tab{position:relative;flex:none;white-space:nowrap;padding:8px 12px 10px;border:none;background:none;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer}
.ptf-tab.on{color:var(--blue)}.ptf-tab.on:after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:2px;border-radius:2px;background:var(--blue)}
.ptf-tab i{font-style:normal;margin-left:6px;padding:1px 7px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px}
.ptf-body{padding:14px 16px 16px;overflow-y:auto;overscroll-behavior:contain}
.ptf-select,.ptf-search{width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:13.5px;color:var(--ink);background:#fff;margin-bottom:10px}
.ptf-select{font-weight:600}
.ptf-select:focus-visible,.ptf-search:focus-visible,.ptf-tab:focus-visible,.ptf-x:focus-visible,.ptf-more:focus-visible,.ptf-link:focus-visible{outline:2px solid #93b4ff;outline-offset:2px}
.ptf-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
.ptf-pill{padding:4px 10px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:600}
.ptf-pill b{color:var(--ink)}.ptf-pill.blue{background:#eff6ff;color:#1d4ed8}.ptf-pill.blue b{color:#1e3a8a}.ptf-pill.amber{background:#fff7ed;color:#c2410c}.ptf-pill.amber b{color:#9a3412}
.ptf-gt{display:flex;align-items:center;gap:8px;margin:14px 0 8px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#475569}
.ptf-gt:after{content:"";flex:1;height:1px;background:#eef2f7}
.ptf-count{padding:1px 7px;border-radius:999px;background:#eef2f7;color:#334155;font-size:10.5px;letter-spacing:0}
.ptf-p{display:flex;align-items:center;gap:10px;min-width:0;padding:8px 10px;margin-bottom:6px;border:1px solid #eef2f7;border-radius:12px;background:#fbfcfe}
.ptf-p:hover{border-color:#c7d7fe;background:#f6f9ff}.ptf-p.me{border-color:#bfd3ff;background:#f3f7ff}
.ptf-av{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700}
.ptf-t{min-width:0;flex:1}
.ptf-n{display:flex;align-items:center;gap:6px;min-width:0;font-size:13.5px;font-weight:650}
.ptf-n .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ptf-r,.ptf-d{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ptf-r{font-size:12px;color:#475569}.ptf-d{font-size:11px;color:var(--muted)}
.ptf-you{flex:none;padding:1px 7px;border-radius:999px;background:var(--blue);color:#fff;font-size:10px;font-weight:700}
.ptf-st{flex:none;padding:2px 8px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:10.5px;font-weight:600}
.ptf-more,.ptf-link{border:none;background:none;color:var(--blue);font-size:12.5px;font-weight:600;cursor:pointer;padding:6px 2px}
.ptf-more{display:block;margin:2px 0 0}
.ptf-a{display:flex;gap:10px;padding:10px;margin-bottom:6px;border:1px solid #eef2f7;border-radius:12px;background:#fff}
.ptf-a.new{background:#f3f7ff;border-color:#bfd3ff}
.ptf-ai{flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#e0ebff;color:#1d4ed8}
.ptf-a.task .ptf-ai,.ptf-toast.task .ptf-ai{background:#dcfce7;color:#15803d}
.ptf-a.warning .ptf-ai,.ptf-toast.warning .ptf-ai{background:#ffedd5;color:#c2410c}
.ptf-at{font-size:13px;font-weight:650}.ptf-ad{margin-top:1px;font-size:12.5px;color:#475569;overflow-wrap:anywhere}.ptf-aw{margin-top:3px;font-size:11px;color:var(--muted)}
.ptf-foot{display:flex;justify-content:flex-end;padding-top:2px}
.ptf-empty{padding:16px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;color:var(--muted);font-size:13px;line-height:1.5}
.ptf-empty b{display:block;color:var(--ink);font-size:13.5px;margin-bottom:2px}
.ptf-toasts{position:absolute;right:0;bottom:74px;display:flex;flex-direction:column;gap:10px;width:340px;max-width:calc(100vw - 24px)}
.ptf-toast{display:flex;gap:10px;align-items:flex-start;padding:12px;background:#fff;border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:14px;box-shadow:0 14px 34px -12px rgba(15,23,42,.35);animation:ptf-in .3s cubic-bezier(.2,.8,.2,1)}
.ptf-toast.task{border-left-color:#16a34a}.ptf-toast.warning{border-left-color:#f97316}
.ptf-toast .ptf-x{width:26px;height:26px}
.ptf-tm{flex:1;min-width:0}.ptf-tbtn{margin-top:6px}
@keyframes ptf-in{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
@keyframes ptf-pop{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ptf-ring{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.5)}}
@media (max-width:640px){.ptf{right:14px;bottom:14px}.ptf-panel{position:fixed;left:12px;right:12px;bottom:84px;width:auto;max-height:calc(100vh - 110px)}.ptf-toasts{position:fixed;left:12px;right:12px;bottom:84px;width:auto}}
@media (prefers-reduced-motion:reduce){.ptf-panel,.ptf-toast{animation:none}.ptf-fab.ring:after{animation:none}.ptf-fab{transition:none}}
@media print{.ptf{display:none}}
`;

function Person({ p }) {
  const tones = p.type === "Labour" ? LABOUR_TONES : STAFF_TONES;
  const [bg, fg] = tones[hash(p.name) % tones.length];
  const detail = p.detail && p.detail !== p.role ? p.detail : "";
  return (
    <div className={`ptf-p${p.is_me ? " me" : ""}`} title={[p.name, p.role, detail].filter(Boolean).join(" · ")}>
      <div className="ptf-av" style={{ background: bg, color: fg }} aria-hidden="true">{initials(p.name)}</div>
      <div className="ptf-t">
        <div className="ptf-n"><span className="nm">{p.name}</span>{p.is_me && <span className="ptf-you">You</span>}</div>
        <div className="ptf-r">{p.role}</div>
        {detail && <div className="ptf-d">{detail}</div>}
      </div>
      {p.status && p.status !== "Active" && <span className="ptf-st">{p.status}</span>}
    </div>
  );
}

function Group({ title, people }) {
  const [all, setAll] = useState(false);
  if (!people.length) return null;
  const shown = all ? people : people.slice(0, PREVIEW);
  return (
    <section>
      <div className="ptf-gt">{title}<span className="ptf-count">{people.length}</span></div>
      {shown.map((p) => <Person key={p.key} p={p} />)}
      {people.length > PREVIEW && (
        <button type="button" className="ptf-more" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${people.length}`}</button>
      )}
    </section>
  );
}

export default function TeamFloatingWidget() {
  const [projects, setProjects] = useState(store.projects);
  const [activity, setActivity] = useState(store.activity);
  const [hidden, setHidden] = useState(store.hidden);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("team");
  const [active, setActive] = useState(0);
  const [q, setQ] = useState("");
  const [toasts, setToasts] = useState([]);
  const [ring, setRing] = useState(false);
  const [fresh, setFresh] = useState(() => new Set());
  const rootRef = useRef(null);
  const live = useRef({ open: false, tab: "team" });
  const timers = useRef(new Map());
  const ringTimer = useRef(null);
  live.current = { open, tab };

  const fail = useCallback((e) => {
    const s = e?.response?.status;
    if (s === 401 || s === 403 || s === 404) { store.hidden = true; setHidden(true); } // no access / old backend: stay out of the way
  }, []);

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);
  const arm = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => dismiss(id), TOAST_MS));
  }, [dismiss]);
  const hold = useCallback((id) => { clearTimeout(timers.current.get(id)); }, []);

  const loadProjects = useCallback(async () => {
    try {
      const d = await teamApi.fetchMyProjectTeams();
      store.projects = Array.isArray(d) ? d : [];
      setProjects(store.projects);
    } catch (e) { fail(e); }
  }, [fail]);

  const markSeen = useCallback(async (upTo) => {
    try {
      const r = await teamApi.markTeamActivitySeen(upTo);
      const a = store.activity;
      if (a) {
        store.activity = { ...a, unseen: Number(r?.unseen) || 0, items: a.items.map((i) => (i.id <= upTo ? { ...i, is_seen: true } : i)) };
        setActivity(store.activity);
      }
    } catch (e) { fail(e); }
  }, [fail]);

  const poll = useCallback(async () => {
    try {
      const data = await teamApi.fetchTeamActivity();
      const items = (Array.isArray(data?.items) ? data.items : []).map((i) => ({ ...i, id: Number(i.id) }));
      const latest = Number(data?.latest_id) || 0;
      store.activity = { items, unseen: Number(data?.unseen) || 0, latest_id: latest };
      store.fetchedAt = Date.now(); store.hidden = false;
      setActivity(store.activity); setHidden(false);
      if (store.baseline === null) { store.baseline = latest; return; } // first look: badge only, no pop-outs for old items
      const incoming = items.filter((i) => i.id > store.baseline).sort((a, b) => a.id - b.id);
      if (!incoming.length) return;
      store.baseline = Math.max(store.baseline, latest);
      if (incoming.some((i) => i.kind === "team")) loadProjects(); // roster changed: refresh the list quietly
      const { open: isOpen, tab: curTab } = live.current;
      if (isOpen) { // panel already open: no pop-out; highlight and read straight away if they are on the Activity tab
        if (curTab === "activity") { setFresh((prev) => new Set([...prev, ...incoming.map((i) => i.id)])); markSeen(latest); }
        return;
      }
      setRing(true); clearTimeout(ringTimer.current); ringTimer.current = setTimeout(() => setRing(false), 4000);
      const list = incoming.length > MAX_TOASTS
        ? [{ id: `sum-${latest}`, kind: "team", severity: "info", title: `${incoming.length} new team updates`, description: "Open your project team to read them.", created_at: new Date().toISOString() }]
        : incoming;
      setToasts((t) => [...t, ...list].slice(-MAX_TOASTS));
      list.forEach((x) => arm(x.id));
    } catch (e) { fail(e); }
  }, [arm, fail, loadProjects, markSeen]);

  useEffect(() => {
    if (store.projects === null) loadProjects();
    if (store.activity === null || Date.now() - store.fetchedAt > STALE_MS) poll();
    const id = setInterval(() => { if (!store.hidden && !document.hidden) poll(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden && !store.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const toastTimers = timers.current;
    return () => {
      clearInterval(id); clearTimeout(ringTimer.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      toastTimers.forEach((t) => clearTimeout(t)); toastTimers.clear();
    };
  }, [loadProjects, poll]);

  // Esc or a click outside closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  const showActivity = useCallback(() => {
    const a = store.activity;
    if (!a) return;
    setFresh(new Set(a.items.filter((i) => !i.is_seen).map((i) => i.id)));
    if (a.unseen > 0) markSeen(a.latest_id);
  }, [markSeen]);

  const openPanel = (nextTab) => {
    toastsClear();
    setOpen(true); setTab(nextTab);
    if (nextTab === "activity") showActivity();
  };
  const toastsClear = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current.clear(); setToasts([]); };
  const toggle = () => { if (open) setOpen(false); else openPanel((activity?.unseen || 0) > 0 ? "activity" : "team"); };
  const selectTab = (t) => { setTab(t); if (t === "activity") showActivity(); };

  const unseen = activity?.unseen || 0;
  const hasProjects = !!(projects && projects.length);
  const p = hasProjects ? projects[Math.min(active, projects.length - 1)] : null;
  const needle = q.trim().toLowerCase();
  const people = useMemo(() => {
    if (!p) return [];
    return needle ? p.people.filter((x) => `${x.name} ${x.role} ${x.detail || ""}`.toLowerCase().includes(needle)) : p.people;
  }, [p, needle]);

  if (hidden) return null;
  if (!hasProjects && !(activity && activity.items.length)) return null; // nothing to show for this person

  const staff = p ? p.people.filter((x) => x.type === "Staff") : [];
  const labour = p ? p.people.filter((x) => x.type === "Labour") : [];

  return (
    <div className="ptf" ref={rootRef}>
      <style>{CSS}</style>

      {!open && toasts.length > 0 && (
        <div className="ptf-toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`ptf-toast ${t.kind === "task" ? "task" : ""} ${t.severity === "warning" ? "warning" : ""}`}
              onMouseEnter={() => hold(t.id)} onMouseLeave={() => arm(t.id)}>
              <div className="ptf-ai">{t.kind === "task" ? <IconCheck /> : <IconUsers />}</div>
              <div className="ptf-tm">
                <div className="ptf-at">{t.title}</div>
                <div className="ptf-ad">{t.description}</div>
                <button type="button" className="ptf-link ptf-tbtn" onClick={() => openPanel("activity")}>View</button>
              </div>
              <button type="button" className="ptf-x" aria-label="Dismiss" onClick={() => dismiss(t.id)}><IconClose /></button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="ptf-panel" role="dialog" aria-label="My Project Team">
          <div className="ptf-top">
            <div>
              <h3 className="ptf-title">My Project Team</h3>
              <p className="ptf-sub">{p ? `${p.project_name}${projects.length > 1 ? ` · ${projects.length} projects` : ""} · read-only` : "Read-only"}</p>
            </div>
            <button type="button" className="ptf-x" aria-label="Close" onClick={() => setOpen(false)}><IconClose /></button>
          </div>
          <div className="ptf-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "team"} className={`ptf-tab${tab === "team" ? " on" : ""}`} onClick={() => selectTab("team")}>Team</button>
            <button type="button" role="tab" aria-selected={tab === "activity"} className={`ptf-tab${tab === "activity" ? " on" : ""}`} onClick={() => selectTab("activity")}>
              Activity{unseen > 0 && <i>{unseen > 9 ? "9+" : unseen}</i>}
            </button>
          </div>

          <div className="ptf-body">
            {tab === "team" && (!p
              ? <div className="ptf-empty"><b>You are not on a project team yet</b>Once you are assigned to a project, or your Project Manager adds you to its team, your teammates will appear here.</div>
              : <>
                  {projects.length > 1 && (
                    <select className="ptf-select" aria-label="Project" value={active} onChange={(e) => { setActive(Number(e.target.value)); setQ(""); }}>
                      {projects.map((x, i) => <option key={x.project_id} value={i}>{x.project_name} ({x.people.length})</option>)}
                    </select>
                  )}
                  <div className="ptf-pills">
                    <span className="ptf-pill blue">Project Manager <b>{p.project_manager || "Not assigned"}</b></span>
                    <span className="ptf-pill"><b>{staff.length}</b> staff</span>
                    <span className="ptf-pill amber"><b>{labour.length}</b> labour</span>
                  </div>
                  {p.people.length >= SEARCH_AT && (
                    <input className="ptf-search" type="search" placeholder="Search people" aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginTop: 10 }} />
                  )}
                  {people.length === 0
                    ? <div className="ptf-empty" style={{ marginTop: 10 }}>{needle ? "No one matches your search." : "No one is listed on this project yet."}</div>
                    : <>
                        <Group key={`${p.project_id}-s`} title="Staff" people={people.filter((x) => x.type === "Staff")} />
                        <Group key={`${p.project_id}-l`} title="Labour" people={people.filter((x) => x.type === "Labour")} />
                      </>}
                </>)}

            {tab === "activity" && (!activity || activity.items.length === 0
              ? <div className="ptf-empty"><b>No activity yet</b>Changes to your project team and tasks assigned to you will show up here.</div>
              : <>
                  {activity.items.map((i) => (
                    <div key={i.id} className={`ptf-a ${i.kind === "task" ? "task" : ""} ${i.severity === "warning" ? "warning" : ""}${fresh.has(i.id) ? " new" : ""}`}>
                      <div className="ptf-ai">{i.kind === "task" ? <IconCheck /> : <IconUsers />}</div>
                      <div>
                        <div className="ptf-at">{i.title}</div>
                        <div className="ptf-ad">{i.description}</div>
                        <div className="ptf-aw">{ago(i.created_at)}</div>
                      </div>
                    </div>
                  ))}
                  {unseen > 0 && <div className="ptf-foot"><button type="button" className="ptf-link" onClick={() => markSeen(activity.latest_id)}>Mark all as read</button></div>}
                </>)}
          </div>
        </div>
      )}

      <button type="button" className={`ptf-fab${ring && !open ? " ring" : ""}`} onClick={toggle}
        aria-label={unseen > 0 ? `Project team, ${unseen} new` : "Project team"} aria-expanded={open}>
        <IconPeople />
        {unseen > 0 && <span className="ptf-badge">{unseen > 9 ? "9+" : unseen}</span>}
      </button>
    </div>
  );
}
