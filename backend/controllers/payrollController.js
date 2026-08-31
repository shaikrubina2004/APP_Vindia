const pool = require("../config/db");

/*
  ══════════════════════════════════════════════════════════
  SALARY BREAKDOWN  (from Monthly Salary entered by HR)
  ──────────────────────────────────────────────────────────
  Monthly Salary (what HR enters) = e.g. ₹40,000

  EARNINGS (percentages per the company's CTC breakup structure):
    Basic Pay          = 40%
    HRA                = 20%
    Special Allowance  =  5%
    Ex-Gratia / Bonus  = 27%
    Variable Pay       =  5%    ─┐ these two are cost-to-company items,
    Medical Insurance  =  2%    ─┘ not cash paid — excluded from Total Earnings
    Total Earnings     = 97%  (Basic+HRA+Special+ExGratia+Variable)

  DEDUCTIONS:
    PF         = 12% of Basic Pay, UNCAPPED.
                 (This company runs PF on full Basic, not the ₹15,000
                 statutory wage-ceiling — confirmed by the real payslip
                 sample: Basic ≈ ₹40,000 → PF = ₹4,800 exactly.)
    Prof Tax   = ₹200 flat
    Income Tax = 16% of Monthly Salary, FLAT (no slabs).
                 This % was derived from the reference payslip sample
                 (Basic ≈ ₹40,000 → Monthly Salary ≈ ₹1,00,000 →
                 Income Tax ₹15,877 ≈ 16% of Monthly Salary).
                 Adjust INCOME_TAX_PERCENT below if HR gives a
                 different rate.
  ══════════════════════════════════════════════════════════
*/

// Flat income-tax rate applied to Monthly Salary — see note above.
const INCOME_TAX_PERCENT = 0.16;

function calcSalary(monthlySalary) {
  const m = Math.round(Number(monthlySalary) || 0);

  const basic        = Math.round(m * 0.40);
  const hra          = Math.round(m * 0.20);
  const specialAllow = Math.round(m * 0.05);
  const exGratia     = Math.round(m * 0.27);
  const variablePay  = Math.round(m * 0.05);
  const medical      = Math.round(m * 0.02);

  const totalEarnings = basic + hra + specialAllow + exGratia + variablePay;

  const pf      = Math.round(basic * 0.12); // uncapped — see note above
  const profTax = m > 0 ? 200 : 0;

  const annualCTC = m * 12;
  const incomeTax = Math.round(m * INCOME_TAX_PERCENT); // flat % of Monthly Salary

  const totalDeductions = pf + profTax + incomeTax;
  const netSalary       = totalEarnings - totalDeductions;

  const totalFixedCash  = basic + hra + specialAllow + exGratia;
  const targetCashComp  = totalFixedCash + variablePay;
  const targetCTC       = targetCashComp + medical;

  return {
    basic, hra, specialAllow, exGratia, variablePay, medical,
    totalEarnings,
    pf, profTax, incomeTax,
    totalDeductions,
    netSalary,
    totalFixedCash, targetCashComp, targetCTC,
    annualCTC,
    monthlySalary: m,
  };
}

/* ══════════════════════════════════════════════════════════
   LEAVE BALANCE CALCULATION
   ──────────────────────────────────────────────────────────
   POLICY (as confirmed by HR):

   1. Accrual starts from the month the employee was added
      (join_date in employees table).

   2. Per month worked:
        CL = 1.0 day   (max 12 CL per calendar year)
        SL = 0.5 day   (max  6 SL per calendar year)

   3. NO carry-forward across calendar years.
      Every January 1st the balance resets to 0 and starts
      accruing fresh for that new year.

   4. Absent days AND approved-leave days both consume the
      balance. Any consumption beyond balance = LOP.

   5. The "selected month" is the payroll month being
      generated. We accrue only up to that month within
      the current calendar year.

   Example — employee joined March 2026, payroll for May 2026:
     Months worked in 2026 = March, April, May = 3 months
     CL accrued = 3 × 1.0 = 3.0  (cap 12 → 3.0)
     SL accrued = 3 × 0.5 = 1.5  (cap  6 → 1.5)
     Total balance = 4.5 days
   ══════════════════════════════════════════════════════════ */
