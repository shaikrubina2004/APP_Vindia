const pool = require("../config/db");

/*
  SALARY BREAKDOWN — from Monthly Salary entered by HR
  ─────────────────────────────────────────────────────
  Monthly Salary (what HR enters) = ₹40,000

  EARNINGS:
    Basic Pay          = 40% of Monthly Salary  → ₹16,000
    HRA                = 20% of Monthly Salary  → ₹8,000
    Special Allowance  =  5% of Monthly Salary  → ₹2,000
    Ex-Gratia / Bonus  = 27% of Monthly Salary  → ₹10,800
    Variable Pay       =  5% of Monthly Salary  → ₹2,000
    Medical Insurance  =  2% of Monthly Salary  → ₹800
    ────────────────────────────────────────────────────
    Total Earnings     = 99% (≈ Monthly Salary after rounding)

  DEDUCTIONS:
    PF         = 12% of Basic Pay (capped at ₹1800)
    Prof Tax   = ₹200 flat
    Income Tax = estimated from annual tax slabs

  Annual CTC = Monthly Salary × 12
*/

function calcSalary(monthlySalary) {
  const m = Math.round(Number(monthlySalary) || 0);

  // ── Earnings ──────────────────────────────────────
  const basic         = Math.round(m * 0.40);
  const hra           = Math.round(m * 0.20);
  const specialAllow  = Math.round(m * 0.05);
  const exGratia      = Math.round(m * 0.27);
  const variablePay   = Math.round(m * 0.05);
  const medical       = Math.round(m * 0.02);

  const totalEarnings = basic + hra + specialAllow + exGratia + variablePay;

  // ── Deductions ────────────────────────────────────
  const pf       = Math.min(Math.round(basic * 0.12), 1800);
  const profTax  = m > 0 ? 200 : 0;

  // Income tax — new regime slabs FY 2025-26
  const annualCTC     = m * 12;
  const annualTaxable = annualCTC - (pf * 12) - (profTax * 12) - 50000; // std deduction ₹50k
  let annualTax = 0;
  if      (annualTaxable > 1500000) annualTax = 275000 + (annualTaxable - 1500000) * 0.30;
  else if (annualTaxable > 1200000) annualTax = 175000 + (annualTaxable - 1200000) * 0.20;
  else if (annualTaxable > 900000)  annualTax =  60000 + (annualTaxable -  900000) * 0.15;
  else if (annualTaxable > 600000)  annualTax =  30000 + (annualTaxable -  600000) * 0.10; // corrected slab
  else if (annualTaxable > 300000)  annualTax =           (annualTaxable -  300000) * 0.05;
  const incomeTax = Math.max(0, Math.round(annualTax / 12));

  const totalDeductions = pf + profTax + incomeTax;
  const netSalary       = totalEarnings - totalDeductions;

  // ── CTC summary rows ──────────────────────────────
  const totalFixedCash = basic + hra + specialAllow + exGratia;
  const targetCashComp = totalFixedCash + variablePay;
  const targetCTC      = targetCashComp + medical;   // ≈ monthly salary

  return {
    // earnings
    basic, hra, specialAllow, exGratia, variablePay, medical,
    totalEarnings,
    // deductions
    pf, profTax, incomeTax,
    totalDeductions,
    // net
    netSalary,
    // CTC rows
    totalFixedCash, targetCashComp, targetCTC,
    // annual
    annualCTC,
    monthlySalary: m,
  };
}

/* ════════════════════════════════════════════
   GET /api/payroll/employees
   All active employees for search dropdown
════════════════════════════════════════════ */
exports.getAllPayrollEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, employee_code, name, department, designation, salary
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

