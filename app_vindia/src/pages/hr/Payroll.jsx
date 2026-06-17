import { useState, useEffect, useCallback, useRef } from "react";
import "./Payroll.css";

const API   = import.meta.env.VITE_API_URL || "http://localhost:5000";
const token = () => localStorage.getItem("token");
const hdrs  = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const fmt = (v) => {
  if (v === "NA" || v == null) return "—";
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString("en-IN");
};

const monthLabel = (m) => {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  return new Date(y, mo - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
};

/* ══════════════════════════════════════════════════════════
   PUBLIC HOLIDAYS (keep in sync with backend)
══════════════════════════════════════════════════════════ */
const HOLIDAYS = new Set([
  "2024-01-26","2024-08-15","2024-10-02","2024-12-25",
  "2025-01-01","2025-01-14","2025-01-26","2025-03-17",
  "2025-04-14","2025-05-01","2025-08-15","2025-10-02","2025-12-25",
  "2026-01-01","2026-01-15","2026-01-26","2026-03-19",
  "2026-04-15","2026-05-01","2026-08-26","2026-09-14",
  "2026-10-20","2026-12-25",
]);

/* ══════════════════════════════════════════════════════════
   LEAVE BALANCE — frontend calculation (fallback)
══════════════════════════════════════════════════════════ */
function calcFrontendLeaveBalance(selectedMonth, joinDate) {
  if (!selectedMonth) return { cl: 0, sl: 0, totalAccruedBalance: 0, monthsWorked: 0 };
  const [curY, curM] = selectedMonth.split("-").map(Number);
  let joinY = curY, joinM = curM;
  if (joinDate) {
    const jd = new Date(joinDate);
    joinY = jd.getFullYear();
    joinM = jd.getMonth() + 1;
  }
  if (joinY > curY) return { cl: 0, sl: 0, totalAccruedBalance: 0, monthsWorked: 0 };
  const accrualStart = (joinY < curY) ? 1 : joinM;
  const monthsWorked = Math.max(0, curM - accrualStart + 1);
  const cl = Math.min(parseFloat((monthsWorked * 1.0).toFixed(1)), 12);
  const sl = Math.min(parseFloat((monthsWorked * 0.5).toFixed(1)),  6);
  return { cl, sl, totalAccruedBalance: parseFloat((cl + sl).toFixed(1)), monthsWorked };
}

/* ══════════════════════════════════════════════════════════
   LOP CALCULATION
══════════════════════════════════════════════════════════ */
function calcLOP(counts, totalAccruedBalance, monthlySalary, workingDays) {
  const absentDays = counts.absent  || 0;
  const leaveDays  = counts.leave   || 0;
  const halfDays   = counts.halfday || 0;
  const leaveConsumed = parseFloat((absentDays + leaveDays + halfDays * 0.5).toFixed(2));
  const lopDays = Math.max(0, parseFloat((leaveConsumed - totalAccruedBalance).toFixed(2)));
  const lopDeduction = workingDays > 0 ? Math.round((monthlySalary / workingDays) * lopDays) : 0;
  return { lopDays, lopDeduction, leaveConsumed, absentDays, leaveDays, halfDays };
}

/* ══════════════════════════════════════════════════════════
   ABSENT SINCE JOIN — counts absent days from join_date up
   to end of selected month (for the "absent from day joined"
   requirement in handwritten notes)
══════════════════════════════════════════════════════════ */
function countAbsentSinceJoin(dailyMap, joinDate, month) {
  if (!joinDate || !month) return 0;
  const [y, mo] = month.split("-").map(Number);
  const lastDay = new Date(y, mo, 0).getDate();
  const jd = new Date(joinDate);
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const ds = `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dayDate = new Date(y, mo - 1, d);
    if (dayDate < jd) continue;
    if (dayDate > new Date()) continue;
    const dow = dayDate.getDay();
    if (HOLIDAYS.has(ds) || dow === 0) continue;
    const raw = (dailyMap[ds] || "").toLowerCase().trim();
    if (!raw || raw === "absent") count++;
  }
  return count;
}

/* ══════════════════════════════════════════════════════════
   CALENDAR BUILDER
══════════════════════════════════════════════════════════ */
function buildCalendar(month, dailyMap = {}, joinDate = null) {
  if (!month) return [];
  const [y, mo] = month.split("-").map(Number);
  const firstDow  = new Date(y, mo - 1, 1).getDay();
  const totalDays = new Date(y, mo, 0).getDate();
  const cells     = [];

  // Mon-based grid: Mon=1..Sun=0 → blanks = (firstDow===0 ? 6 : firstDow-1)
  const blanks = firstDow === 0 ? 6 : firstDow - 1;
  for (let i = 0; i < blanks; i++) cells.push({ label: "", cls: "empty" });

  const today   = new Date();
  const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const joinTs  = joinDate ? new Date(joinDate).setHours(0,0,0,0) : null;

  for (let d = 1; d <= totalDays; d++) {
    const ds    = `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dow   = new Date(y, mo - 1, d).getDay();
    const dayTs = new Date(y, mo - 1, d).getTime();

    if (dayTs > todayTs)                    { cells.push({ label: d, cls: "future",  ds }); continue; }
    if (joinTs && dayTs < joinTs)           { cells.push({ label: d, cls: "prejoin", ds }); continue; }
    if (HOLIDAYS.has(ds) || dow === 0)      { cells.push({ label: d, cls: "holiday", ds }); continue; }

    const raw = (dailyMap[ds] || "").toLowerCase().trim();
    let cls;
    if      (raw === "present" || raw === "on time") cls = "present";
    else if (raw === "late")                          cls = "late";
    else if (raw.includes("half"))                    cls = "halfday";
    else if (raw === "leave")                         cls = "leave";
    else if (raw === "wfh")                           cls = "wfh";
    else                                              cls = "absent";

    cells.push({ label: d, cls, ds });
  }
  return cells;
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function Payroll() {
  const [query,       setQuery]       = useState("");
  const [month,       setMonth]       = useState("");
  const [empList,     setEmpList]     = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [empData,     setEmpData]     = useState(null);
  const [attData,     setAttData]     = useState(null);
  const [activeTab,   setActiveTab]   = useState("attendance"); // "attendance" | "payslip"

  const pickingRef = useRef(false);

  /* Load employee list once */
  useEffect(() => {
    fetch(`${API}/api/payroll/employees`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => setEmpList(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  /* Autocomplete */
  const computeSuggestions = useCallback((q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    const lower = q.toLowerCase();
    setSuggestions(
      empList
        .filter(e => e.name?.toLowerCase().includes(lower) || e.employee_code?.toLowerCase().includes(lower))
        .slice(0, 8)
    );
  }, [empList]);

  useEffect(() => { computeSuggestions(query); }, [query, computeSuggestions]);

  const pickEmployee = (emp) => {
    pickingRef.current = true;
    setQuery(emp.employee_code || String(emp.id));
    setSuggestions([]);
    setShowSugg(false);
    setTimeout(() => { pickingRef.current = false; }, 300);
  };

  const handleInputBlur = () => {
    setTimeout(() => { if (!pickingRef.current) setShowSugg(false); }, 200);
  };

  /* Fetch payroll + attendance */
  const generate = useCallback(async () => {
    const id = query.trim();
    if (!id)    { setError("Please enter an employee name or code"); return; }
    if (!month) { setError("Please select a month"); return; }
    setError(""); setLoading(true); setEmpData(null); setAttData(null);
    try {
      const [eRes, aRes] = await Promise.all([
        fetch(`${API}/api/payroll/employee/${encodeURIComponent(id)}`, { headers: hdrs() }),
        fetch(`${API}/api/payroll/attendance/${encodeURIComponent(id)}?month=${month}`, { headers: hdrs() }),
      ]);
      const eJson = await eRes.json();
      if (!eRes.ok) { setError(eJson.message || "Employee not found"); setLoading(false); return; }
      setEmpData(eJson);
      const aJson = await aRes.json();
      setAttData(aRes.ok ? aJson : {
        workingDays: 26, daysPayable: 26, lop: 0,
        lopPrevMonth: 0, holidayCount: 0, counts: {}, dailyMap: {},
        leaveBalance: null,
      });
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [query, month]);

  /* ── Derived values ────────────────────────────────── */
  const emp = empData?.employee || {};
  const sal = empData?.salary   || {};
  const att = attData           || {};

  const isBeforeJoin = (() => {
    if (!emp.join_date || !month) return false;
    const jd = new Date(emp.join_date);
    const [cy, cm] = month.split("-").map(Number);
    return cy < jd.getFullYear() || (cy === jd.getFullYear() && cm < jd.getMonth() + 1);
  })();

  const today = new Date();
  const isCurrentMonth = month && (() => {
    const [cy, cm] = month.split("-").map(Number);
    return today.getFullYear() === cy && (today.getMonth() + 1) === cm;
  })();

  const cells = buildCalendar(month, att.dailyMap || {}, emp.join_date);

  // calCounts: from rendered calendar cells (drives calendar coloring)
  const calCounts = cells.reduce((acc, c) => {
    if (!["empty","prejoin","future","holiday"].includes(c.cls)) acc[c.cls] = (acc[c.cls] || 0) + 1;
    if (c.cls === "holiday") acc.holiday = (acc.holiday || 0) + 1;
    return acc;
  }, {});

  // effectiveCounts: prefer backend DB counts (more accurate) over calendar-derived counts.
  // calCounts can miss records when dailyMap status strings don't match buildCalendar's expectations.
  const backendCounts = att.counts || {};
  const hasBackendData = Object.keys(att.dailyMap || {}).length > 0;
  const effectiveCounts = hasBackendData ? {
    present: backendCounts.present || 0,
    late:    backendCounts.late    || 0,
    halfday: backendCounts.halfday || 0,
    leave:   backendCounts.leave   || 0,
    absent:  backendCounts.absent  || 0,
    wfh:     backendCounts.wfh     || 0,
    holiday: calCounts.holiday     || 0,
  } : calCounts;

  /* Leave balance */
  const backendBalance = att.leaveBalance || null;
  const frontendBal    = calcFrontendLeaveBalance(month, emp.join_date);
  const accruedCL  = backendBalance ? backendBalance.accruedCL  : frontendBal.cl;
  const accruedSL  = backendBalance ? backendBalance.accruedSL  : frontendBal.sl;
  const usedCL     = backendBalance ? backendBalance.usedCL     : 0;
  const usedSL     = backendBalance ? backendBalance.usedSL     : 0;
  const balanceCL  = backendBalance ? backendBalance.balanceCL  : frontendBal.cl;
  const balanceSL  = backendBalance ? backendBalance.balanceSL  : frontendBal.sl;
  const totalAccruedBalance = backendBalance ? backendBalance.totalAccruedBalance : frontendBal.totalAccruedBalance;
  const monthsWorked = backendBalance ? backendBalance.monthsWorked : frontendBal.monthsWorked;

  const workingDays = att.workingDays || 26;
  const holidayCount = att.holidayCount || 0;

  const { lopDays, lopDeduction, leaveConsumed } = calcLOP(
    effectiveCounts, totalAccruedBalance, emp.monthlySalary || 0, workingDays
  );

  const daysPayable = Math.max(0, workingDays - lopDays);
  const adjustedNet = Math.max(0, (sal.netSalary || 0) - lopDeduction);

  /* Absent since join date (handwritten note requirement) */
  const absentSinceJoin = countAbsentSinceJoin(att.dailyMap || {}, emp.join_date, month);

  /* LWP flag: absent > allowed leave */
  const lwpActive = lopDays > 0;

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="pr-wrapper">
      <div className="pr-container">

        <div className="pr-page-header">
          <h1>Payroll</h1>
          <p>Generate and review employee payslips with real attendance data</p>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="pr-search-card">
          <div className="pr-search-row">
            <div className="pr-input-wrap" style={{ position: "relative" }}>
              <span className="pr-input-icon">🔍</span>
              <input
                type="text"
                className="pr-input"
                placeholder="Employee name or code (e.g. EMP1001)"
                value={query}
                autoComplete="off"
                onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                onBlur={handleInputBlur}
              />
              {showSugg && suggestions.length > 0 && (
                <ul className="pr-suggestions">
                  {suggestions.map(e => (
                    <li key={e.id} onMouseDown={(ev) => { ev.preventDefault(); pickEmployee(e); }}>
                      <span className="sugg-code">{e.employee_code}</span>
                      <span className="sugg-name">{e.name}</span>
                      <span className="sugg-dept">{e.department}</span>
                      {e.join_date && (
                        <span className="sugg-join">
                          Joined {new Date(e.join_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="pr-input-wrap pr-input-wrap--month">
              <span className="pr-input-icon">📅</span>
              <input type="month" className="pr-input" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
            <button className="pr-btn" onClick={generate} disabled={loading}>
              {loading ? <span className="pr-spinner" /> : null}
              {loading ? "Loading…" : "Generate Payslip"}
            </button>
          </div>
          {error && <div className="pr-error"><span>⚠</span> {error}</div>}
        </div>

        {/* ── EMPTY STATE ── */}
        {!empData && !loading && (
          <div className="pr-empty">
            <div className="pr-empty-icon">📋</div>
            <p>Search for an employee and select a month to generate their payslip.</p>
          </div>
        )}

        {/* ── BEFORE-JOIN WARNING ── */}
        {empData && isBeforeJoin && (
          <div className="pr-warn-banner">
            <div className="pr-warn-title">⚠ No payroll data for this period</div>
            <div className="pr-warn-body">
              <strong>{emp.name}</strong> joined on{" "}
              <strong>{new Date(emp.join_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>.
              {" "}Payroll can only be generated from{" "}
              <strong>{new Date(emp.join_date).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong> onwards.
            </div>
          </div>
        )}

        {/* ── CURRENT MONTH NOTICE ── */}
        {empData && !isBeforeJoin && isCurrentMonth && (
          <div className="pr-info-banner">
            📅 This month is in progress — attendance counted up to{" "}
            <strong>{today.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>.
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {empData && !isBeforeJoin && (
          <div className="pr-dashboard">

            {/* ══ LEFT COLUMN ══ */}
            <div className="pr-card">

              {/* Employee Details */}
              <div className="pr-section-header">
                <span className="pr-section-icon">👤</span>
                <h2>Employee Details</h2>
              </div>
              <div className="pr-emp-grid">
                <div className="pr-emp-col">
                  {[
                    ["Name",        emp.name],
                    ["Employee No", emp.employee_code],
                    ["Designation", emp.designation],
                    ["Department",  emp.department],
                    ["Location",    emp.location],
                  ].map(([label, val]) => (
                    <div className="pr-emp-row" key={label}>
                      <span className="pr-emp-label">{label}</span>
                      <span className="pr-emp-val">{val || "—"}</span>
                    </div>
                  ))}
                </div>
                <div className="pr-emp-col">
                  {[
                    [emp.gov_id_type?.toUpperCase() || "Gov ID", emp.gov_id_number],
                    ["Bank",           emp.bankName],
                    ["IFSC",           emp.ifsc],
                    ["Account No",     emp.bankAccNo],
                    ["Monthly Salary", `₹${fmt(emp.monthlySalary)}`],
                  ].map(([label, val]) => (
                    <div className="pr-emp-row" key={label}>
                      <span className="pr-emp-label">{label}</span>
                      <span className="pr-emp-val">{val || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── TABS: Attendance / Payslip (mobile-friendly) ── */}
              <div className="pr-tabs" style={{ marginTop: "20px" }}>
                <button
                  className={`pr-tab-btn ${activeTab === "attendance" ? "pr-tab-btn--active" : ""}`}
                  onClick={() => setActiveTab("attendance")}
                >
                  📊 Attendance
                </button>
                <button
                  className={`pr-tab-btn ${activeTab === "payslip" ? "pr-tab-btn--active" : ""}`}
                  onClick={() => setActiveTab("payslip")}
                >
                  💰 Payslip
                </button>
              </div>

              {/* ── ATTENDANCE TAB ── */}
              {activeTab === "attendance" && (
                <>
                  {/* Attendance Status Summary (6 pill stats) */}
                  <div className="pr-section-header" style={{ marginTop: "16px" }}>
                    <span className="pr-section-icon">📊</span>
                    <h2>Attendance — {monthLabel(month)}{isCurrentMonth ? " (In Progress)" : ""}</h2>
                  </div>

                  <div className="pr-att-stats">
                    {[
                      ["present", "Present",  (effectiveCounts.present || 0) + (effectiveCounts.wfh || 0)],
                      ["late",    "Late",     effectiveCounts.late    || 0],
                      ["halfday", "Half Day", effectiveCounts.halfday || 0],
                      ["leave",   "Leave",    effectiveCounts.leave   || 0],
                      ["absent",  "Absent",   effectiveCounts.absent  || 0],
                      ["holiday", "Holiday",  holidayCount],
                    ].map(([key, label, count]) => (
                      <div key={key} className={`pr-stat pr-stat--${key}`}>
                        <span className="pr-stat-count">{count}</span>
                        <span className="pr-stat-label">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary pills */}
                  <div className="pr-att-summary">
                    {[
                      ["Working Days",      workingDays,          "info"],
                      ["Days Payable",      Math.round(daysPayable * 10) / 10, "info"],
                      ["This Month Holidays", holidayCount,        "info"],
                      ["Absent Since Join",  absentSinceJoin,     absentSinceJoin > 0 ? "lop" : "info"],
                      ...(lopDays > 0 ? [["LOP Days", lopDays, "lop"]] : []),
                    ].map(([label, val, type]) => (
                      <div key={label} className={`pr-att-pill pr-att-pill--${type}`}>
                        <span className="pill-label">{label}</span>
                        <span className="pill-val">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Leave Balance */}
                  <div className="pr-section-header" style={{ marginTop: "20px" }}>
                    <span className="pr-section-icon">🗓</span>
                    <h2>Leave Balance — {monthLabel(month)}</h2>
                  </div>

                  <div className="pr-leave-policy-note">
                    Accrual based on <strong>{monthsWorked} month{monthsWorked !== 1 ? "s" : ""}</strong> worked
                    in {month?.split("-")[0]} · Resets every January · <strong>SL does not carry forward</strong>
                  </div>

                  <div className="pr-leave-grid">
                    {/* CL */}
                    <div className="pr-leave-card pr-leave-card--cl">
                      <div className="leave-card-top">
                        <span className="leave-badge">CL</span>
                        <span className="leave-title">Casual Leave</span>
                      </div>
                      <div className="leave-days">{balanceCL} <span>days</span></div>
                      <div className="leave-meta">
                        Accrued: {accruedCL} · Used: {usedCL} · 1.0/month · max 12/yr
                      </div>
                    </div>
                    {/* SL */}
                    <div className="pr-leave-card pr-leave-card--sl">
                      <div className="leave-card-top">
                        <span className="leave-badge">SL</span>
                        <span className="leave-title">Sick Leave</span>
                      </div>
                      <div className="leave-days">{balanceSL} <span>days</span></div>
                      <div className="leave-meta">
                        Accrued: {accruedSL} · Used: {usedSL} · 0.5/month · max 6/yr
                      </div>
                      <div className="leave-no-carry">⚠ SL does not carry forward</div>
                    </div>
                    {/* LOP */}
                    <div className={`pr-leave-card pr-leave-card--lop ${lopDays > 0 ? "active-lop" : ""}`}>
                      <div className="leave-card-top">
                        <span className="leave-badge leave-badge--lop">LOP</span>
                        <span className="leave-title">Loss of Pay</span>
                      </div>
                      <div className="leave-days">{lopDays} <span>days</span></div>
                      <div className="leave-meta">
                        {lopDays > 0 ? `−₹${fmt(lopDeduction)} deducted from salary` : "Balance sufficient — no LOP"}
                      </div>
                    </div>
                  </div>

                  {/* LOP Explainer */}
                  <div className="pr-lop-explainer">
                    <div className="lop-row">
                      <span>Not present days</span>
                      <strong>{effectiveCounts.absent || 0}</strong>
                    </div>
                    <div className="lop-row">
                      <span>Late days</span>
                      <strong>{effectiveCounts.late || 0}</strong>
                    </div>
                    <div className="lop-row">
                      <span>Half days (× 0.5)</span>
                      <strong>{((effectiveCounts.halfday || 0) * 0.5).toFixed(1)}</strong>
                    </div>
                    <div className="lop-row">
                      <span>Approved leave days</span>
                      <strong>{effectiveCounts.leave || 0}</strong>
                    </div>
                    <div className="lop-row">
                      <span>CL taken</span>
                      <strong>{usedCL}</strong>
                    </div>
                    <div className="lop-row">
                      <span>SL taken</span>
                      <strong>{usedSL}</strong>
                    </div>
                    <div className="lop-row lop-row--total">
                      <span>Total leave consumed</span>
                      <strong>{leaveConsumed}</strong>
                    </div>
                    <div className="lop-row">
                      <span>Accrued balance (CL + SL) this year</span>
                      <strong className="lop-balance">{totalAccruedBalance}</strong>
                    </div>
                    <div className={`lop-row lop-row--result ${lopDays > 0 ? "lop-row--penalty" : "lop-row--ok"}`}>
                      <span>LOP (consumed − balance)</span>
                      <strong>
                        {lopDays > 0
                          ? `${lopDays} days → −₹${fmt(lopDeduction)}`
                          : "None ✓"}
                      </strong>
                    </div>
                    {lwpActive && (
                      <div className="lop-formula">
                        ₹{fmt(emp.monthlySalary)} ÷ {workingDays} days × {lopDays} LOP days
                        = <strong>−₹{fmt(lopDeduction)}</strong>
                      </div>
                    )}
                    {lwpActive && (
                      <div className="lop-lwp-note">
                        💡 Employee exceeded allowed leave — excess days treated as <strong>Leave Without Pay (LWP)</strong>.
                        LWP deduction applied to net salary.
                      </div>
                    )}
                  </div>

                  {/* Calendar */}
                  <div className="pr-section-header" style={{ marginTop: "20px" }}>
                    <span className="pr-section-icon">📆</span>
                    <h2>
                      Calendar{isCurrentMonth
                        ? ` (up to ${today.getDate()} ${today.toLocaleString("default", { month: "short" })})`
                        : ""}
                    </h2>
                  </div>

                  <div className="pr-calendar">
                    <div className="pr-cal-grid">
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                        <div key={d} className="pr-cal-header">{d}</div>
                      ))}
                      {cells.map((c, i) => (
                        <div key={i} className={`pr-cal-day pr-cal-day--${c.cls}`}>
                          {c.cls !== "empty" ? c.label : ""}
                        </div>
                      ))}
                    </div>
                    <div className="pr-cal-legend">
                      {[
                        ["present", "Present"],
                        ["late",    "Late"],
                        ["halfday", "Half Day"],
                        ["leave",   "Leave (CL/SL)"],
                        ["absent",  "Absent / LWP"],
                        ["holiday", "Holiday/Sun"],
                        ["wfh",     "WFH"],
                        ["future",  "Upcoming"],
                      ].map(([cls, lbl]) => (
                        <span key={cls} className={`pr-legend pr-legend--${cls}`}>{lbl}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── PAYSLIP TAB (inside left card, mobile view) ── */}
              {activeTab === "payslip" && (
                <PayslipBlock
                  sal={sal} emp={emp} month={month} monthLabel={monthLabel}
                  isCurrentMonth={isCurrentMonth} lopDays={lopDays}
                  lopDeduction={lopDeduction} adjustedNet={adjustedNet}
                  fmt={fmt}
                />
              )}
            </div>

            {/* ══ RIGHT COLUMN — always visible on desktop ══ */}
            <div className="pr-card pr-card--right">
              <PayslipBlock
                sal={sal} emp={emp} month={month} monthLabel={monthLabel}
                isCurrentMonth={isCurrentMonth} lopDays={lopDays}
                lopDeduction={lopDeduction} adjustedNet={adjustedNet}
                fmt={fmt}
              />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAYSLIP BLOCK — reused in both tab + right column
══════════════════════════════════════════════════════════ */
function PayslipBlock({ sal, emp, month, monthLabel, isCurrentMonth, lopDays, lopDeduction, adjustedNet, fmt }) {
  return (
    <>
      <div className="pr-section-header">
        <span className="pr-section-icon">💰</span>
        <h2>Salary Breakdown</h2>
      </div>

      <div className="pr-payslip-banner">
        Pay Slip for {monthLabel(month)}{isCurrentMonth ? " (Projected)" : ""}
      </div>

      <div className="pr-ed-grid">
        <div className="pr-ed-block">
          <div className="pr-ed-head pr-ed-head--earn">Earnings</div>
          <div className="pr-ed-body">
            {[
              ["Basic Pay",           sal.basic],
              ["House Rent Allow.",   sal.hra],
              ["Special Allowance",   sal.specialAllow],
              ["Leave Travel Allow.", "NA"],
              ["Ex-Gratia / Bonus",   sal.exGratia],
              ["Variable Pay",        sal.variablePay],
            ].map(([label, val], i) => (
              <div className="pr-ed-row" key={i}>
                <span>{label}</span>
                <span className="pr-ed-amt">{val === "NA" ? "NA" : val ? `₹${fmt(val)}` : "—"}</span>
              </div>
            ))}
            <div className="pr-ed-row pr-ed-row--total">
              <strong>Total Earnings</strong>
              <strong>₹{fmt(sal.totalEarnings)}</strong>
            </div>
          </div>
        </div>

        <div className="pr-ed-block">
          <div className="pr-ed-head pr-ed-head--deduct">Deductions</div>
          <div className="pr-ed-body">
            {[
              ["Provident Fund", sal.pf],
              ["Prof. Tax",      sal.profTax],
              ["Income Tax",     sal.incomeTax],
              ...(lopDays > 0 ? [["LWP Deduction", lopDeduction]] : []),
            ].map(([label, val], i) => (
              <div className="pr-ed-row" key={i}>
                <span>{label}</span>
                <span className="pr-ed-amt pr-ed-amt--deduct">{val ? `₹${fmt(val)}` : "—"}</span>
              </div>
            ))}
            <div className="pr-ed-row pr-ed-row--total">
              <strong>Total Deductions</strong>
              <strong className="pr-ed-amt--deduct">
                ₹{fmt((sal.totalDeductions || 0) + lopDeduction)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="pr-net-bar">
        <span>Net Salary{isCurrentMonth ? " (Projected)" : ""}</span>
        <span className="pr-net-amount">₹{fmt(adjustedNet)}</span>
      </div>

      {/* Annual CTC Table */}
      <div className="pr-section-header" style={{ marginTop: "20px" }}>
        <span className="pr-section-icon">📈</span>
        <h2>Annual CTC Structure</h2>
      </div>

      <div className="pr-ctc-wrap">
        <table className="pr-ctc-table">
          <thead>
            <tr>
              <th>Salary Component</th>
              <th>1 Month</th>
              <th>12 Months</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Basic Pay",            sal.basic,        sal.basic * 12,        "40%"],
              ["House Rent Allowance", sal.hra,          sal.hra * 12,          "20%"],
              ["Leave Travel Allow.",  "NA",             "NA",                  ""],
              ["Special Allowance",    sal.specialAllow, sal.specialAllow * 12, "5%"],
              ["Ex-Gratia Bonus",      sal.exGratia,     sal.exGratia * 12,     "27%"],
            ].map(([label, mo, yr, pct], i) => (
              <tr key={i}>
                <td>{label}</td>
                <td>{mo === "NA" ? "NA" : fmt(mo)}</td>
                <td>{yr === "NA" ? "NA" : fmt(yr)}</td>
                <td>{pct}</td>
              </tr>
            ))}
            <tr className="ctc-subtotal">
              <td><strong>Total Fixed Cash</strong></td>
              <td><strong>{fmt(sal.totalFixedCash)}</strong></td>
              <td><strong>{fmt(sal.totalFixedCash * 12)}</strong></td>
              <td><strong>93%</strong></td>
            </tr>
            <tr>
              <td>Variable Pay</td>
              <td>{fmt(sal.variablePay)}</td>
              <td>{fmt(sal.variablePay * 12)}</td>
              <td>5%</td>
            </tr>
            <tr className="ctc-subtotal">
              <td><strong>Target Cash Compensation</strong></td>
              <td><strong>{fmt(sal.targetCashComp)}</strong></td>
              <td><strong>{fmt(sal.targetCashComp * 12)}</strong></td>
              <td><strong>98%</strong></td>
            </tr>
            <tr>
              <td>Medical Insurance</td>
              <td>{fmt(sal.medical)}</td>
              <td>{fmt(sal.medical * 12)}</td>
              <td>2%</td>
            </tr>
            <tr className="ctc-total">
              <td><strong>Target Cost to Company</strong></td>
              <td><strong>{fmt(sal.targetCTC)}</strong></td>
              <td><strong>₹{fmt(sal.annualCTC)}</strong></td>
              <td><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <button className="pr-approve-btn" onClick={() => alert("✅ Payslip Approved & Sent to Employee")}>
        Approve &amp; Send Payslip
      </button>
    </>
  );
}