import { useState, useEffect, useCallback } from "react";
import "./Payroll.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const token = () => localStorage.getItem("token");
const hdrs  = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

/* ── format number Indian style ── */
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

/* ════════════════════════════════════════════════════
   HOLIDAY CALENDAR — same list from original code
   (extend year-by-year as needed)
════════════════════════════════════════════════════ */
const HOLIDAYS_LIST = [
  // 2024
  "2024-01-26","2024-08-15","2024-10-02","2024-12-25",
  // 2025
  "2025-01-01","2025-01-14","2025-01-26","2025-03-17",
  "2025-04-14","2025-05-01","2025-08-15","2025-10-02","2025-12-25",
  // 2026 — from original Payroll.jsx
  "2026-01-01","2026-01-26","2026-01-15","2026-03-19",
  "2026-04-15","2026-05-01","2026-08-26","2026-09-14",
  "2026-10-20","2026-12-25",
];
const HOLIDAYS = new Set(HOLIDAYS_LIST);

/* ════════════════════════════════════════════════════
   LEAVE ACCRUAL LOGIC
   Total: 18 days/year → 1.5 days/month
     Casual Leave (CL) : 12 days/year = 1.0/month
     Sick Leave   (SL) :  6 days/year = 0.5/month
   LOP triggers only when BOTH CL and SL are exhausted
   LOP deduction = (monthlySalary ÷ workingDays) × lopDays
════════════════════════════════════════════════════ */
function calcLeaveAccrual(month, joinDate) {
  if (!month) return { cl: 0, sl: 0, totalAccrued: 0 };

  const [curY, curM] = month.split("-").map(Number);

  // How many months has the employee been working up to and including selected month?
  let monthsWorked = 0;
  if (joinDate) {
    const jd = new Date(joinDate);
    const jY = jd.getFullYear();
    const jM = jd.getMonth() + 1; // 1-based
    monthsWorked = (curY - jY) * 12 + (curM - jM) + 1;
    if (monthsWorked < 0) monthsWorked = 0;
  } else {
    // No join date — assume full year accrual so far (show current month's balance)
    monthsWorked = curM; // Jan=1 month, Dec=12 months
  }

  const cl = Math.min(parseFloat((monthsWorked * 1.0).toFixed(1)), 12); // max 12/year
  const sl = Math.min(parseFloat((monthsWorked * 0.5).toFixed(1)),  6); // max 6/year

  return { cl, sl, totalAccrued: parseFloat((cl + sl).toFixed(1)) };
}

/* ════════════════════════════════════════════════════
   LOP CALCULATION
   leaves used > accrued balance → excess becomes LOP
   LOP deduction = (monthlySalary / workingDays) × lopDays
════════════════════════════════════════════════════ */
function calcLOP(leaveDaysTaken, accrual, monthlySalary, workingDays) {
  const totalBalance = accrual.cl + accrual.sl;            // available paid leave
  const lopDays      = Math.max(0, leaveDaysTaken - totalBalance);
  const lopDeduction = workingDays > 0
    ? Math.round((monthlySalary / workingDays) * lopDays)
    : 0;
  return { lopDays: Math.round(lopDays * 10) / 10, lopDeduction };
}

