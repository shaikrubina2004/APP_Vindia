import React, { useState, useEffect, useCallback } from "react";

/* ── All styles embedded — no external CSS file needed ────── */
const STYLES = `
.pmcr{font-family:'DM Sans',sans-serif;padding:28px 32px;background:#f8f9fc;min-height:100vh;color:#111827;position:relative;}
.pmcr__toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);padding:11px 24px;border-radius:8px;font-size:13px;font-weight:500;z-index:999;white-space:nowrap;pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,.15);animation:pmcr-tin .22s ease;}
@keyframes pmcr-tin{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.pmcr__toast--success{background:#0f172a;color:#fff;}
.pmcr__toast--error{background:#dc2626;color:#fff;}
.pmcr__header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap;}
.pmcr__back{background:none;border:1px solid #e5e7eb;border-radius:8px;padding:7px 14px;font-size:13px;color:#374151;cursor:pointer;font-family:inherit;white-space:nowrap;transition:background .12s;}
.pmcr__back:hover{background:#f1f5f9;}
.pmcr__title{font-size:22px;font-weight:600;color:#0f172a;margin:0;letter-spacing:-.4px;}
.pmcr__subtitle{font-size:13px;color:#6b7280;margin:3px 0 0;}
.pmcr__header-info{flex:1;}
.pmcr__pending-pill{background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:7px 16px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap;}
.pmcr__status-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;}
.pmcr__status--amber{background:#fef3c7;color:#92400e;border:1px solid #fde68a;}
.pmcr__status--green{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;}
.pmcr__status--red{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;}
.pmcr__flow{display:flex;align-items:center;flex-wrap:wrap;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 18px;margin-bottom:20px;font-size:12px;}
.pmcr__flow-step{display:flex;align-items:center;gap:7px;color:#6b7280;}
.pmcr__flow-step--active{color:#0a4174;font-weight:600;}
.pmcr__flow-dot{width:22px;height:22px;border-radius:50%;background:#e5e7eb;color:#374151;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}
.pmcr__flow-step--active .pmcr__flow-dot{background:#0a4174;color:#fff;}
.pmcr__flow-arrow{color:#d1d5db;font-size:18px;line-height:1;}
.pmcr__filters{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}
.pmcr__filter-tabs{display:flex;gap:4px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:4px;}
.pmcr__ftab{padding:6px 14px;border-radius:6px;border:none;background:transparent;color:#6b7280;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px;}
.pmcr__ftab:hover{color:#0f172a;}
.pmcr__ftab--on{background:#0a4174;color:#fff;}
.pmcr__ftab-count{border-radius:10px;padding:1px 6px;font-size:11px;min-width:18px;text-align:center;background:#f3f4f6;color:#374151;}
.pmcr__ftab--on .pmcr__ftab-count{background:rgba(255,255,255,.3);color:#fff;}
.pmcr__select{padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;color:#374151;background:#fff;outline:none;cursor:pointer;}
.pmcr__select:focus{border-color:#0a4174;}
.pmcr__loading{display:flex;align-items:center;justify-content:center;gap:12px;height:200px;color:#6b7280;font-size:14px;}
.pmcr__spinner{width:24px;height:24px;border-radius:50%;border:3px solid #e5e7eb;border-top-color:#0a4174;animation:pmcr-spin .7s linear infinite;}
@keyframes pmcr-spin{to{transform:rotate(360deg)}}
.pmcr__empty{text-align:center;padding:60px 20px;color:#9ca3af;}
.pmcr__empty div:first-child{font-size:40px;margin-bottom:12px;}
.pmcr__empty p{margin:4px 0;font-size:14px;}
.pmcr__empty-hint{font-size:12px;color:#d1d5db;}
.pmcr__list{display:flex;flex-direction:column;gap:12px;}
.pmcr__card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;border-left:4px solid transparent;transition:box-shadow .15s;}
.pmcr__card:hover{box-shadow:0 4px 16px rgba(0,0,0,.06);}
.pmcr__card--amber{border-left-color:#f59e0b;}
.pmcr__card--green{border-left-color:#22c55e;}
.pmcr__card--red{border-left-color:#ef4444;}
.pmcr__card-top{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 20px 12px;gap:16px;flex-wrap:wrap;}
.pmcr__card-project{font-size:15px;font-weight:600;color:#0f172a;margin-bottom:4px;}
.pmcr__card-meta{font-size:12px;color:#6b7280;}
.pmcr__card-comment{margin-top:8px;font-size:12px;color:#b91c1c;background:#fef2f2;border-radius:6px;padding:8px 12px;border-left:3px solid #ef4444;}
.pmcr__card-comment span{font-weight:600;}
.pmcr__card-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.pmcr__card-total{font-size:18px;font-weight:700;color:#0f172a;font-family:'DM Mono',monospace;}
.pmcr__cost-split{display:flex;gap:6px;}
.pmcr__cost-pill{font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;}
.pmcr__cost-pill--mat{background:#ccfbf1;color:#0b6e72;}
.pmcr__cost-pill--lab{background:#dbeafe;color:#1d4ed8;}
.pmcr__card-actions{display:flex;gap:8px;padding:10px 20px 14px;border-top:1px solid #f9fafb;flex-wrap:wrap;}
.pmcr__view-btn{padding:7px 16px;border-radius:7px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:background .12s;}
.pmcr__view-btn:hover{background:#f1f5f9;}
.pmcr__approve-btn{padding:7px 18px;border-radius:7px;border:none;background:#16a34a;color:#fff;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .12s;}
.pmcr__approve-btn:hover{background:#15803d;}
.pmcr__approve-btn:disabled{opacity:.6;cursor:not-allowed;}
.pmcr__reject-btn{padding:7px 18px;border-radius:7px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .12s;}
.pmcr__reject-btn:hover{background:#b91c1c;}
.pmcr__reject-btn:disabled{opacity:.6;cursor:not-allowed;}
.pmcr__rejection-sent{display:flex;align-items:flex-start;gap:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:18px;}
.pmcr__rej-icon{font-size:22px;flex-shrink:0;}
.pmcr__rej-title{font-weight:600;color:#b91c1c;font-size:13px;margin-bottom:4px;}
.pmcr__rej-msg{font-size:13px;color:#7f1d1d;font-style:italic;}
.pmcr__approved-banner{display:flex;align-items:center;gap:12px;background:#dcfce7;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:18px;font-size:13px;color:#15803d;}
.pmcr__summary-strip{display:flex;gap:0;margin-bottom:20px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;flex-wrap:wrap;}
.pmcr__sum-item{flex:1;min-width:110px;padding:14px 18px;border-right:1px solid #f3f4f6;display:flex;flex-direction:column;gap:4px;}
.pmcr__sum-item:last-child{border-right:none;}
.pmcr__sum-item span{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;font-weight:600;}
.pmcr__sum-item strong{font-size:15px;font-weight:600;color:#0f172a;font-family:'DM Mono',monospace;}
.pmcr__sum-item--grand{background:#f0fdf4;}
.pmcr__sum-item--grand strong{color:#15803d;font-size:17px;}
.pmcr__action-bar{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;}
.pmcr__action-bar-label{font-size:13px;color:#92400e;font-weight:500;}
.pmcr__action-btns{display:flex;gap:10px;}
.pmcr__block{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:14px;}
.pmcr__block-label{font-size:13px;font-weight:600;color:#374151;margin-bottom:14px;}
.pmcr__table-wrap{overflow-x:auto;}
.pmcr__table{width:100%;border-collapse:collapse;font-size:13px;}
.pmcr__table th{background:#f8f9fc;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:9px 12px;text-align:left;border-bottom:1px solid #e5e7eb;}
.pmcr__table td{padding:10px 12px;border-bottom:1px solid #f9fafb;color:#374151;}
.pmcr__table tbody tr:last-child td{border-bottom:none;}
.pmcr__table tbody tr:hover{background:#fafbff;}
.pmcr__table tfoot td{background:#f0fdf4;font-weight:600;padding:10px 12px;}
.pmcr-num{color:#9ca3af;font-size:12px;text-align:center;}
.pmcr-total{font-weight:600;color:#0f172a;font-family:'DM Mono',monospace;}
.pmcr-foot-lbl{color:#15803d;text-align:right;}
.pmcr-foot-val{color:#15803d;font-family:'DM Mono',monospace;font-size:14px;}
.pmcr__grand-total{display:flex;justify-content:space-between;align-items:center;background:#0a4174;color:#fff;border-radius:10px;padding:18px 24px;margin-bottom:20px;font-weight:600;font-size:15px;}
.pmcr__grand-val{font-family:'DM Mono',monospace;font-size:22px;}
.pmcr__overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);backdrop-filter:blur(3px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
.pmcr__modal{background:#fff;border-radius:14px;border:1px solid #e5e7eb;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.15);animation:pmcr-min .18s ease;}
@keyframes pmcr-min{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.pmcr__modal-head{display:flex;justify-content:space-between;align-items:flex-start;padding:20px 20px 14px;border-bottom:1px solid #f3f4f6;}
.pmcr__modal-title{font-size:16px;font-weight:600;color:#0f172a;}
.pmcr__modal-sub{font-size:13px;color:#6b7280;margin-top:3px;}
.pmcr__modal-close{background:none;border:none;font-size:16px;cursor:pointer;color:#9ca3af;padding:2px 6px;border-radius:4px;}
.pmcr__modal-close:hover{background:#f3f4f6;color:#374151;}
.pmcr__modal-body{padding:18px 20px;}
.pmcr__modal-label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;}
.pmcr__modal-textarea{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;color:#0f172a;resize:vertical;outline:none;box-sizing:border-box;transition:border-color .15s,box-shadow .15s;}
.pmcr__modal-textarea:focus{border-color:#0a4174;box-shadow:0 0 0 3px rgba(10,65,116,.08);}
.pmcr__modal-hint{font-size:12px;color:#9ca3af;margin-top:8px;}
.pmcr__modal-foot{display:flex;gap:8px;padding:14px 20px;border-top:1px solid #f3f4f6;background:#fafafa;border-radius:0 0 14px 14px;}
.pmcr__modal-cancel{flex:1;padding:9px;border-radius:7px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;}
.pmcr__modal-cancel:hover{background:#f9fafb;}
.pmcr__modal-submit{flex:2;padding:9px;border-radius:7px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .12s;}
.pmcr__modal-submit:hover{background:#b91c1c;}
.pmcr__modal-submit:disabled{opacity:.5;cursor:not-allowed;}
@media(max-width:680px){
  .pmcr{padding:16px;}
  .pmcr__flow{display:none;}
  .pmcr__card-top{flex-direction:column;}
  .pmcr__card-right{align-items:flex-start;}
  .pmcr__action-bar{flex-direction:column;align-items:flex-start;}
  .pmcr__summary-strip{flex-direction:column;}
}
/* ── Calendar View ── */
.pmcr__view-toggle{display:flex;gap:4px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:4px;margin-left:auto;}
.pmcr__vtab{padding:6px 14px;border-radius:6px;border:none;background:transparent;color:#6b7280;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px;}
.pmcr__vtab:hover{color:#0f172a;}
.pmcr__vtab--on{background:#0a4174;color:#fff;}
.pmcr__cal{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;}
.pmcr__cal-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #f3f4f6;background:#f8f9fc;}
.pmcr__cal-title{font-size:15px;font-weight:600;color:#0f172a;}
.pmcr__cal-btn{background:none;border:1px solid #e5e7eb;border-radius:6px;padding:5px 10px;font-size:14px;cursor:pointer;color:#374151;transition:background .12s;}
.pmcr__cal-btn:hover{background:#f1f5f9;}
.pmcr__cal-grid{display:grid;grid-template-columns:repeat(7,1fr);}
.pmcr__cal-head{background:#f8f9fc;padding:8px 4px;text-align:center;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;border-right:1px solid #f3f4f6;border-bottom:1px solid #e5e7eb;}
.pmcr__cal-head:last-child{border-right:none;}
.pmcr__cal-cell{min-height:90px;padding:6px;border-right:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;vertical-align:top;position:relative;}
.pmcr__cal-cell:last-child{border-right:none;}
.pmcr__cal-cell--other{background:#fafafa;}
.pmcr__cal-cell--today{background:#eff6ff;}
.pmcr__cal-day{font-size:12px;font-weight:600;color:#6b7280;margin-bottom:4px;}
.pmcr__cal-cell--today .pmcr__cal-day{color:#0a4174;background:#dbeafe;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;}
.pmcr__cal-chip{font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;margin-bottom:2px;cursor:pointer;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .1s;}
.pmcr__cal-chip:hover{opacity:.8;}
.pmcr__cal-chip--amber{background:#fef3c7;color:#92400e;border-left:3px solid #f59e0b;}
.pmcr__cal-chip--green{background:#dcfce7;color:#15803d;border-left:3px solid #22c55e;}
.pmcr__cal-chip--red{background:#fef2f2;color:#b91c1c;border-left:3px solid #ef4444;}
.pmcr__cal-legend{display:flex;gap:16px;padding:12px 20px;border-top:1px solid #f3f4f6;flex-wrap:wrap;}
.pmcr__cal-leg{display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280;}
.pmcr__cal-leg-dot{width:10px;height:10px;border-radius:2px;}
`;