/* ════════════════════════════════════════════
   GET /api/payroll/employee/:id
   Employee details + full salary breakdown
   :id can be numeric DB id OR employee_code
════════════════════════════════════════════ */
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

    // Derive bank name from first 4 chars of IFSC
    const BANKS = {
      HDFC:"HDFC Bank", SBIN:"State Bank of India", ICIC:"ICICI Bank",
      UTIB:"Axis Bank", KKBK:"Kotak Bank", BARB:"Bank of Baroda",
      PUNB:"Punjab National Bank", CNRB:"Canara Bank", IOBA:"Indian Overseas Bank",
    };
    const prefix   = (e.ifsc || "").slice(0, 4).toUpperCase();
    const bankName = BANKS[prefix] || prefix || "—";

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

/* ════════════════════════════════════════════
   GET /api/payroll/attendance/:id?month=YYYY-MM
   Real attendance from DB for the month
════════════════════════════════════════════ */
exports.getPayrollAttendance = async (req, res) => {
  const { id }    = req.params;
  const { month } = req.query;
  if (!month) return res.status(400).json({ message: "month query param required (YYYY-MM)" });

  try {
    const [yr, mo]  = month.split("-");
    const startDate = `${yr}-${mo.padStart(2,"0")}-01`;
    const lastDay   = new Date(Number(yr), Number(mo), 0).getDate();
    const endDate   = `${yr}-${mo.padStart(2,"0")}-${lastDay}`;

    // attendance uses users.id not employees.id
    const byCode = isNaN(Number(id));
const empRow = await pool.query(
  byCode
    ? `SELECT user_id FROM employees WHERE employee_code = $1 LIMIT 1`
    : `SELECT user_id FROM employees WHERE id = $1 LIMIT 1`,
  [id]
);
    if (!empRow.rows.length) return res.status(404).json({ message: "Employee not found" });

    const userId = empRow.rows[0].user_id;
    let rows = [];
    if (userId) {
      const att = await pool.query(
        `SELECT date, status FROM attendance
         WHERE employee_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC`,
        [userId, startDate, endDate]
      );
      rows = att.rows;
    }

    // Build date → status map
    const dailyMap = {};
    rows.forEach(r => {
      const ds = r.date instanceof Date
        ? r.date.toISOString().slice(0,10)
        : String(r.date).slice(0,10);
      dailyMap[ds] = (r.status || "").toLowerCase();
    });

    // Public holidays
    const HOLIDAYS = new Set([
      "2024-01-26","2024-08-15","2024-10-02","2024-12-25",
      "2025-01-01","2025-01-14","2025-01-26","2025-03-17",
      "2025-04-14","2025-05-01","2025-08-15","2025-10-02","2025-12-25",
      "2026-01-01","2026-01-15","2026-01-26","2026-03-19",
      "2026-04-15","2026-05-01","2026-08-26","2026-09-14",
      "2026-10-20","2026-12-25",
    ]);

    let workingDays = 0, holidayCount = 0;
    const cur = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (cur <= end) {
      const ds  = cur.toISOString().slice(0,10);
      const dow = cur.getDay();
      if (HOLIDAYS.has(ds))  { holidayCount++; }
      else if (dow !== 0)    { workingDays++; }   // Mon–Sat
      cur.setDate(cur.getDate() + 1);
    }

    // Count statuses
    const counts = { present:0, late:0, leave:0, halfday:0, absent:0, wfh:0 };
    Object.values(dailyMap).forEach(s => {
      if      (s === "present" || s === "on time") counts.present++;
      else if (s === "late")                        counts.late++;
      else if (s.includes("half"))                  counts.halfday++;
      else if (s === "leave" || s.includes("approved")) counts.leave++;
      else if (s === "absent")                      counts.absent++;
      else if (s === "wfh")                         counts.wfh++;
    });

    const lop         = counts.absent;
    const daysPayable = Math.max(0, workingDays - lop);

    res.json({ workingDays, daysPayable, lop, lopPrevMonth: 0, holidayCount, counts, dailyMap });
  } catch (err) {
    console.error("getPayrollAttendance:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};