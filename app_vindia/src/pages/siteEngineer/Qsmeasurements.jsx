// src/pages/siteEngineer/QSMeasurements.jsx
// FIX: api.post now calls /site-measurements (was /measurements)

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import api from "../../services/api";
import "../../styles/shared-pages.css";
import "../../styles/Qsmeasurements.css";

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const UNITS = [
  "sqm","m²","m³","m","sqft","RMT","nos",
  "kg","tonnes","bags","litre","LS",
];

const BOQ_STATUS = {
  measurement_pending:  { label: "Awaiting Measurements",     color: "#BA7517", bg: "#FEF3C7", border: "#FCD34D" },
  measurement_received: { label: "Measurements Received",     color: "#185FA5", bg: "#E6F1FB", border: "#90C1EF" },
  pending_se_approval:  { label: "QR Needs Your Review",      color: "#6D28D9", bg: "#EDE9FE", border: "#C4B5FD" },
  rejected_by_se:       { label: "Rejected by SE ↩️",         color: "#791F1F", bg: "#FCEBEB", border: "#E8A0A0" },
  finalised:            { label: "Finalised ✅",               color: "#085041", bg: "#E1F5EE", border: "#5DCAA5" },
};

const QR_STATUS = {
  pending_se: { label: "Awaiting Your Approval", icon: "⏳", color: "#185FA5", bg: "#E6F1FB", border: "#90C1EF" },
  approved:   { label: "Approved by You ✅",     icon: "✅", color: "#085041", bg: "#E1F5EE", border: "#5DCAA5" },
  rejected:   { label: "Rejected by You ↩️",    icon: "↩️", color: "#791F1F", bg: "#FCEBEB", border: "#E8A0A0" },
};

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
const safeArr = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
  if (typeof v === "object") return Array.isArray(v) ? v : [];
  return [];
};
const toNum   = (v) => parseFloat(v) || 0;
const nowISO  = ()  => new Date().toISOString().slice(0, 10);
const fmtDate = (s) => s
  ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  : "—";

function varPct(actual, boq) {
  if (!boq) return null;
  return Math.round(((actual - boq) / boq) * 100);
}
function varStyle(pct) {
  if (pct === null) return { color: "var(--c-text-3)", bg: "transparent", border: "none" };
  const abs = Math.abs(pct);
  if (abs <= 5)  return { color: "#085041", bg: "#E1F5EE", border: "#5DCAA5" };
  if (abs <= 15) return { color: "#92400E", bg: "#FEF3C7", border: "#FCD34D" };
  return { color: "#7F1D1D", bg: "#FEE2E2", border: "#FCA5A5" };
}
const blankItem = () => ({ description: "", unit: "sqm", qty_actual: "" });

/* ─────────────────────────────────────────────────────────
   STEP BAR
───────────────────────────────────────────────────────── */
function StepBar({ step }) {
  const steps = [
    { n: 1, label: "View BOQ"      },
    { n: 2, label: "Measure"       },
    { n: 3, label: "QS Creates QR" },
    { n: 4, label: "You Approve"   },
    { n: 5, label: "BOQ Final"     },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20, flexWrap: "wrap" }}>
      {steps.map((s, i) => {
        const done    = step > s.n;
        const current = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "6px 12px", borderRadius: 99,
              background: current ? "var(--c-navy-700,#0A4174)" : done ? "#E1F5EE" : "var(--c-surface-2,#F4F8FB)",
              border: `1px solid ${current ? "var(--c-navy-700)" : done ? "#5DCAA5" : "var(--c-border,rgba(10,65,116,.12))"}`,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800,
                background: current ? "#fff" : done ? "#085041" : "var(--c-border)",
                color: current ? "var(--c-navy-700)" : done ? "#fff" : "var(--c-text-3)",
              }}>
                {done ? "✓" : s.n}
              </span>
              <span style={{
                fontSize: 11, fontWeight: current ? 700 : 500,
                color: current ? "#fff" : done ? "#085041" : "var(--c-text-3)",
              }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 24, height: 1, background: done ? "#5DCAA5" : "var(--c-border,rgba(10,65,116,.12))" }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   STATUS BADGES
───────────────────────────────────────────────────────── */
function BoqStatusBadge({ status }) {
  const s = BOQ_STATUS[status] || { label: status, color: "#666", bg: "#f4f4f4", border: "#ccc" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

function QrStatusBadge({ status }) {
  const s = QR_STATUS[status] || { label: status, icon: "📑", color: "#666", bg: "#f4f4f4", border: "#ccc" };
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap",
    }}>{s.icon} {s.label}</span>
  );
}

/* ─────────────────────────────────────────────────────────
   VARIANCE BADGE
───────────────────────────────────────────────────────── */
function VarBadge({ actual, boq }) {
  if (boq === null || boq === undefined)
    return <span style={{ color: "var(--c-text-3)", fontSize: 11 }}>—</span>;
  const pct = varPct(actual, boq);
  const st  = varStyle(pct);
  const lbl = pct === 0 ? "On BOQ" : pct > 0 ? `+${pct}%` : `${pct}%`;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: "monospace",
      padding: "2px 8px", borderRadius: 99,
      background: st.bg, color: st.color,
      border: st.border !== "none" ? `1px solid ${st.border}` : "none",
    }}>{lbl}</span>
  );
}