async function calcLeaveBalance(employeeId, month) {
  const [curY, curM] = month.split("-").map(Number);

  // ── Get employee's join date ──────────────────────────────
  const empRes = await pool.query(
    `SELECT join_date FROM employees WHERE id = $1 LIMIT 1`,
    [employeeId]
  );
  const joinDate = empRes.rows[0]?.join_date;
  const jd       = joinDate ? new Date(joinDate) : null;

  // If join date is in a future year relative to payroll month → nothing accrued
  const joinYear = jd ? jd.getFullYear() : curY;
  const joinMon  = jd ? jd.getMonth() + 1 : curM;

  // ── Months worked in the CURRENT calendar year only ───────
  // Accrual starts from:
  //   - January (month 1) if the employee joined in a previous year
  //   - The join month if the employee joined this calendar year
  const accrualStartMon = (joinYear < curY) ? 1 : joinMon;

  // Guard: if employee hasn't joined yet in this year
  if (joinYear > curY) {
    return zeroBalance();
  }

  const monthsWorked = Math.max(0, curM - accrualStartMon + 1);

  // ── Accrue for this year (capped at annual max) ───────────
  const rawCL    = parseFloat((monthsWorked * 1.0).toFixed(1));
  const rawSL    = parseFloat((monthsWorked * 0.5).toFixed(1));
  const accruedCL = Math.min(rawCL, 12);
  const accruedSL = Math.min(rawSL,  6);

  // ── Approved leaves taken this calendar year ──────────────
  // We count only approved leaves from Jan 1 of curY up to end of curM
  const yearStart    = `${curY}-01-01`;
  const curMonthLastDay = new Date(curY, curM, 0).getDate(); // actual days in curM (handles 28/29/30/31)
  const monthEnd     = `${curY}-${String(curM).padStart(2, "0")}-${String(curMonthLastDay).padStart(2, "0")}`;

  const leavesRes = await pool.query(
    `SELECT from_date, to_date, reason
     FROM leaves
     WHERE employee_id = $1
       AND status = 'Approved'
       AND from_date >= $2
       AND from_date <= $3
     ORDER BY from_date ASC`,
    [employeeId, yearStart, monthEnd]
  );

  let usedCL = 0;
  let usedSL = 0;

  const approvedLeaves = leavesRes.rows.map((leave) => {
    const from   = new Date(leave.from_date);
    const to     = new Date(leave.to_date);
    const days   = Math.round((to - from) / 86400000) + 1;
    const reason = (leave.reason || "").toLowerCase();
    const type   = reason.includes("sick") ? "Sick Leave" : "Casual Leave";

    if (type === "Sick Leave") usedSL += days;
    else                       usedCL += days;

    return {
      from_date: leave.from_date,
      to_date:   leave.to_date,
      reason:    leave.reason || "—",
      type,
      days,
    };
  });

  // ── Balance = accrued − used (cannot go negative) ─────────
  const balanceCL = Math.max(0, parseFloat((accruedCL - usedCL).toFixed(1)));
  const balanceSL = Math.max(0, parseFloat((accruedSL - usedSL).toFixed(1)));

  const totalAccruedBalance = parseFloat((accruedCL + accruedSL).toFixed(1));
  const totalBalance        = parseFloat((balanceCL + balanceSL).toFixed(1));

  return {
    accrualStartMon,   // for transparency
    monthsWorked,
    accruedCL,
    accruedSL,
    usedCL,
    usedSL,
    balanceCL,
    balanceSL,
    totalAccruedBalance,
    totalBalance,
    approvedLeaves,     // full list of this year's approved leave entries (for display)
  };
}

function zeroBalance() {
  return {
    accrualStartMon: 0,
    monthsWorked:    0,
    accruedCL:       0,
    accruedSL:       0,
    usedCL:          0,
    usedSL:          0,
    balanceCL:       0,
    balanceSL:       0,
    totalAccruedBalance: 0,
    totalBalance:    0,
    approvedLeaves:  [],
  };
}

/* ══════════════════════════════════════════════════════════
   PUBLIC HOLIDAYS
   (add/remove dates here to keep in sync with the frontend)
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
   GET /api/payroll/employees
   ══════════════════════════════════════════════════════════ */