const CR_API  = "/api/cost-report";
const BOQ_API = "/api/boq";

const STATUS = {
  pending_pm: { label: "Awaiting Review",  color: "amber", icon: "⏳" },
  approved:   { label: "Approved",          color: "green", icon: "✅" },
  rejected:   { label: "Changes Requested", color: "red",   icon: "↩️" },
};

const fmt = (n) =>
  "₹ " + (parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const safeArr = (val) => {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
};

// ── Weekly Calendar View Component ───────────────────────────────────────────
function CalendarView({ reports, weekStart, onPrev, onNext, onToday, onOpen, onApprove, onReject, submitting }) {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date(); today.setHours(0,0,0,0);

  // Build 7-day cells
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  // Parse createdDate (e.g. "14 May 2026") -> Date
  const parseDate = (str) => {
    if (!str) return null;
    const d = new Date(str);
    if (!isNaN(d)) return d;
    // Try "DD Mon YYYY"
    const parts = str.split(" ");
    if (parts.length === 3) {
      const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
      return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
    }
    return null;
  };

  // Map day-date-string -> reports
  const reportsByDay = {};
  (reports || []).forEach(r => {
    const d = parseDate(r.createdDate);
    if (!d) return;
    d.setHours(0,0,0,0);
    const key = d.toISOString().slice(0,10);
    if (!reportsByDay[key]) reportsByDay[key] = [];
    reportsByDay[key].push(r);
  });

  const fmtWeek = () => {
    const end = new Date(weekStart); end.setDate(end.getDate() + 6);
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (weekStart.getMonth() === end.getMonth())
      return `${weekStart.getDate()}–${end.getDate()} ${mo[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    return `${weekStart.getDate()} ${mo[weekStart.getMonth()]} – ${end.getDate()} ${mo[end.getMonth()]} ${end.getFullYear()}`;
  };

  return (
    <div className="pmcr__cal">
      <div className="pmcr__cal-nav">
        <button className="pmcr__cal-btn" onClick={onPrev}>‹ Prev</button>
        <div>
          <span className="pmcr__cal-title">Week of {fmtWeek()}</span>
          <button className="pmcr__cal-btn" style={{marginLeft:10,fontSize:12}} onClick={onToday}>Today</button>
        </div>
        <button className="pmcr__cal-btn" onClick={onNext}>Next ›</button>
      </div>
      <div className="pmcr__cal-grid">
        {DAY_NAMES.map(d => <div key={d} className="pmcr__cal-head">{d}</div>)}
        {days.map(day => {
          const key     = day.toISOString().slice(0,10);
          const isToday = day.getTime() === today.getTime();
          const dayReps = reportsByDay[key] || [];
          return (
            <div key={key} className={`pmcr__cal-cell${isToday ? " pmcr__cal-cell--today" : ""}`}>
              <div className="pmcr__cal-day">{day.getDate()}</div>
              {dayReps.map(r => {
                const st = STATUS[r.status] || STATUS.pending_pm;
                return (
                  <span
                    key={r.id}
                    className={`pmcr__cal-chip pmcr__cal-chip--${st.color}`}
                    title={`${r.projectName} — ${r.milestoneName} — ${fmt(r.totalCost)}`}
                    onClick={() => onOpen(r)}
                  >
                    {st.icon} {r.projectName}
                  </span>
                );
              })}
              {dayReps.filter(r => r.status === "pending_pm").map(r => (
                <div key={r.id + "_actions"} style={{display:"flex",gap:3,marginTop:2}}>
                  <button
                    style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"none",background:"#16a34a",color:"#fff",cursor:"pointer",fontWeight:600}}
                    disabled={submitting}
                    onClick={e => { e.stopPropagation(); onApprove(r.id); }}
                  >✔</button>
                  <button
                    style={{fontSize:9,padding:"1px 5px",borderRadius:3,border:"none",background:"#dc2626",color:"#fff",cursor:"pointer",fontWeight:600}}
                    disabled={submitting}
                    onClick={e => { e.stopPropagation(); onReject(r.id); }}
                  >✘</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="pmcr__cal-legend">
        <span className="pmcr__cal-leg"><span className="pmcr__cal-leg-dot" style={{background:"#fde68a"}}/>⏳ Pending</span>
        <span className="pmcr__cal-leg"><span className="pmcr__cal-leg-dot" style={{background:"#86efac"}}/>✅ Approved</span>
        <span className="pmcr__cal-leg"><span className="pmcr__cal-leg-dot" style={{background:"#fca5a5"}}/>↩️ Rejected</span>
        <span className="pmcr__cal-leg" style={{marginLeft:"auto",color:"#9ca3af",fontSize:11}}>Click a report to view details · ✔/✘ to approve/reject pending</span>
      </div>
    </div>
  );
}


export default function PMCostReports() {
  const [reports,       setReports]       = useState([]);
  const [projects,      setProjects]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState(null);
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("pending_pm");
  const [viewingReport, setViewingReport] = useState(null);
  const [rejectModal,   setRejectModal]   = useState(null);
  const [rejectComment, setRejectComment] = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [viewMode,      setViewMode]      = useState("list");
  const [calWeekStart,  setCalWeekStart]  = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`${BOQ_API}/projects`)
      .then(r => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.append("projectId", filterProject);
      if (filterStatus)  params.append("status",    filterStatus);
      const res  = await fetch(`${CR_API}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReports(data);
    } catch (err) {
      notify("Could not load reports: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterStatus]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // allReports: all reports regardless of filter (for calendar)
  const [allReports, setAllReports] = useState([]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterProject) params.append("projectId", filterProject);
    fetch(`${CR_API}?${params}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setAllReports(data) : setAllReports([]))
      .catch(() => setAllReports([]));
  }, [filterProject]);

  const openDetail = async (report) => {
    setViewingReport(report);
    try {
      const res  = await fetch(`${CR_API}/${report.id}`);
      const data = await res.json();
      if (res.ok) setViewingReport(data);
    } catch (_) {}
  };

  const handleApprove = async (id) => {
    setSubmitting(true);
    try {
      const res  = await fetch(`${CR_API}/approve/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      notify("✅ Cost Report approved — BOQ moved to SE stage");
      fetchReports();
      if (viewingReport?.id === id) {
        const r = await fetch(`${CR_API}/${id}`);
        setViewingReport(await r.json());
      }
    } catch (err) { notify(err.message, "error"); }
    finally { setSubmitting(false); }
  };

  const openReject = (id) => { setRejectComment(""); setRejectModal({ id }); };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectComment.trim()) { notify("Please enter a message for the QS", "error"); return; }
    const id = rejectModal.id;
    setSubmitting(true);
    try {
      const res  = await fetch(`${CR_API}/reject/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: rejectComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      notify("↩️ Report rejected — message sent to Quantity Surveyor");
      setRejectModal(null);
      setRejectComment("");
      fetchReports();
      if (viewingReport?.id === id) {
        const r = await fetch(`${CR_API}/${id}`);
        setViewingReport(await r.json());
      }
    } catch (err) { notify(err.message, "error"); }
    finally { setSubmitting(false); }
  };

  const pendingCount = reports.filter(r => r.status === "pending_pm").length;

  /* ── Reject modal (shared between list & detail view) ── */
  const RejectModal = () => !rejectModal ? null : (
    <div className="pmcr__overlay" onClick={e => e.target === e.currentTarget && setRejectModal(null)}>
      <div className="pmcr__modal">
        <div className="pmcr__modal-head">
          <div>
            <div className="pmcr__modal-title">↩️ Reject &amp; Send Message</div>
            <div className="pmcr__modal-sub">Your message will be sent to the Quantity Surveyor</div>
          </div>
          <button className="pmcr__modal-close" onClick={() => setRejectModal(null)}>✕</button>
        </div>
        <div className="pmcr__modal-body">
          <label className="pmcr__modal-label">Message to Quantity Surveyor *</label>
          <textarea
            className="pmcr__modal-textarea"
            placeholder="e.g. Please review the unit price for steel — seems higher than market rate. Also recheck concrete quantities for Phase 2."
            value={rejectComment}
            onChange={e => setRejectComment(e.target.value)}
            rows={5}
            autoFocus
          />
          <div className="pmcr__modal-hint">💡 Be specific so the QS knows exactly what to correct.</div>
        </div>
        <div className="pmcr__modal-foot">
          <button className="pmcr__modal-cancel" onClick={() => setRejectModal(null)} disabled={submitting}>Cancel</button>
          <button className="pmcr__modal-submit" onClick={handleReject} disabled={submitting || !rejectComment.trim()}>
            {submitting ? "Sending…" : "✘ Send Rejection & Message"}
          </button>
        </div>
      </div>
    </div>
  );

  /* ─────────────── DETAIL VIEW ─────────────── */
  if (viewingReport) {
    const r           = viewingReport;
    const st          = STATUS[r.status] || STATUS.pending_pm;
    const items       = safeArr(r.items);
    const labourItems = safeArr(r.labourItems);
    const matTotal    = items.reduce((s, i)       => s + parseFloat(i.total || 0), 0);
    const labTotal    = labourItems.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    const grandTotal  = matTotal + labTotal;

    return (
      <div className="pmcr">
        <style>{STYLES}</style>
        {toast && <div className={`pmcr__toast pmcr__toast--${toast.type}`}>{toast.msg}</div>}

        <div className="pmcr__header">
          <button className="pmcr__back" onClick={() => setViewingReport(null)}>← Back to Reports</button>
          <div className="pmcr__header-info">
            <h1 className="pmcr__title">{r.projectName}</h1>
            <p className="pmcr__subtitle">🏗️ {r.milestoneName} &nbsp;·&nbsp; BOQ #{r.boqId} &nbsp;·&nbsp; {r.createdDate}</p>
          </div>
          <span className={`pmcr__status-badge pmcr__status--${st.color}`}>{st.icon} {st.label}</span>
        </div>

        {r.status === "rejected" && r.pmComment && (
          <div className="pmcr__rejection-sent">
            <span className="pmcr__rej-icon">💬</span>
            <div>
              <div className="pmcr__rej-title">Message sent to Quantity Surveyor</div>
              <div className="pmcr__rej-msg">"{r.pmComment}"</div>
            </div>
          </div>
        )}
        {r.status === "approved" && (
          <div className="pmcr__approved-banner"><span>✅</span><div><strong>Approved</strong> — BOQ has moved to Site Engineer stage.</div></div>
        )}

        <div className="pmcr__summary-strip">
          <div className="pmcr__sum-item"><span>Material Total</span><strong style={{color:"#0b6e72"}}>{fmt(matTotal)}</strong></div>
          {labourItems.length > 0 && <div className="pmcr__sum-item"><span>Labour Total</span><strong style={{color:"#1d4ed8"}}>{fmt(labTotal)}</strong></div>}
          <div className="pmcr__sum-item pmcr__sum-item--grand"><span>Grand Total</span><strong>{fmt(grandTotal)}</strong></div>
          <div className="pmcr__sum-item"><span>Items</span><strong>{items.length}</strong></div>
          {labourItems.length > 0 && <div className="pmcr__sum-item"><span>Labour Types</span><strong>{labourItems.length}</strong></div>}
        </div>

        {r.status === "pending_pm" && (
          <div className="pmcr__action-bar">
            <div className="pmcr__action-bar-label">📋 Review this cost report from the Quantity Surveyor and approve or reject:</div>
            <div className="pmcr__action-btns">
              <button className="pmcr__approve-btn" onClick={() => handleApprove(r.id)} disabled={submitting}>✔ Approve Report</button>
              <button className="pmcr__reject-btn"  onClick={() => openReject(r.id)}    disabled={submitting}>✘ Reject &amp; Send Message</button>
            </div>
          </div>
        )}

        <div className="pmcr__block">
          <div className="pmcr__block-label">📋 Material Cost Breakdown</div>
          <div className="pmcr__table-wrap">
            <table className="pmcr__table">
              <thead><tr><th>#</th><th>Material / Item</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Total Cost</th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="pmcr-num">{i + 1}</td>
                    <td><strong>{item.material}</strong></td>
                    <td>{item.unit}</td>
                    <td>{parseFloat(item.quantity || 0).toLocaleString("en-IN")}</td>
                    <td>₹ {parseFloat(item.unitPrice || 0).toLocaleString("en-IN")}</td>
                    <td className="pmcr-total">{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5} className="pmcr-foot-lbl">Material Total</td><td className="pmcr-foot-val">{fmt(matTotal)}</td></tr></tfoot>
            </table>
          </div>
        </div>

        {labourItems.length > 0 && (
          <div className="pmcr__block">
            <div className="pmcr__block-label">👷 Labour Cost Breakdown</div>
            <div className="pmcr__table-wrap">
              <table className="pmcr__table">
                <thead><tr><th>#</th><th>Labour Type</th><th>Workers</th><th>Days</th><th>Daily Wage</th><th>Total Wage</th></tr></thead>
                <tbody>
                  {labourItems.map((item, i) => (
                    <tr key={i}>
                      <td className="pmcr-num">{i + 1}</td>
                      <td><strong>{item.labourType}</strong></td>
                      <td>{parseInt(item.workers || 0)}</td>
                      <td>{parseInt(item.workingDays || 0)}</td>
                      <td>₹ {parseFloat(item.dailyWage || 0).toLocaleString("en-IN")}</td>
                      <td className="pmcr-total">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={5} className="pmcr-foot-lbl">Labour Total</td><td className="pmcr-foot-val">{fmt(labTotal)}</td></tr></tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="pmcr__grand-total">
          <span>Grand Total</span>
          <span className="pmcr__grand-val">{fmt(grandTotal)}</span>
        </div>

        <RejectModal />
      </div>
    );
  }

  /* ─────────────── LIST VIEW ─────────────── */
  const allCount      = reports.length;
  const approvedCount = reports.filter(r => r.status === "approved").length;
  const rejectedCount = reports.filter(r => r.status === "rejected").length;

  return (
    <div className="pmcr">
      <style>{STYLES}</style>
      {toast && <div className={`pmcr__toast pmcr__toast--${toast.type}`}>{toast.msg}</div>}

      <div className="pmcr__header">
        <div>
          <h1 className="pmcr__title">Cost Reports</h1>
          <p className="pmcr__subtitle">Review and approve cost reports submitted by the Quantity Surveyor</p>
        </div>
        {pendingCount > 0 && <div className="pmcr__pending-pill">⏳ {pendingCount} pending review</div>}
      </div>

      {/* Workflow steps */}
      <div className="pmcr__flow">
        {["QS Creates BOQ", "Cost Report Sent to PM", "PM Reviews Here", "Approve / Reject + Message", "BOQ Moves to SE Stage"].map((s, i, arr) => (
          <React.Fragment key={i}>
            <div className={`pmcr__flow-step ${i === 2 ? "pmcr__flow-step--active" : ""}`}>
              <span className="pmcr__flow-dot">{i + 1}</span>
              <span>{s}</span>
            </div>
            {i < arr.length - 1 && <span className="pmcr__flow-arrow">›</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Filters */}
      <div className="pmcr__filters">
        <div className="pmcr__filter-tabs">
          {[
            { val: "pending_pm", label: "⏳ Pending",  count: pendingCount    },
            { val: "approved",   label: "✅ Approved",  count: approvedCount  },
            { val: "rejected",   label: "↩️ Rejected",  count: rejectedCount  },
            { val: "",           label: "All",          count: allCount       },
          ].map(f => (
            <button
              key={f.val}
              className={`pmcr__ftab ${filterStatus === f.val ? "pmcr__ftab--on" : ""}`}
              onClick={() => setFilterStatus(f.val)}
            >
              {f.label}
              <span className="pmcr__ftab-count">{f.count}</span>
            </button>
          ))}
        </div>
        <select className="pmcr__select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="pmcr__view-toggle">
          <button className={`pmcr__vtab ${viewMode === "list" ? "pmcr__vtab--on" : ""}`} onClick={() => setViewMode("list")}>☰ List</button>
          <button className={`pmcr__vtab ${viewMode === "calendar" ? "pmcr__vtab--on" : ""}`} onClick={() => setViewMode("calendar")}>📅 Calendar</button>
        </div>
      </div>

      {/* Report list or Calendar */}
      {loading ? (
        <div className="pmcr__loading"><div className="pmcr__spinner"/> Loading reports…</div>
      ) : viewMode === "calendar" ? (
        <CalendarView
          reports={allReports}
          weekStart={calWeekStart}
          onPrev={() => { const d = new Date(calWeekStart); d.setDate(d.getDate()-7); setCalWeekStart(d); }}
          onNext={() => { const d = new Date(calWeekStart); d.setDate(d.getDate()+7); setCalWeekStart(d); }}
          onToday={() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); setCalWeekStart(d); }}
          onOpen={openDetail}
          onApprove={handleApprove}
          onReject={openReject}
          submitting={submitting}
        />
      ) : reports.length === 0 ? (
        <div className="pmcr__empty">
          <div>💰</div>
          <p>No cost reports found</p>
          <p className="pmcr__empty-hint">The Quantity Surveyor submits reports from the BOQ page. They will appear here for your review.</p>
        </div>
      ) : (
        <div className="pmcr__list">
          {reports.map(r => {
            const st          = STATUS[r.status] || STATUS.pending_pm;
            const labourItems = safeArr(r.labourItems);
            const hasLabour   = r.labourTotal > 0 || labourItems.length > 0;
            return (
              <div key={r.id} className={`pmcr__card pmcr__card--${st.color}`}>
                <div className="pmcr__card-top">
                  <div className="pmcr__card-left">
                    <div className="pmcr__card-project">{r.projectName}</div>
                    <div className="pmcr__card-meta">
                      🏗️ {r.milestoneName} &nbsp;·&nbsp; BOQ #{r.boqId} &nbsp;·&nbsp; 📅 {r.createdDate}
                    </div>
                    {r.status === "rejected" && r.pmComment && (
                      <div className="pmcr__card-comment">
                        <span>💬 Your message to QS:</span> {r.pmComment}
                      </div>
                    )}
                  </div>
                  <div className="pmcr__card-right">
                    <div className="pmcr__card-total">{fmt(r.totalCost)}</div>
                    {hasLabour && (
                      <div className="pmcr__cost-split">
                        <span className="pmcr__cost-pill pmcr__cost-pill--mat">Mat {fmt(r.materialTotal || 0)}</span>
                        <span className="pmcr__cost-pill pmcr__cost-pill--lab">Lab {fmt(r.labourTotal   || 0)}</span>
                      </div>
                    )}
                    <span className={`pmcr__status-badge pmcr__status--${st.color}`}>{st.icon} {st.label}</span>
                  </div>
                </div>
                <div className="pmcr__card-actions">
                  <button className="pmcr__view-btn" onClick={() => openDetail(r)}>👁 View Full Report</button>
                  {r.status === "pending_pm" && (
                    <>
                      <button className="pmcr__approve-btn" onClick={() => handleApprove(r.id)} disabled={submitting}>✔ Approve</button>
                      <button className="pmcr__reject-btn"  onClick={() => openReject(r.id)}    disabled={submitting}>✘ Reject &amp; Message QS</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RejectModal />
    </div>
  );
}