/* ════════════════════════════════════════════════════
   CALENDAR BUILDER — uses HOLIDAYS set
════════════════════════════════════════════════════ */
function buildCalendar(month, dailyMap = {}) {
  if (!month) return [];
  const [y, mo] = month.split("-").map(Number);
  const firstDow  = new Date(y, mo - 1, 1).getDay(); // 0=Sun
  const totalDays = new Date(y, mo, 0).getDate();
  const cells = [];

  // leading blank cells (Mon-based grid, like original code)
  const blanks = firstDow === 0 ? 6 : firstDow - 1;
  for (let i = 0; i < blanks; i++) cells.push({ label: "", cls: "empty" });

  for (let d = 1; d <= totalDays; d++) {
    const ds  = `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dow = new Date(y, mo - 1, d).getDay();
    let cls;

    if (HOLIDAYS.has(ds) || dow === 0) {
      cls = "holiday";                          // public holiday OR Sunday (Sat = working day)
    } else {
      const s = (dailyMap[ds] || "").toLowerCase();
      if      (s === "present" || s === "on time") cls = "present";
      else if (s === "late")                        cls = "late";
      else if (s.includes("half"))                  cls = "halfday";
      else if (s === "leave" || s.includes("approved")) cls = "leave";
      else if (s === "wfh")                         cls = "wfh";
      else if (s === "absent")                      cls = "absent";
      else                                          cls = "absent"; // no record = absent
    }
    cells.push({ label: d, cls, ds });
  }
  return cells;
}

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function Payroll() {
  const [query,       setQuery]       = useState("");
  const [month,       setMonth]       = useState("");
  const [empList,     setEmpList]     = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [empData,     setEmpData]     = useState(null);
  const [attData,     setAttData]     = useState(null);

  /* load employee list once */
  useEffect(() => {
    fetch(`${API}/api/payroll/employees`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => setEmpList(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  /* suggestions on typing */
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    setSuggestions(
      empList.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q)
      ).slice(0, 8)
    );
  }, [query, empList]);

  const pickEmployee = (emp) => {
    setQuery(emp.employee_code || String(emp.id));
    setSuggestions([]);
  };

  /* fetch payroll + attendance */
  const generate = useCallback(async () => {
    const id = query.trim();
    if (!id)    { setError("Please enter an employee name or code"); return; }
    if (!month) { setError("Please select a month"); return; }
    setError(""); setLoading(true); setEmpData(null); setAttData(null);
    try {
      const [eRes, aRes] = await Promise.all([
        fetch(`${API}/api/payroll/employee/${encodeURIComponent(id)}`,             { headers: hdrs() }),
        fetch(`${API}/api/payroll/attendance/${encodeURIComponent(id)}?month=${month}`, { headers: hdrs() }),
      ]);
      const eJson = await eRes.json();
      if (!eRes.ok) { setError(eJson.message || "Employee not found"); return; }
      setEmpData(eJson);
      const aJson = await aRes.json();
      setAttData(aRes.ok ? aJson : {
        workingDays: 26, daysPayable: 26, lop: 0,
        lopPrevMonth: 0, holidayCount: 0, counts: {}, dailyMap: {},
      });
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [query, month]);

  /* ── derived data ── */
  const emp  = empData?.employee || {};
  const sal  = empData?.salary   || {};
  const att  = attData           || {};
  const cells = buildCalendar(month, att.dailyMap || {});

  // Count statuses from actual calendar cells
  const calCounts = cells.reduce((acc, c) => {
    if (c.cls && c.cls !== "empty") acc[c.cls] = (acc[c.cls] || 0) + 1;
    return acc;
  }, {});

  // Leave accrual for this employee up to the selected month
  const accrual     = calcLeaveAccrual(month, emp.join_date);
  const leaveTaken  = calCounts.leave || 0;

  // LOP calculation
  const workingDays = att.workingDays || 26;
  const { lopDays, lopDeduction } = calcLOP(leaveTaken, accrual, emp.monthlySalary || 0, workingDays);
  const daysPayable = Math.max(0, workingDays - lopDays);

  // Adjust net salary if LOP applies
  const adjustedNet = Math.max(0, (sal.netSalary || 0) - lopDeduction);

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="hr-page-wrapper">
      <div className="container">

        <div className="header"><h1>Payroll</h1></div>

        {/* ── SEARCH ── */}
        <div className="search-section">
          <div className="search-grid">
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Employee name or code (e.g. EMP1001)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onBlur={() => setTimeout(() => setSuggestions([]), 180)}
                onFocus={() => {
                  if (query.length >= 2) {
                    const q = query.toLowerCase();
                    setSuggestions(empList.filter(e =>
                      e.name?.toLowerCase().includes(q) ||
                      e.employee_code?.toLowerCase().includes(q)
                    ).slice(0, 8));
                  }
                }}
              />
              {suggestions.length > 0 && (
                <ul className="suggestions-dropdown">
                  {suggestions.map(e => (
                    <li key={e.id} onMouseDown={() => pickEmployee(e)}>
                      <strong>{e.employee_code}</strong> — {e.name}
                      <span className="sugg-dept">{e.department}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
            <button onClick={generate} disabled={loading}>
              {loading ? "Loading…" : "Generate Payslip"}
            </button>
          </div>
          {error && <p className="error-msg">⚠ {error}</p>}
        </div>

        {/* ── EMPTY STATE ── */}
        {!empData && !loading && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Search for an employee and select a month to generate their payslip.</p>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {empData && (
          <div className="dashboard">

            {/* ══ LEFT — Employee + Attendance ══ */}
            <div className="card">
              <h2>Employee Details</h2>

              <div className="employee-card">
                <div className="emp-grid-2col">
                  <div>
                    <div className="emp-row"><span className="emp-label">Name</span><span>{emp.name || "—"}</span></div>
                    <div className="emp-row"><span className="emp-label">Employee No</span><span>{emp.employee_code || "—"}</span></div>
                    <div className="emp-row"><span className="emp-label">Designation</span><span>{emp.designation || "—"}</span></div>
                    <div className="emp-row"><span className="emp-label">Department</span><span>{emp.department || "—"}</span></div>
                    <div className="emp-row"><span className="emp-label">Location</span><span>{emp.location || "—"}</span></div>
                    <div className="emp-row"><span className="emp-label">Bank</span><span>{emp.bankName || "—"}</span></div>
                    <div className="emp-row"><span className="emp-label">IFSC</span><span>{emp.ifsc || "—"}</span></div>
                  </div>
                  <div>
                    <div className="emp-row"><span className="emp-label">{emp.gov_id_type?.toUpperCase() || "Gov ID"}</span><span>{emp.gov_id_number || "—"}</span></div>
                    <div className="emp-row"><span className="emp-label">Working Days</span><span>{workingDays}</span></div>
                    <div className="emp-row"><span className="emp-label">Days Payable</span><span>{daysPayable}</span></div>
                    <div className="emp-row"><span className="emp-label">LOP Days</span><span style={{color: lopDays > 0 ? "#c0392b" : "inherit"}}>{lopDays}</span></div>
                    <div className="emp-row"><span className="emp-label">LOP Prev Month</span><span>{att.lopPrevMonth ?? 0}</span></div>
                    <div className="emp-row"><span className="emp-label">Bank Acc No</span><span>{emp.bankAccNo || "—"}</span></div>
                    <div className="emp-row"><span className="emp-label">Monthly Salary</span><span>₹{fmt(emp.monthlySalary)}</span></div>
                  </div>
                </div>
              </div>

              {/* ── Leave Balance ── */}
              <h3 className="section-title">Leave Balance — {monthLabel(month)}</h3>
              <div className="leave-balance-grid">
                <div className="leave-box">
                  <span className="leave-type">Casual Leave (CL)</span>
                  <span className="leave-accrued">Accrued: <strong>{accrual.cl}</strong> days</span>
                  <span className="leave-rule">12 days/year · 1/month</span>
                </div>
                <div className="leave-box">
                  <span className="leave-type">Sick Leave (SL)</span>
                  <span className="leave-accrued">Accrued: <strong>{accrual.sl}</strong> days</span>
                  <span className="leave-rule">6 days/year · 0.5/month</span>
                </div>
                <div className={`leave-box ${lopDays > 0 ? "lop-active" : ""}`}>
                  <span className="leave-type">LOP This Month</span>
                  <span className="leave-accrued">Days: <strong>{lopDays}</strong></span>
                  <span className="leave-rule">
                    {lopDays > 0
                      ? `−₹${fmt(lopDeduction)} deducted`
                      : "Leave balance sufficient"}
                  </span>
                </div>
              </div>

              {lopDays > 0 && (
                <div className="lop-formula-note">
                  LOP = (₹{fmt(emp.monthlySalary)} ÷ {workingDays} days) × {lopDays} days = <strong>−₹{fmt(lopDeduction)}</strong>
                </div>
              )}

              {/* ── Attendance Stats ── */}
              <h3 className="section-title">Attendance — {monthLabel(month)}</h3>
              <div className="attendance-stats">
                <div className="stat-card present"><span>Present</span><strong>{calCounts.present || 0}</strong></div>
                <div className="stat-card late"><span>Late</span><strong>{calCounts.late || 0}</strong></div>
                <div className="stat-card halfday"><span>Half Day</span><strong>{calCounts.halfday || 0}</strong></div>
                <div className="stat-card leave"><span>Leave</span><strong>{calCounts.leave || 0}</strong></div>
                <div className="stat-card holiday"><span>Holiday</span><strong>{calCounts.holiday || 0}</strong></div>
              </div>

              {/* ── Calendar ── */}
              <h3 className="section-title">Calendar</h3>
              <div className="calendar">
                <div className="calendar-grid">
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                    <div key={d} className="calendar-header">{d}</div>
                  ))}
                  {cells.map((c, i) => (
                    <div key={i} className={`calendar-day ${c.cls}`}>
                      {c.cls !== "empty" ? c.label : ""}
                    </div>
                  ))}
                </div>
                <div className="calendar-legend">
                  {[["present","Present"],["late","Late"],["leave","Leave"],
                    ["halfday","Half Day"],["absent","Absent"],["holiday","Holiday/Sun"]].map(([cls, lbl]) => (
                    <span key={cls} className={`legend-dot ${cls}`}>{lbl}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ══ RIGHT — Salary Breakdown ══ */}
            <div className="card">
              <h2>Salary Breakdown</h2>
              <div className="payslip-title">Pay Slip for {monthLabel(month)}</div>

              {/* Earnings & Deductions */}
              <div className="earnings-deductions-grid">
                <div className="ed-section">
                  <div className="ed-header">Earnings</div>
                  <div className="ed-table">
                    {[
                      ["Basic Pay",            sal.basic],
                      ["House Rent Allowance", sal.hra],
                      ["Special Allowance",    sal.specialAllow],
                      ["Leave Travel Allow.",  "NA"],
                      ["Ex-Gratia / Bonus",    sal.exGratia],
                      ["Variable Pay",         sal.variablePay],
                    ].map(([label, val], i) => (
                      <div className="ed-row" key={i}>
                        <span>{label}</span>
                        <span className="ed-amt">
                          {val === "NA" ? "NA" : val ? `₹${fmt(val)}` : "—"}
                        </span>
                      </div>
                    ))}
                    <div className="ed-row ed-total">
                      <strong>Total Earnings</strong>
                      <strong className="amount">₹{fmt(sal.totalEarnings)}</strong>
                    </div>
                  </div>
                </div>

                <div className="ed-section">
                  <div className="ed-header">Deductions</div>
                  <div className="ed-table">
                    {[
                      ["Provident Fund", sal.pf],
                      ["Prof Tax",       sal.profTax],
                      ["Income Tax",     sal.incomeTax],
                      ...(lopDays > 0 ? [["LOP Deduction", lopDeduction]] : []),
                    ].map(([label, val], i) => (
                      <div className="ed-row" key={i}>
                        <span>{label}</span>
                        <span className="ed-amt deduction-amt">
                          {val ? `₹${fmt(val)}` : "—"}
                        </span>
                      </div>
                    ))}
                    <div className="ed-row ed-total">
                      <strong>Total Deductions</strong>
                      <strong className="amount deduction">
                        ₹{fmt((sal.totalDeductions || 0) + lopDeduction)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="net-salary-bar">
                <span>Net Salary</span>
                <span className="net-amount">₹{fmt(adjustedNet)}</span>
              </div>

              {/* Annual CTC Structure */}
              <h3 className="section-title" style={{ marginTop: "18px" }}>Annual CTC Structure</h3>
              <div className="ctc-table-wrap">
                <table className="ctc-table">
                  <thead>
                    <tr>
                      <th>Salary</th>
                      <th colSpan={3} className="ctc-main-val">₹{fmt(sal.annualCTC)}</th>
                    </tr>
                    <tr className="ctc-subhead">
                      <th></th><th>1 Month</th><th>12 Months</th><th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Basic",                sal.basic,        sal.basic * 12,        "40%"],
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
                      <td><strong>TOTAL FIXED CASH</strong></td>
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
                      <td><strong>TARGET CASH COMPENSATION</strong></td>
                      <td><strong>{fmt(sal.targetCashComp)}</strong></td>
                      <td><strong>{fmt(sal.targetCashComp * 12)}</strong></td>
                      <td><strong>98%</strong></td>
                    </tr>
                    <tr>
                      <td>Medical Insurance Premium</td>
                      <td>{fmt(sal.medical)}</td>
                      <td>{fmt(sal.medical * 12)}</td>
                      <td>2%</td>
                    </tr>
                    <tr className="ctc-total-row">
                      <td><strong>TARGET COST TO COMPANY</strong></td>
                      <td><strong>{fmt(sal.targetCTC)}</strong></td>
                      <td><strong>{fmt(sal.annualCTC)}</strong></td>
                      <td><strong>100%</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button className="approve-btn" style={{ marginTop: "16px" }}
                onClick={() => alert("✅ Payslip Approved & Sent to Employee")}>
                Approve &amp; Send Payslip
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}