exports.getAllPayrollEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, employee_code, name, department, designation, salary, join_date
      FROM employees
      WHERE LOWER(status) = 'active' OR status IS NULL
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("getAllPayrollEmployees:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/payroll/employee/:id
   ══════════════════════════════════════════════════════════ */
exports.getPayrollEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const byCode = isNaN(Number(id));
    const { rows } = await pool.query(
      byCode
        ? `SELECT * FROM employees WHERE employee_code = $1 LIMIT 1`
        : `SELECT * FROM employees WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Employee not found" });

    const e   = rows[0];
    const sal = calcSalary(e.salary);

    const BANKS = {
      HDFC: "HDFC Bank",     SBIN: "State Bank of India",
      ICIC: "ICICI Bank",    UTIB: "Axis Bank",
      KKBK: "Kotak Bank",    BARB: "Bank of Baroda",
      PUNB: "Punjab National Bank",
      CNRB: "Canara Bank",   IOBA: "Indian Overseas Bank",
    };
    const prefix   = (e.ifsc || "").slice(0, 4).toUpperCase();
    const bankName = BANKS[prefix] || prefix || "—";

    // PAN is stored as a gov_id entry (gov_id_type = 'pan'); fall back to
    // showing whatever gov ID is on file, labeled by its actual type.
    const pan = (e.gov_id_type || "").toLowerCase() === "pan"
      ? (e.gov_id_number || "—")
      : "—";

    res.json({
      employee: {
        id:              e.id,
        employee_code:   e.employee_code || "—",
        name:            e.name,
        email:           e.email,
        department:      e.department    || "—",
        designation:     e.designation   || "—",
        location:        e.work_location || "—",
        employment_type: e.employment_type || "—",
        bankName,
        bankAccNo:       e.account_no    || "—",
        ifsc:            e.ifsc          || "—",
        gov_id_type:     e.gov_id_type   || "—",
        gov_id_number:   e.gov_id_number || "—",
        pan,
        band:            e.band  || "—",
        level:           e.level || "—",
        pfNo:            e.pf_no || "—",
        join_date:       e.join_date,
        status:          e.status,
        user_id:         e.user_id,
        monthlySalary:   sal.monthlySalary,
        annualCTC:       sal.annualCTC,
      },
      salary: sal,
    });
  } catch (err) {
    console.error("getPayrollEmployee:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ══════════════════════════════════════════════════════════
   PATCH /api/payroll/employee/:id/payslip-details
   Body: { band, level, pf_no }
   Lets HR fill in the payslip-only fields (Band / Level / PF No.)
   directly from the Payroll page without touching the full
   employee onboarding form.
   ══════════════════════════════════════════════════════════ */
exports.updatePayslipDetails = async (req, res) => {
  const { id } = req.params;
  const { band, level, pf_no } = req.body || {};

  try {
    const byCode = isNaN(Number(id));
    const result = await pool.query(
      byCode
        ? `UPDATE employees SET
             band  = COALESCE($1, band),
             level = COALESCE($2, level),
             pf_no = COALESCE($3, pf_no)
           WHERE employee_code = $4
           RETURNING id, employee_code, band, level, pf_no`
        : `UPDATE employees SET
             band  = COALESCE($1, band),
             level = COALESCE($2, level),
             pf_no = COALESCE($3, pf_no)
           WHERE id = $4
           RETURNING id, employee_code, band, level, pf_no`,
      [band ?? null, level ?? null, pf_no ?? null, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("updatePayslipDetails:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

/* ══════════════════════════════════════════════════════════
   GET /api/payroll/attendance/:id?month=YYYY-MM
   ══════════════════════════════════════════════════════════ */
exports.getPayrollAttendance = async (req, res) => {
  const { id }    = req.params;
  const { month } = req.query;
  if (!month) return res.status(400).json({ message: "month query param required (YYYY-MM)" });

  try {
    const [yr, mo] = month.split("-");
    const startDate = `${yr}-${mo.padStart(2, "0")}-01`;
    const lastDay   = new Date(Number(yr), Number(mo), 0).getDate();
    const endDate   = `${yr}-${mo.padStart(2, "0")}-${lastDay}`;

    // ── Resolve employee ──────────────────────────────────────
    const byCode = isNaN(Number(id));
    const empRow = await pool.query(
      byCode
        ? `SELECT id, user_id, join_date, salary FROM employees WHERE employee_code = $1 LIMIT 1`
        : `SELECT id, user_id, join_date, salary FROM employees WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!empRow.rows.length) return res.status(404).json({ message: "Employee not found" });

    const empId        = empRow.rows[0].id;
    const userId       = empRow.rows[0].user_id;
    const joinDate     = empRow.rows[0].join_date;
    const monthlySalary = Number(empRow.rows[0].salary || 0);

    // ── Guard: month before join date → return empty ──────────
    if (joinDate) {
      const jd = new Date(joinDate);
      const [cy, cm] = month.split("-").map(Number);
      const beforeJoin =
        cy < jd.getFullYear() ||
        (cy === jd.getFullYear() && cm < jd.getMonth() + 1);
      if (beforeJoin) {
        return res.json({
          workingDays: 0, daysPayable: 0, lop: 0,
          lopFromAbsent: 0, lopFromLeave: 0,
          lopDeduction: 0, lopPrevMonth: 0, holidayCount: 0,
          counts: {}, dailyMap: {},
          leaveBalance: zeroBalance(),
        });
      }
    }

    // ── Attendance records ────────────────────────────────────
    // attendance.employee_id stores users.id.
    // Try userId first; if null or returns no rows, fall back to empId
    // (handles edge cases where user_id is not yet linked).
    let attRows = [];
    const attQuery = `SELECT date, status FROM attendance
       WHERE employee_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC`;

    if (userId) {
      const att = await pool.query(attQuery, [userId, startDate, endDate]);
      attRows = att.rows;
    }
    // Fallback: if no rows found via userId (or userId is null), try employees.id
    if (!attRows.length) {
      const att2 = await pool.query(attQuery, [empId, startDate, endDate]);
      attRows = att2.rows;
    }

    const dailyMap = {};
    attRows.forEach((r) => {
      const ds = r.date instanceof Date
        ? r.date.toISOString().slice(0, 10)
        : String(r.date).slice(0, 10);
      dailyMap[ds] = (r.status || "").toLowerCase();
    });

    // ── Mark approved leaves in dailyMap ─────────────────────
    // Overlap check (not strict containment) so a leave spanning a
    // month boundary still shows up in every month it touches.
    const leaveRows = await pool.query(
      `SELECT from_date, to_date FROM leaves
       WHERE employee_id = $1 AND status = 'Approved'
         AND from_date <= $3 AND to_date >= $2`,
      [empId, startDate, endDate]
    );
    leaveRows.rows.forEach((l) => {
      const monthStartD = new Date(`${startDate}T00:00:00`);
      const monthEndD   = new Date(`${endDate}T00:00:00`);
      const leaveFrom   = new Date(l.from_date);
      const leaveTo     = new Date(l.to_date);
      const cur = leaveFrom < monthStartD ? monthStartD : leaveFrom;
      const end = leaveTo   > monthEndD   ? monthEndD   : leaveTo;
      while (cur <= end) {
        const ds = cur.toISOString().slice(0, 10);
        dailyMap[ds] = "leave";
        cur.setDate(cur.getDate() + 1);
      }
    });

    // ── Effective employment window within this month ─────────
    // Bounded by the employee's join date (can't have "working days"
    // before they joined) and by today (a future/current month can't
    // have working days that haven't happened yet).
    const today        = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStartD  = new Date(`${startDate}T00:00:00`);
    const monthEndD    = new Date(`${endDate}T00:00:00`);
    const joinDateObj  = joinDate ? new Date(joinDate) : null;
    const rangeStart   = joinDateObj && joinDateObj > monthStartD ? joinDateObj : monthStartD;
    const rangeEnd     = today < monthEndD ? today : monthEndD;

    // ── Count working days (Mon–Sat, excluding public holidays) ─
    // Counted over the SAME window used below to fill/count
    // attendance, so "Working Days" always equals the sum of
    // present + late + half day + leave + absent + wfh.
    let workingDays  = 0;
    let holidayCount = 0;
    const cur  = new Date(rangeStart);
    const endD = rangeEnd;

    while (cur <= endD) {
      const ds  = cur.toISOString().slice(0, 10);
      const dow = cur.getDay();
      if (HOLIDAYS.has(ds))   holidayCount++;
      else if (dow !== 0)     workingDays++;   // Sunday = 0, excluded
      cur.setDate(cur.getDate() + 1);
    }

    // ── Leave balance for this month (no cross-year carry-forward) ─
    const leaveBalance = await calcLeaveBalance(empId, month);

    // ── Fill in missing days as "Absent" ───────────────────────
    // Mirrors the HR Attendance page: any working day with no punch
    // record (and no approved leave) is treated as Absent, not
    // silently skipped. Bounded by the same employment window above.
    const fillCur = new Date(rangeStart);
    fillCur.setHours(0, 0, 0, 0);
    while (fillCur <= rangeEnd) {
      const ds  = fillCur.toISOString().slice(0, 10);
      const dow = fillCur.getDay();
      if (!HOLIDAYS.has(ds) && dow !== 0 && !dailyMap[ds]) {
        dailyMap[ds] = "absent";
      }
      fillCur.setDate(fillCur.getDate() + 1);
    }

    // ── Count attendance statuses from dailyMap ───────────────
    const counts = { present: 0, late: 0, leave: 0, halfday: 0, absent: 0, wfh: 0 };
    Object.entries(dailyMap).forEach(([ds, s]) => {
      // Only count days that are actual working days.
      // IMPORTANT: parse with an explicit local-time component
      // ("...T00:00:00"), NOT a bare date string. A bare "YYYY-MM-DD"
      // string is parsed as UTC midnight per the JS spec, while every
      // other date in this file is built/compared as LOCAL midnight —
      // on a server whose timezone sits behind UTC that mismatch
      // silently shifts every date back a day, turning Mondays into
      // "Sunday" and dropping them from every bucket below.
      const d   = new Date(`${ds}T00:00:00`);
      const dow = d.getDay();
      if (HOLIDAYS.has(ds) || dow === 0) return; // skip holidays & Sundays

      if      (s === "present" || s === "on time") counts.present++;
      else if (s === "late")                        counts.late++;
      else if (s.includes("half"))                  counts.halfday++;
      else if (s === "leave")                       counts.leave++;
      else if (s === "absent")                      counts.absent++;
      else if (s === "wfh")                         counts.wfh++;
    });

    // ── LOP CALCULATION ───────────────────────────────────────
    // Policy: ONLY "Absent" and "Unpaid Leave" (leave taken beyond the
    // accrued CL/SL balance) reduce pay. Every other status — Present,
    // Late, Half Day, WFH, and Leave that's covered by the accrued
    // balance — is treated as a fully paid day, exactly like Present.
    //
    // Half Day in particular is NOT docked or treated as 0.5 day of
    // leave consumption; it's paid in full, same as a normal Present day.
    //
    // Absent days ALWAYS cause a pay deduction, regardless of leave
    // balance — an unauthorized absence is never covered by CL/SL.
    //
    // Leave draws from the accrued CL/SL balance first; only the portion
    // that exceeds the balance becomes Leave-Without-Pay and is deducted.
    //
    //   leaveConsumed  = leaveDays
    //   lopFromLeave   = max(0, leaveConsumed − totalAccruedBalance)   [LWP]
    //   lopFromAbsent  = absentDays                                    [always deducted]
    //   lopDays        = lopFromLeave + lopFromAbsent
    //   lopDeduction   = (monthlySalary ÷ workingDays) × lopDays

    const leaveConsumed = parseFloat(counts.leave.toFixed(2));

    const lopFromLeave = Math.max(
      0,
      parseFloat((leaveConsumed - leaveBalance.totalAccruedBalance).toFixed(2))
    );

    const lopFromAbsent = counts.absent;

    const lopDays = parseFloat((lopFromAbsent + lopFromLeave).toFixed(2));

    const lopDeduction = workingDays > 0
      ? Math.round((monthlySalary / workingDays) * lopDays)
      : 0;

    const daysPayable = Math.max(0, workingDays - lopDays);

    res.json({
      workingDays,
      daysPayable,
      lop:          lopDays,
      lopFromAbsent,
      lopFromLeave,
      lopDeduction,
      lopPrevMonth: 0,
      holidayCount,
      counts,
      dailyMap,
      leaveBalance,
    });
  } catch (err) {
    console.error("getPayrollAttendance:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};