/* ─────────────────────────────────────────────────────────
   BOQ ITEMS TABLE (read-only, prices hidden)
───────────────────────────────────────────────────────── */
function BoqItemsTable({ rows }) {
  const items = safeArr(rows);
  if (!items.length)
    return <div style={{ fontSize: 12, color: "var(--c-text-3)", padding: "8px 0" }}>No BOQ items recorded.</div>;
  return (
    <table className="qs-line-table">
      <thead>
        <tr>
          <th>#</th><th>Material / Item</th><th>Unit</th>
          <th>BOQ Qty (Planned)</th><th>Rate</th>
        </tr>
      </thead>
      <tbody>
        {items.map((r, i) => (
          <tr key={i}>
            <td style={{ fontFamily: "monospace", color: "var(--c-text-3)", width: 32 }}>{i + 1}</td>
            <td style={{ fontWeight: 600, color: "var(--c-navy-900,#001D39)" }}>{r.material}</td>
            <td style={{ fontFamily: "monospace", color: "var(--c-text-3)" }}>{r.unit}</td>
            <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#185FA5" }}>
              {toNum(r.quantity).toLocaleString("en-IN")}
            </td>
            <td style={{ fontSize: 11, color: "var(--c-text-3)", fontStyle: "italic" }}>🔒 Hidden</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function QSMeasurements() {
  console.count("QSMeasurements Render");

  const [view,     setView]    = useState("list");
  const [selBoq,   setSelBoq]  = useState(null);
  const [qr,       setQr]      = useState(null);
  const [qrLoaded, setQrLoaded]= useState(false);

  const [boqs,       setBoqs]    = useState([]);
  const [boqLoading, setBoqLoad] = useState(true);
  const [boqSearch,  setBSearch] = useState("");
  const [filterProj, setFProj]   = useState("");
  const [projects,   setProjects]= useState([]);

  const [labourReports, setLRs] = useState([]);

  const [mDate,   setMDate]  = useState(nowISO());
  const [mZone,   setMZone]  = useState("");
  const [mAct,    setMAct]   = useState("");
  const [mNotes,  setMNotes] = useState("");
  const [mItems,  setMItems] = useState([blankItem()]);
  const [mErrors, setMErrors]= useState({});
  const [mMsg,    setMMsg]   = useState("");
  const [mSaving, setMSaving]= useState(false);
  const [linkedLR,setLLR]    = useState("");
  const [lrDetails, setLrDetails] = useState(null);

  const [qrActing,      setQrActing] = useState(false);
  const [qrMsg,         setQrMsg]    = useState("");
  const [showReject,    setShowRej]  = useState(false);
  const [rejectComment, setRejCmt]   = useState("");

  const pollRef = useRef(null);
  const alive   = useRef(true);

  /* ── Mount ── */
  useEffect(() => {
    alive.current = true;
    loadBoqs();
    loadProjects();
    loadLabourReports();
    return () => { alive.current = false; clearInterval(pollRef.current); };
  }, []);
  useEffect(() => {
  if (!linkedLR) {
    setLrDetails(null);
    return;
  }

  const loadLabourReportDetails = async () => {
    try {
      const res = await api.get(`/labour-report/measurement/${linkedLR}`);

      const data = res.data;

      setLrDetails(data);

      // Auto-fill the measurement form
      setMDate(data.date || nowISO());
      setMZone(data.zone || "");
      setMAct(data.work_done || "");

    } catch (err) {
      console.error("Failed to load labour report details", err);
    }
  };

  loadLabourReportDetails();

}, [linkedLR]);

  /* ── Loaders ── */
  async function loadBoqs() {
    setBoqLoad(true);
    try {
      const res = await api.get("/boq?role=se");
      const raw = Array.isArray(res?.data) ? res.data : safeArr(res?.data?.data);
      if (alive.current) setBoqs(raw);
    } catch (e) {
      console.error("loadBoqs:", e?.response?.data || e.message);
    } finally {
      if (alive.current) setBoqLoad(false);
    }
  }

  async function loadProjects() {
    try {
      const r = await api.get("/projects");
      if (alive.current) setProjects(Array.isArray(r?.data) ? r.data : r?.data?.data || []);
    } catch {}
  }

  async function loadLabourReports() {
  try {
    const r = await api.get("/labour-report");
    const list = Array.isArray(r?.data) ? r.data : [];

    if (alive.current) {
      setLRs(list);
    }
  } catch {}
}

  /* ── Fetch QR ── */
  const fetchQr = useCallback(async (boqId) => {
    console.count("fetchQr");
    console.log("Fetching QR for:", boqId);
    try {
      const res  = await api.get(`/quantity-report?boqId=${boqId}`);
      const list = Array.isArray(res?.data) ? res.data : safeArr(res?.data?.data);
      const active = list.find(r => !["rejected","obsolete"].includes(r.status)) || list[0] || null;
      if (alive.current) { setQr(active); setQrLoaded(true); }
      return active;
    } catch (e) {
      console.error("fetchQr:", e?.response?.data || e.message);
      if (alive.current) { setQr(null); setQrLoaded(true); }
      return null;
    }
  }, []);

  function startPolling(boqId) {
        console.log("START POLLING", boqId);

    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
              console.log("POLL TICK");
      const found = await fetchQr(boqId);
      if (found) clearInterval(pollRef.current);
    }, 15000);
  }

  /* ── Open BOQ detail ── */
  const openBoq = useCallback(async (boq) => {
  clearInterval(pollRef.current);

  setSelBoq(boq);
  setView("detail");

  setQr(null);
  setQrLoaded(false);
  setQrMsg("");
  setMMsg("");
  setMErrors({});
  setShowRej(false);
  setRejCmt("");

  setMZone(boq.milestoneName || "");
  setMAct("");
  setMDate(nowISO());
  setMItems([blankItem()]);

  // Find today's Labour Report for THIS BOQ's project
  const matchingLabour = labourReports.find((lr) => {
  const sameDate = lr.date === nowISO();

  const sameProject =
    String(lr.project_id || "") ===
    String(boq.projectId || "");

  const sameMilestone =
    !boq.milestoneId ||
    String(lr.milestone_id || "") ===
    String(boq.milestoneId || "");

  return sameDate && sameProject && sameMilestone;
});

  if (matchingLabour) {
    setLLR(String(matchingLabour.id));
  } else {
    setLLR("");
  }

  const found = await fetchQr(boq.id);

  if (!found) {
    startPolling(boq.id);
  }
}, [fetchQr, labourReports]);

  const backToList = useCallback(() => {
    clearInterval(pollRef.current);
    setView("list"); setSelBoq(null);
    setQr(null); setQrLoaded(false);
    setQrMsg(""); setMMsg("");
  }, []);

  const refreshQr = useCallback(async () => {
    if (!selBoq) return;
    setQrLoaded(false);
    const found = await fetchQr(selBoq.id);
    if (!found) startPolling(selBoq.id);
    else clearInterval(pollRef.current);
  }, [selBoq, fetchQr]);

  /* ── Measurement form helpers ── */
  const addItem    = () => setMItems(p => [...p, blankItem()]);
  const removeItem = (i) => setMItems(p => p.filter((_, j) => j !== i));
  const setItem    = (i, k, v) =>
    setMItems(p => { const c = [...p]; c[i] = { ...c[i], [k]: v }; return c; });

  function validateMeas() {
    const e = {};
    if (!mDate)        e.date  = "Date required";
    if (!mZone.trim()) e.zone  = "Zone / location required";
    const valid = mItems.filter(it => it.description.trim() && toNum(it.qty_actual) > 0);
    if (!valid.length) e.items = "At least one item with description and quantity is required";
    return e;
  }

  /* ── SUBMIT MEASUREMENT ──────────────────────────────────
     FIX: posts to /site-measurements (was /measurements)
     FIX: payload uses camelCase field names matching
          siteMeasurementController.create() exactly
  ───────────────────────────────────────────────────────── */
  const submitMeasurement = useCallback(async (ev) => {
    ev?.preventDefault();
    const errs = validateMeas();
    setMErrors(errs);
    if (Object.keys(errs).length) { setMMsg("Fix errors above"); return; }

    setMSaving(true);
    setMMsg("Submitting…");

    try {
      const validItems = mItems.filter(
        it => it.description.trim() && toNum(it.qty_actual) > 0
      );

      // ── Payload exactly matches siteMeasurementController.create() ──
      const payload = {
  boqId: selBoq.id,
  projectId: selBoq.projectId,
  milestoneId: selBoq.milestoneId,

  labourReportId: linkedLR || null,
  dailyDiaryId: lrDetails?.daily_diary_id || null,

  submittedBy: "Site Engineer",

  date: mDate,
  zone: mZone,
  activity: mAct || "",
  notes: mNotes || "",

  items: validItems.map(it => ({
    description: it.description.trim(),
    unit: it.unit,
    qty_actual: toNum(it.qty_actual),
  })),
};

      console.log("📐 Submitting to /site-measurements →", payload);

      // ── FIXED ENDPOINT ──
      await api.post("/site-measurements", payload);

      setMMsg("✓ Submitted! QS will now create a Quantity Report.");
      setMItems([blankItem()]);
      setMNotes("");

      setSelBoq(prev => prev ? {
        ...prev,
        status: "measurement_received",
        hasMeasurements: true,
      } : prev);

      loadBoqs();
      startPolling(selBoq.id);

    } catch (err) {
      const msg = err?.response?.data?.error || "Submission failed";
      console.error("submitMeasurement error:", msg);
      setMMsg(`Error: ${msg}`);
    } finally {
      if (alive.current) setMSaving(false);
    }
}, [
  selBoq,
  mDate,
  mZone,
  mAct,
  mNotes,
  mItems,
  linkedLR,
  lrDetails,
]);

  /* ── QR Approve ── */
  const approveQr = useCallback(async () => {
    if (!qr) return;
    setQrActing(true); setQrMsg("");
    try {
      await api.put(`/quantity-report/approve/${qr.id}`, {});
      setQr(p => ({ ...p, status: "approved" }));
      setSelBoq(p => p ? { ...p, status: "finalised" } : p);
      setBoqs(prev => prev.map(b =>
        b.id === selBoq?.id ? { ...b, status: "finalised", qtyReportStatus: "approved" } : b
      ));
      setQrMsg("✅ Approved — BOQ is now finalised! QS can generate the Final Bill.");
    } catch (err) {
      setQrMsg(`❌ ${err?.response?.data?.error || "Approval failed"}`);
    } finally { setQrActing(false); }
  }, [qr, selBoq]);

  /* ── QR Reject ── */
  const rejectQr = useCallback(async () => {
    if (!qr) return;
    if (!rejectComment.trim()) { setQrMsg("❌ Please enter a rejection comment."); return; }
    setQrActing(true); setQrMsg("");
    try {
      await api.put(`/quantity-report/reject/${qr.id}`, { comment: rejectComment.trim() });
      setQr(p => ({ ...p, status: "rejected", seComment: rejectComment }));
      setSelBoq(p => p ? { ...p, status: "rejected_by_se" } : p);
      setBoqs(prev => prev.map(b =>
        b.id === selBoq?.id ? { ...b, status: "rejected_by_se", qtyReportStatus: "rejected" } : b
      ));
      setShowRej(false); setRejCmt("");
      setQrMsg("↩️ Changes requested — QS will revise and resubmit.");
    } catch (err) {
      setQrMsg(`❌ ${err?.response?.data?.error || "Rejection failed"}`);
    } finally { setQrActing(false); }
  }, [qr, rejectComment, selBoq]);

  /* ── Computed ── */
  const filteredBoqs = useMemo(() => {
    let list = boqs.slice();
    if (filterProj) list = list.filter(b => String(b.projectId) === filterProj);
    if (boqSearch.trim()) {
      const q = boqSearch.toLowerCase();
      list = list.filter(b =>
        (b.projectName || "").toLowerCase().includes(q) ||
        (b.milestoneName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [boqs, filterProj, boqSearch]);

  const boqCounts = useMemo(() => ({
    total:      boqs.length,
    needReview: boqs.filter(b => b.qtyReportStatus === "pending_se").length,
    finalised:  boqs.filter(b => b.status === "finalised").length,
  }), [boqs]);

  function currentStep() {
    if (!selBoq) return 1;
    if (!qr) {
      if (selBoq.hasMeasurements || selBoq.status === "measurement_received") return 3;
      return 2;
    }
    if (qr.status === "approved") return 5;
    if (qr.status === "rejected") return 3;
    return 4;
  }

  const todayLR = useMemo(
  () =>
    labourReports.find(
      lr =>
        lr.date === nowISO() &&
        String(lr.project_id || "") ===
          String(selBoq?.projectId || "")
    ),
  [labourReports, selBoq]
);
  const selLR     = labourReports.find(lr => String(lr.id) === linkedLR);
  const boqRows   = safeArr(selBoq?.rows);
  const boqLabour = safeArr(selBoq?.labourRows || selBoq?.labour_rows);
  const qrItems   = safeArr(qr?.items);
  const qrSt      = qr ? (QR_STATUS[qr.status] || QR_STATUS.pending_se) : null;

  /* ═══════════════════════════════════════════════════════════
     LIST VIEW
  ═══════════════════════════════════════════════════════════ */
  if (view === "list") {
    return (
      <div className="qs-page">
        <div className="qs-page-header">
          <div>
            <div className="qs-eyebrow">Site Engineer · Quantity Hub</div>
            <h1 className="qs-title">Measurements &amp; QR Approvals</h1>
            <div className="qs-sub">Select a BOQ → enter site measurements → review and approve the Quantity Report</div>
          </div>
          <div className="qs-header-pills">
            <span className="qs-pill qs-pill--muted">{boqCounts.total} BOQs</span>
            {boqCounts.needReview > 0 && (
              <span className="qs-pill qs-pill--danger">
                ⚠️ {boqCounts.needReview} QR{boqCounts.needReview > 1 ? "s" : ""} need approval
              </span>
            )}
          </div>
        </div>

        <div className="qs-pipeline">
          {[
            { icon:"📋", label:"QS Creates BOQ",  sub:"Planned quantities", dot:"qs-pipeline-dot--qs"      },null,
            { icon:"📐", label:"You Measure",     sub:"Enter actual qty",   dot:"qs-pipeline-dot--se"      },null,
            { icon:"📑", label:"QS Creates QR",   sub:"From measurement",   dot:"qs-pipeline-dot--qs"      },null,
            { icon:"✅", label:"You Approve",     sub:"Finalises the BOQ",  dot:"qs-pipeline-dot--billing" },null,
            { icon:"💰", label:"QS Bills",        sub:"Final certificate",  dot:"qs-pipeline-dot--qs"      },
          ].map((s, i) => s === null
            ? <div key={i} className="qs-pipeline-arrow">›</div>
            : (
              <div key={i} className="qs-pipeline-node">
                <div className={`qs-pipeline-dot ${s.dot}`}>{s.icon}</div>
                <div className="qs-pipeline-label">{s.label}</div>
                <div className="qs-pipeline-sub">{s.sub}</div>
              </div>
            )
          )}
        </div>

        <div className="qs-stats-bar">
          {[
            { icon:"📋", num:boqCounts.total,      lbl:"Total BOQs",      mod:"pending"  },
            { icon:"⏳", num:boqCounts.needReview, lbl:"QR Needs Review", mod:"verified" },
            { icon:"✅", num:boqCounts.finalised,  lbl:"Finalised",       mod:"approved" },
          ].map(({ icon, num, lbl, mod }) => (
            <div key={lbl} className={`qs-stat-card qs-stat-card--${mod}`}>
              <div className="qs-stat-icon">{icon}</div>
              <div className="qs-stat-info">
                <div className="qs-stat-num">{num}</div>
                <div className="qs-stat-lbl">{lbl}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="qs-controls" style={{ marginBottom: 16 }}>
          <div className="qs-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input value={boqSearch} onChange={e => setBSearch(e.target.value)}
              placeholder="Search project or milestone…"/>
          </div>
          <select className="qs-input qs-select" value={filterProj}
            onChange={e => setFProj(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {boqLoading ? (
          <div className="qs-loading"><div className="qs-spinner"/>Loading BOQs…</div>
        ) : filteredBoqs.length === 0 ? (
          <div className="qs-empty">
            <div style={{ fontSize: 40, opacity: .25, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, color: "var(--c-text-2)" }}>No BOQs found</div>
            <div style={{ fontSize: 12, color: "var(--c-text-3)", marginTop: 4, maxWidth: 300, textAlign: "center" }}>
              The Quantity Surveyor creates BOQs. They will appear here once created.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredBoqs.map(boq => {
              const qrs        = boq.qtyReportStatus;
              const needAction = qrs === "pending_se";
              const rows       = safeArr(boq.rows);
              return (
                <div key={boq.id} onClick={() => openBoq(boq)}
                  style={{
                    border: `1.5px solid ${needAction ? "#90C1EF" : "var(--c-border,rgba(10,65,116,.12))"}`,
                    borderLeft: `4px solid ${needAction ? "#185FA5" : "#CBD5E1"}`,
                    borderRadius: 12, cursor: "pointer",
                    background: needAction ? "#F0F7FF" : "var(--c-surface,#fff)",
                    transition: "box-shadow .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 18px rgba(10,65,116,.10)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                >
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", gap:16 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"monospace", fontSize:11, color:"var(--c-text-3)", fontWeight:700 }}>BOQ #{boq.id}</span>
                        <BoqStatusBadge status={boq.status}/>
                        {qrs && (
                          <span style={{
                            fontSize:11, padding:"2px 9px", borderRadius:99, fontWeight:600,
                            background: qrs==="approved"?"#E1F5EE":qrs==="pending_se"?"#E6F1FB":"#FCEBEB",
                            color:      qrs==="approved"?"#085041":qrs==="pending_se"?"#185FA5":"#791F1F",
                          }}>
                            📑 QR: {qrs==="approved"?"Approved ✅":qrs==="pending_se"?"Needs Review ⏳":"Rejected ↩️"}
                          </span>
                        )}
                        {needAction && (
                          <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:99, background:"#185FA5", color:"#fff", letterSpacing:".05em" }}>
                            ACTION NEEDED
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight:700, fontSize:15, color:"var(--c-navy-900,#001D39)", marginBottom:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {boq.projectName}
                      </div>
                      <div style={{ display:"flex", gap:14, flexWrap:"wrap", fontSize:12, color:"var(--c-text-3)" }}>
                        <span>🏗️ {boq.milestoneName}</span>
                        <span>📦 {rows.length} items</span>
                        <span>📅 {boq.date||"—"}</span>
                        {boq.hasMeasurements && (
                          <span style={{ color:"#085041", fontWeight:600 }}>
                            📐 {boq.measurementCount} measurement{boq.measurementCount!==1?"s":""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize:20, color:needAction?"#185FA5":"var(--c-text-3)", fontWeight:700, flexShrink:0 }}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     DETAIL VIEW
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="qs-page">
      <div className="qs-page-header">
        <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
          <button onClick={backToList} style={{
            marginTop:4, background:"none",
            border:"1px solid var(--c-border-md,rgba(10,65,116,.18))",
            borderRadius:8, padding:"5px 12px", cursor:"pointer",
            fontSize:12, color:"var(--c-navy-700,#0A4174)", fontWeight:600,
          }}>← All BOQs</button>
          <div>
            <div className="qs-eyebrow">BOQ #{selBoq?.id} · {selBoq?.projectName}</div>
            <h1 className="qs-title" style={{ fontSize:20, marginTop:2 }}>{selBoq?.milestoneName}</h1>
            <BoqStatusBadge status={selBoq?.status}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={refreshQr} style={{
            fontSize:11, padding:"5px 12px", borderRadius:8, cursor:"pointer",
            background:"transparent", border:"1px solid var(--c-border-md,rgba(10,65,116,.18))",
            color:"var(--c-navy-700)", fontWeight:600,
          }}>↻ Refresh QR</button>
          {qr ? <QrStatusBadge status={qr.status}/>
           : qrLoaded ? <span className="qs-pill qs-pill--muted">⏳ No QR yet</span>
           : null}
        </div>
      </div>

      <StepBar step={currentStep()}/>

      {qrMsg && (
        <div style={{
          marginBottom:16, padding:"12px 18px", borderRadius:10,
          fontSize:13, fontWeight:600,
          background: qrMsg.startsWith("✅")?"#E1F5EE":qrMsg.startsWith("↩️")?"#FEF3C7":"#FEE2E2",
          border: `1px solid ${qrMsg.startsWith("✅")?"#5DCAA5":qrMsg.startsWith("↩️")?"#FCD34D":"#FCA5A5"}`,
          color: qrMsg.startsWith("✅")?"#085041":qrMsg.startsWith("↩️")?"#92400E":"#7F1D1D",
        }}>{qrMsg}</div>
      )}

      <div className="qs-layout">
        <div className="qs-main">

          {/* SECTION 1 — BOQ table (always visible, no prices) */}
          <div className="qs-panel" style={{ marginBottom:20 }}>
            <div className="qs-panel-head">
              <div>
                <div className="qs-panel-title">📋 Bill of Quantities — Planned (by QS)</div>
                <div style={{ fontSize:12, color:"var(--c-text-3)", marginTop:2 }}>
                  These are the QS estimates. Compare against your actual measurements below.
                </div>
              </div>
              <span className="qs-pill qs-pill--muted">{boqRows.length} items</span>
            </div>
            <div style={{ padding:"0 20px 16px" }}>
              <BoqItemsTable rows={boqRows}/>
              {boqLabour.length > 0 && (
                <>
                  <div className="qs-expand-section-title" style={{ marginTop:16 }}>Labour (Planned)</div>
                  <table className="qs-line-table">
                    <thead><tr><th>#</th><th>Labour Type</th><th>Workers</th><th>Days</th><th>Wages</th></tr></thead>
                    <tbody>
                      {boqLabour.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily:"monospace", color:"var(--c-text-3)", width:32 }}>{i+1}</td>
                          <td style={{ fontWeight:600, color:"var(--c-navy-900)" }}>{r.labourType}</td>
                          <td style={{ fontFamily:"monospace" }}>{r.workers}</td>
                          <td style={{ fontFamily:"monospace" }}>{r.workingDays}</td>
                          <td style={{ fontSize:11, color:"var(--c-text-3)", fontStyle:"italic" }}>🔒 Hidden</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* SECTION 2A — Measurement form (only when no active QR) */}
          {qrLoaded && !qr && (selBoq?.status === "measurement_pending" || selBoq?.status === "rejected_by_se") && (
            <div className="qs-panel" style={{ marginBottom:20 }}>
              <div className="qs-panel-head">
                <div>
                  <div className="qs-panel-title">📐 Enter Actual Site Measurements</div>
                  <div style={{ fontSize:12, color:"var(--c-text-3)", marginTop:2 }}>
                    Measure on site and submit — QS will verify and create a Quantity Report
                  </div>
                </div>
              </div>
              <div style={{ padding:"16px 20px" }}>
                <form onSubmit={submitMeasurement} noValidate>
                  <div className="qs-form-grid" style={{ marginBottom:18 }}>
                    <div className="qs-form-field">
                      <label className="qs-form-label">Date *</label>
                      <input type="date" className="qs-form-input" value={mDate}
                        onChange={e => { setMDate(e.target.value); setMErrors(p=>({...p,date:undefined})); }}/>
                      {mErrors.date && <div className="qs-form-error">{mErrors.date}</div>}
                    </div>
                    <div className="qs-form-field">
                      <label className="qs-form-label">Zone / Location *</label>
                      <input className="qs-form-input" value={mZone}
                        onChange={e => { setMZone(e.target.value); setMErrors(p=>({...p,zone:undefined})); }}
                        placeholder="e.g. Level 3 / Grid A–D"/>
                      {mErrors.zone && <div className="qs-form-error">{mErrors.zone}</div>}
                    </div>
                    <div className="qs-form-field">
                      <label className="qs-form-label">Activity</label>
                      <input className="qs-form-input" value={mAct}
                        onChange={e => setMAct(e.target.value)}
                        placeholder="e.g. Column Casting, Slab Pour…"/>
                    </div>
                    <div className="qs-form-field">
                      <label className="qs-form-label">
                        Link Labour Report
                        {selLR?.date === nowISO() && (
                          <span style={{ marginLeft:6, fontSize:10, fontWeight:700, color:"#085041", background:"#E1F5EE", padding:"1px 6px", borderRadius:99 }}>
                            ✓ Today's auto-selected
                          </span>
                        )}
                      </label>
                      <select
  className="qs-form-select"
  value={linkedLR}
  onChange={e => setLLR(e.target.value)}
>
  <option value="">No labour report</option>

  {labourReports
  .filter((lr) => {
    const sameProject =
      String(lr.project_id || "") ===
      String(selBoq?.projectId || "");

    const sameMilestone =
      !selBoq?.milestoneId ||
      String(lr.milestone_id || "") ===
      String(selBoq.milestoneId || "");

    return sameProject && sameMilestone;
  })
  .map(lr => (
      <option key={lr.id} value={lr.id}>
        {lr.date === nowISO() ? "★ Today — " : ""}
        {lr.date} · {lr.total_headcount || 0} workers
      </option>
    ))}
</select>
                    </div>
                  </div>

                  {selLR && (
                    <div style={{ marginBottom:18, padding:"10px 14px", background:"var(--c-surface-2,#F4F8FB)", border:"1px solid var(--c-border,rgba(10,65,116,.10))", borderLeft:"4px solid #085041", borderRadius:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"var(--c-navy-900)", marginBottom:4 }}>
                        👷 {selLR.total_headcount||0} workers linked — {selLR.date}
                      </div>
                      {safeArr(selLR.trades).slice(0,4).map((t,i) => (
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"3px 0", color:"var(--c-text-2)" }}>
                          <span>{t.trade}</span><strong style={{ fontFamily:"monospace" }}>{t.count}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <div className="qs-expand-section-title" style={{ margin:0 }}>Actual Quantities *</div>
                    <button type="button" className="qs-btn qs-btn--ghost" style={{ padding:"3px 10px", fontSize:11 }} onClick={addItem}>+ Add Row</button>
                  </div>
                  <div className="qs-form-notice" style={{ marginBottom:10 }}>
                    ℹ️ Enter what you measured on site. Descriptions should match BOQ items above. No pricing needed.
                  </div>
                  <div className="qs-items-head">
                    <span>#</span><span>Description</span><span>Unit</span><span>Actual Qty</span><span></span>
                  </div>
                  {mItems.map((item, i) => (
                    <div key={i} className="qs-item-row">
                      <span className="qs-item-row-num">{i+1}</span>
                      <input className="qs-form-input" value={item.description}
                        onChange={e => { setItem(i,"description",e.target.value); setMErrors(p=>({...p,items:undefined})); }}
                        list={`boq-list-${i}`} placeholder="e.g. Concrete C30, TMT Rebar…"/>
                      <datalist id={`boq-list-${i}`}>
                        {boqRows.map((r,j) => <option key={j} value={r.material}/>)}
                      </datalist>
                      <select className="qs-form-select" value={item.unit} onChange={e => setItem(i,"unit",e.target.value)}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <input type="number" min="0" step="0.01"
                        className="qs-form-input qs-form-input--qty"
                        value={item.qty_actual}
                        onChange={e => { setItem(i,"qty_actual",e.target.value); setMErrors(p=>({...p,items:undefined})); }}
                        placeholder="0.00"/>
                      <button type="button" className="qs-item-remove" onClick={() => removeItem(i)} disabled={mItems.length===1}>×</button>
                    </div>
                  ))}
                  {mErrors.items && <div className="qs-form-error" style={{ marginTop:6 }}>{mErrors.items}</div>}

                  <div style={{ marginTop:14, marginBottom:14 }}>
                    <label className="qs-form-label">Notes for QS (optional)</label>
                    <textarea className="qs-verify-box" value={mNotes} onChange={e => setMNotes(e.target.value)}
                      placeholder="Deductions, adjustments, NCR refs, site conditions…" style={{ minHeight:70 }}/>
                  </div>

                  <div className="qs-action-row" style={{ borderTop:"1px solid var(--c-border,rgba(10,65,116,.10))", paddingTop:14 }}>
                    <button type="submit" className="qs-action-btn qs-action-btn--approve" disabled={mSaving}>
                      {mSaving ? "Submitting…" : "📐 Submit Measurements to QS"}
                    </button>
                    <button type="button" className="qs-action-btn"
                      style={{ background:"transparent", border:"1px solid var(--c-border-md,rgba(10,65,116,.18))", color:"var(--c-text-3)" }}
                      onClick={() => { setMItems([blankItem()]); setMNotes(""); setMMsg(""); setMErrors({}); }}>
                      Clear
                    </button>
                    {mMsg && (
                      <span style={{ fontSize:12, fontFamily:"monospace", color:mMsg.startsWith("✓")?"#085041":mMsg.startsWith("Error")?"#DC2626":"var(--c-text-3)" }}>
                        {mMsg}
                      </span>
                    )}
                  </div>
                </form>

                {mMsg.startsWith("✓") && (
                  <div style={{ marginTop:16, padding:"12px 16px", background:"#E6F1FB", border:"1px solid #90C1EF", borderRadius:10, fontSize:13, color:"#185FA5", lineHeight:1.65 }}>
                    <strong>✓ Measurement submitted.</strong><br/>
                    The QS will now create a Quantity Report from your data.
                    This page auto-checks every 15 s — or click <strong>↻ Refresh QR</strong> above.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading QR */}
          {!qrLoaded && (
            <div className="qs-loading" style={{ marginBottom:20 }}>
              <div className="qs-spinner"/>Checking for Quantity Report…
            </div>
          )}

          {/* SECTION 2B — QR comparison + approve/reject */}
          {qr && (
            <div className="qs-panel">
              <div className="qs-panel-head">
                <div>
                  <div className="qs-panel-title">📑 Quantity Report — Review &amp; Approve</div>
                  <div style={{ fontSize:12, color:"var(--c-text-3)", marginTop:2 }}>
                    BOQ (planned) vs Actual (measured on site). Approve to finalise the BOQ.
                  </div>
                  {(qr.zone || qr.activity || qr.submittedBy) && (
                    <div style={{ fontSize:12, color:"var(--c-text-3)", marginTop:6, display:"flex", gap:14, flexWrap:"wrap" }}>
                      {qr.zone           && <span>📍 Zone: <strong>{qr.zone}</strong></span>}
                      {qr.activity       && <span>⚙️ Activity: <strong>{qr.activity}</strong></span>}
                      {qr.submittedBy    && <span>👤 By: <strong>{qr.submittedBy}</strong></span>}
                      {qr.measurementDate && <span>📅 Measured: <strong>{fmtDate(qr.measurementDate)}</strong></span>}
                    </div>
                  )}
                </div>
                <QrStatusBadge status={qr.status}/>
              </div>
              <div style={{ padding:"0 20px 20px" }}>
                <div className="qs-qr-no-price-notice" style={{ marginBottom:16 }}>
                  🔒 <strong>Quantities only</strong> — pricing is hidden. Approving this finalises the BOQ.
                </div>
                {qr.status==="rejected" && qr.seComment && (
                  <div style={{ marginBottom:14, padding:"10px 14px", background:"#FEF3C7", border:"1px solid #FCD34D", borderRadius:10, fontSize:13, color:"#92400E" }}>
                    <strong>Your feedback to QS:</strong> {qr.seComment}
                  </div>
                )}
                <div className="qs-expand-section-title">BOQ (Planned) vs Actual (Measured)</div>
                <table className="qs-line-table" style={{ marginTop:8, marginBottom:20 }}>
                  <thead>
                    <tr>
                      <th>#</th><th>Material / Item</th><th>Unit</th>
                      <th style={{ color:"#185FA5" }}>BOQ Qty ←</th>
                      <th style={{ color:"#085041" }}>Actual Qty →</th>
                      <th>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(qrItems.length ? qrItems : boqRows.map(b=>({material:b.material,unit:b.unit,quantity:0}))).map((it,i) => {
                      const boqRow = boqRows.find(b => (b.material||"").toLowerCase().trim()===(it.material||"").toLowerCase().trim());
                      const boqQty = toNum(it.boqQuantity ?? boqRow?.quantity);
                      const actual = toNum(it.quantity);
                      const hasBoq = it.boqQuantity!=null || boqRow;
                      return (
                        <tr key={i}>
                          <td style={{ fontFamily:"monospace", color:"var(--c-text-3)", width:32 }}>{i+1}</td>
                          <td style={{ fontWeight:600, color:"var(--c-navy-900)" }}>{it.material}</td>
                          <td style={{ fontFamily:"monospace", color:"var(--c-text-3)" }}>{it.unit}</td>
                          <td style={{ fontFamily:"monospace", fontWeight:600, color:"#185FA5" }}>{hasBoq ? boqQty.toLocaleString("en-IN") : "—"}</td>
                          <td style={{ fontFamily:"monospace", fontWeight:700, color:"#085041" }}>{actual.toLocaleString("en-IN")}</td>
                          <td><VarBadge actual={actual} boq={hasBoq ? boqQty : null}/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:20 }}>
                  {[
                    { label:"Material Items", val:qrItems.length,                    icon:"📦" },
                    { label:"Pricing",        val:"🔒 Hidden",                        icon:"💰" },
                    { label:"Source",         val:qr.generatedFrom||"Measurement",   icon:"📐" },
                    { label:"Status",         val:qrSt?.label||qr.status,            icon:qrSt?.icon||"📑" },
                  ].map(({ label, val, icon }) => (
                    <div key={label} style={{ padding:"10px 14px", textAlign:"center", background:"var(--c-surface-2,#F4F8FB)", border:"1px solid var(--c-border,rgba(10,65,116,.10))", borderRadius:10 }}>
                      <div style={{ fontSize:18, marginBottom:3 }}>{icon}</div>
                      <div style={{ fontSize:13, fontWeight:800, color:"var(--c-navy-900)", fontFamily:"monospace" }}>{val}</div>
                      <div style={{ fontSize:10, color:"var(--c-text-3)", marginTop:2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {qr.status==="pending_se" && !showReject && (
                  <div className="qs-action-row" style={{ borderTop:"1px solid var(--c-border,rgba(10,65,116,.10))", paddingTop:16 }}>
                    <button className="qs-action-btn qs-action-btn--approve" disabled={qrActing} onClick={approveQr}>
                      {qrActing ? "Processing…" : "✅ Approve Quantity Report"}
                    </button>
                    <button className="qs-action-btn qs-action-btn--reject" disabled={qrActing} onClick={() => setShowRej(true)}>
                      ↩️ Request Changes
                    </button>
                    <span style={{ fontSize:11, color:"var(--c-text-3)", lineHeight:1.5, maxWidth:220 }}>
                      Approving locks the BOQ and allows QS to generate the Final Bill.
                    </span>
                  </div>
                )}

                {qr.status==="pending_se" && showReject && (
                  <div style={{ marginTop:8, padding:16, background:"#FFF7ED", border:"1px solid #FCD34D", borderRadius:12 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#92400E", marginBottom:8 }}>
                      ↩️ What needs to be revised? (required)
                    </div>
                    <textarea className="qs-verify-box"
                      placeholder="e.g. Concrete quantities are higher than poured — re-check Level 3 measurements…"
                      value={rejectComment} onChange={e => setRejCmt(e.target.value)}
                      rows={3} autoFocus style={{ marginBottom:12 }}/>
                    <div style={{ display:"flex", gap:10 }}>
                      <button className="qs-action-btn qs-action-btn--reject" disabled={qrActing} onClick={rejectQr}>
                        {qrActing ? "Sending…" : "✕ Send to QS for Revision"}
                      </button>
                      <button className="qs-action-btn"
                        style={{ background:"transparent", border:"1px solid var(--c-border-md,rgba(10,65,116,.18))", color:"var(--c-text-3)" }}
                        onClick={() => { setShowRej(false); setRejCmt(""); }}>
                        Cancel
                      </button>
                    </div>
                    {qrMsg && qrMsg.startsWith("❌") && (
                      <div style={{ marginTop:8, fontSize:12, color:"#DC2626" }}>{qrMsg}</div>
                    )}
                  </div>
                )}

                {qr.status==="approved" && (
                  <div style={{ padding:"14px 18px", background:"#E1F5EE", border:"1px solid #5DCAA5", borderRadius:10, display:"flex", alignItems:"center", gap:12, fontSize:13, color:"#085041", fontWeight:600 }}>
                    <span style={{ fontSize:24 }}>✅</span>
                    <div>You approved this Quantity Report — the BOQ is now <strong>finalised</strong>. The QS can now generate the Final Bill.</div>
                  </div>
                )}

                {qr.status==="rejected" && (
                  <div style={{ padding:"14px 18px", background:"#FEF3C7", border:"1px solid #FCD34D", borderRadius:10, fontSize:13, color:"#92400E", fontWeight:600 }}>
                    ↩️ You requested changes. QS will revise the quantities and resubmit.
                    Click <strong>↻ Refresh QR</strong> above to check for updates.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="qs-aside">
          <div className="qs-aside-card">
            <div className="qs-aside-title">BOQ Info</div>
            {[
              ["Project",      selBoq?.projectName   || "—"],
              ["Milestone",    selBoq?.milestoneName || "—"],
              ["BOQ #",        `#${selBoq?.id}`],
              ["Created",      selBoq?.date          || "—"],
              ["Status",       BOQ_STATUS[selBoq?.status]?.label || selBoq?.status || "—"],
              ["Materials",    `${boqRows.length} items`],
              ["Labour",       boqLabour.length > 0 ? `${boqLabour.length} types` : "None"],
              ["Measurements", selBoq?.measurementCount > 0 ? `${selBoq.measurementCount} submitted` : "None yet"],
            ].map(([l, v]) => (
              <div key={l} className="qs-aside-row">
                <span style={{ fontSize:12 }}>{l}</span>
                <strong style={{ fontSize:12, textAlign:"right", maxWidth:140 }}>{v}</strong>
              </div>
            ))}
          </div>

          {qr && (
            <div className="qs-aside-card">
              <div className="qs-aside-title">Quantity Report</div>
              {[
                ["QR #",     `#${qr.id}`],
                ["Status",   `${qrSt?.icon||""} ${qrSt?.label||qr.status}`],
                ["Items",    `${qrItems.length} materials`],
                ["Zone",     qr.zone     || "—"],
                ["Activity", qr.activity || "—"],
                ["Created",  fmtDate(qr.createdDate || qr.created_at)],
              ].map(([l, v]) => (
                <div key={l} className="qs-aside-row">
                  <span style={{ fontSize:12 }}>{l}</span>
                  <strong style={{ fontSize:12, textAlign:"right", maxWidth:140 }}>{v}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="qs-aside-card">
            <div className="qs-aside-title">
              {!qr ? "What to do" : qr.status==="pending_se" ? "Review Checklist" : "What happens next"}
            </div>
            {!qr && (
              <ul className="qs-tips">
                <li>Check the BOQ table — QS estimates.</li>
                <li>Go to site and measure actual quantities.</li>
                <li>Enter actual quantities in the form below.</li>
                <li>Submit — QS will verify and create a QR.</li>
                <li>Come back here to approve the QR.</li>
                <li>Page auto-checks every 15 s for new QR.</li>
              </ul>
            )}
            {qr?.status==="pending_se" && (
              <ul className="qs-tips">
                <li>Compare BOQ qty vs Actual qty.</li>
                <li>🟢 Green = within 5% — safe to approve.</li>
                <li>🟡 Amber = 6–15% variance — check first.</li>
                <li>🔴 Red = &gt;15% — investigate before approving.</li>
                <li>If wrong, reject with a specific comment.</li>
                <li>Approving is final — BOQ will be locked.</li>
              </ul>
            )}
            {qr?.status==="approved" && (
              <ul className="qs-tips">
                <li>BOQ is locked ✅</li>
                <li>QS can now generate the Final Bill.</li>
              </ul>
            )}
            {qr?.status==="rejected" && (
              <ul className="qs-tips">
                <li>QS will revise and resubmit the QR.</li>
                <li>Click ↻ Refresh QR to check for updates.</li>
                <li>You will need to review again after revision.</li>
              </ul>
            )}
          </div>

          {!qr && todayLR && (
            <div className="qs-aside-card">
              <div className="qs-aside-title">Today's Labour on Site</div>
              <div style={{ padding:"10px 16px" }}>
                <div style={{ fontSize:26, fontWeight:900, fontFamily:"monospace", color:"var(--c-navy-900)" }}>
                  {todayLR.total_headcount||0}
                </div>
                <div style={{ fontSize:11, color:"var(--c-text-3)", marginBottom:8 }}>workers on site today</div>
                {safeArr(todayLR.trades).slice(0,4).map((t,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"3px 0", color:"var(--c-text-2)", borderBottom:"1px solid var(--c-border,rgba(10,65,116,.06))" }}>
                    <span>{t.trade}</span>
                    <strong style={{ fontFamily:"monospace" }}>{t.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}