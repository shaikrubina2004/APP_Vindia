import { useState } from "react";
import "./Payroll.css";

function Payroll() {

  const [empId, setEmpId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [employee, setEmployee] = useState({
    name: "", id: "", dept: "", designation: "",
    pan: "", band: "", level: "", location: "",
    bankName: "", bankAccNo: "", pfNo: "",
    workingDays: 0, daysPayable: 0, lop: 0, lopPrevMonth: 0
  });

  const [calendar, setCalendar] = useState([]);

  const holidays2026 = [
    "2026-01-01","2026-01-26","2026-01-15","2026-03-19",
    "2026-04-15","2026-05-01","2026-08-26","2026-09-14",
    "2026-10-20","2026-12-25",
  ];

  const [stats, setStats] = useState({
    present: 0, late: 0, leave: 0, holiday: 0, halfday: 0
  });

  const [salary, setSalary] = useState({
    basicPay: 0, hra: 0, specialAllowance: 0, lta: 0,
    domesticOnsiteAll: 0, exgratiaBonus: 0, shiftAllowance: 0,
    variablePay: 0, medicalInsurance: 0,
    pf: 0, profTax: 0, incomeTax: 0,
    latePenalty: 0, leaveDeduction: 0,
    annualCTC: 0
  });

  /* EMPLOYEE DATABASE */
  const employees = {
    EMP001: {
      name: "John Doe", dept: "HR", designation: "Unit Mgr - Specialization",
      pan: "BINPS9852C", band: "Band 4", level: "Level 6",
      location: "BANGALORE", bankName: "HDFC", bankAccNo: "50100026287171",
      pfNo: "PYBOM00165730000096306", workingDays: 31, daysPayable: 31, lop: 0, lopPrevMonth: 0,
      attendance: { present: 14, late: 5, leave: 3, halfday: 3, holiday: 6 },
      salary: {
        basicPay: 16197, hra: 8099, specialAllowance: 1944, lta: 0,
        domesticOnsiteAll: 1200, exgratiaBonus: 10800, shiftAllowance: 800,
        variablePay: 2000, medicalInsurance: 960,
        pf: 4800, profTax: 200, incomeTax: 15877,
        latePenalty: 200, leaveDeduction: 1000,
        annualCTC: 480000
      }
    },
    EMP002: {
      name: "Jane Smith", dept: "Finance", designation: "Accountant",
      pan: "ABCDE1234F", band: "Band 3", level: "Level 5",
      location: "MUMBAI", bankName: "SBI", bankAccNo: "32145678901",
      pfNo: "PYMUM00987650000012345", workingDays: 30, daysPayable: 29, lop: 1, lopPrevMonth: 0,
      attendance: { present: 18, late: 2, leave: 1, halfday: 2, holiday: 7 },
      salary: {
        basicPay: 11200, hra: 5600, specialAllowance: 1344, lta: 0,
        domesticOnsiteAll: 0, exgratiaBonus: 7560, shiftAllowance: 0,
        variablePay: 1500, medicalInsurance: 960,
        pf: 3200, profTax: 200, incomeTax: 9800,
        latePenalty: 150, leaveDeduction: 800,
        annualCTC: 336000
      }
    },
    EMP003: {
      name: "Alex Brown", dept: "IT", designation: "Developer",
      pan: "FGHIJ5678K", band: "Band 5", level: "Level 7",
      location: "HYDERABAD", bankName: "ICICI", bankAccNo: "012345678901",
      pfNo: "PYHYD00112340000078901", workingDays: 31, daysPayable: 31, lop: 0, lopPrevMonth: 0,
      attendance: { present: 20, late: 3, leave: 2, halfday: 1, holiday: 5 },
      salary: {
        basicPay: 23333, hra: 11667, specialAllowance: 2800, lta: 0,
        domesticOnsiteAll: 2000, exgratiaBonus: 15750, shiftAllowance: 1200,
        variablePay: 3000, medicalInsurance: 960,
        pf: 4200, profTax: 200, incomeTax: 22500,
        latePenalty: 100, leaveDeduction: 500,
        annualCTC: 700000
      }
    }
  };

  const searchEmployee = () => {
    if (!employees[empId]) { alert("Employee not found"); return; }
    if (!selectedMonth) { alert("Please select a month"); return; }
    const [year, month] = selectedMonth.split("-");
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const emp = employees[empId];
    setEmployee({ id: empId, ...emp });
    setSalary(emp.salary);
    generateMiniCalendar(emp.attendance, firstDay, lastDay);
  };

  const generateMiniCalendar = (attendanceData, start, end) => {
    let days = [];
    let statusPool = [];
    Object.keys(attendanceData).forEach((status) => {
      if (status !== "holiday") {
        for (let i = 0; i < attendanceData[status]; i++) statusPool.push(status);
      }
    });
    let startWeekDay = start.getDay();
    startWeekDay = startWeekDay === 0 ? 6 : startWeekDay - 1;
    for (let i = 0; i < startWeekDay; i++) days.push({ label: "", status: "empty" });
    let index = 0, holidayCount = 0;
    let current = new Date(start);
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      let status;
      if (holidays2026.includes(dateStr)) { status = "holiday"; holidayCount++; }
      else { status = statusPool[index] || "present"; index++; }
      days.push({ label: current.getDate(), status });
      current.setDate(current.getDate() + 1);
    }
    setCalendar(days);
    let newStats = { present: 0, late: 0, leave: 0, halfday: 0, holiday: holidayCount };
    days.forEach(day => {
      if (day.status !== "empty" && day.status !== "holiday") newStats[day.status]++;
    });
    setStats(newStats);
  };

  const approvePayment = () => alert("Payslip Approved & Sent to Employee");

  /* SALARY CALCULATIONS */
  const totalEarnings =
    salary.basicPay + salary.hra + salary.specialAllowance +
    (salary.lta || 0) + salary.domesticOnsiteAll +
    salary.exgratiaBonus + salary.shiftAllowance + salary.variablePay;

  const totalDeductions =
    salary.pf + salary.profTax + salary.incomeTax +
    salary.latePenalty + salary.leaveDeduction;

  const netSalary = totalEarnings - totalDeductions + (salary.medicalInsurance || 0) - (salary.medicalInsurance || 0);
  const netPay = totalEarnings - totalDeductions;

  /* ANNUAL SALARY STRUCTURE */
  const annualCTC = salary.annualCTC || 0;
  const salaryStructure = annualCTC > 0 ? [
    { label: "Basic", monthly: salary.basicPay, annual: salary.basicPay * 12, pct: "40%" },
    { label: "House Rent Allowance", monthly: salary.hra, annual: salary.hra * 12, pct: "20%" },
    { label: "Leave Travel Allowance", monthly: "NA", annual: "NA", pct: "" },
    { label: "Special Allowance", monthly: salary.specialAllowance, annual: salary.specialAllowance * 12, pct: "5%" },
    { label: "Ex-Gratia Bonus", monthly: salary.exgratiaBonus, annual: salary.exgratiaBonus * 12, pct: "27%" },
  ] : [];

  const targetFixedCash = salary.basicPay + salary.hra + salary.specialAllowance + salary.exgratiaBonus;
  const targetCashComp = targetFixedCash + salary.variablePay;
  const targetCTC = targetCashComp + salary.medicalInsurance;

  const fmt = (v) => typeof v === 'number' ? v.toLocaleString('en-IN') : v;

  return (
    <div className="hr-page-wrapper">
      <div className="container">

        <div className="header">
          <h1>Payroll</h1>
        </div>

        {/* SEARCH SECTION */}
        <div className="search-section">
          <div className="search-grid">
            <input type="text" placeholder="Employee ID (EMP001)" value={empId} onChange={(e) => setEmpId(e.target.value)} />
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            <button onClick={searchEmployee}>Search Employee</button>
          </div>
        </div>

        <div className="dashboard">

          {/* LEFT CARD */}
          <div className="card">

            <h2>Employee Details</h2>
            <div className="employee-card">
              <div className="emp-grid-2col">
                <div>
                  <div className="emp-row"><span className="emp-label">Name</span><span>{employee.name || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Employee No</span><span>{employee.id || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Designation</span><span>{employee.designation || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Band</span><span>{employee.band || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Level</span><span>{employee.level || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Location</span><span>{employee.location || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Bank Name</span><span>{employee.bankName || "—"}</span></div>
                </div>
                <div>
                  <div className="emp-row"><span className="emp-label">PAN</span><span>{employee.pan || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Working Days</span><span>{employee.workingDays || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Days Payable</span><span>{employee.daysPayable || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">PF No.</span><span className="pf-no">{employee.pfNo || "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">LOP</span><span>{employee.lop ?? "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">LOP Prev Month</span><span>{employee.lopPrevMonth ?? "—"}</span></div>
                  <div className="emp-row"><span className="emp-label">Bank Acc No</span><span>{employee.bankAccNo || "—"}</span></div>
                </div>
              </div>
            </div>

            <h3 className="section-title">Attendance</h3>
            <div className="attendance-stats">
              <div className="stat-card present"><span>Present</span><strong>{stats.present}</strong></div>
              <div className="stat-card late"><span>Late</span><strong>{stats.late}</strong></div>
              <div className="stat-card halfday"><span>Half Days</span><strong>{stats.halfday}</strong></div>
              <div className="stat-card leave"><span>Leaves</span><strong>{stats.leave}</strong></div>
              <div className="stat-card holiday"><span>Holidays</span><strong>{stats.holiday}</strong></div>
            </div>

            {calendar.length > 0 && (
              <>
                <h3 className="section-title">Calendar</h3>
                <div className="calendar">
                  <div className="calendar-grid">
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day,i) => (
                      <div key={i} className="calendar-header">{day}</div>
                    ))}
                    {calendar.map((day,index) => (
                      <div key={index} className={`calendar-day ${day.status}`}>
                        {day.status !== "empty" ? day.label : ""}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT CARD */}
          <div className="card">

            <h2>Salary Breakdown</h2>

            {/* PAYSLIP HEADER TABLE */}
            <div className="payslip-title">Pay Slip for {selectedMonth ? new Date(selectedMonth + "-01").toLocaleString('default',{month:'long',year:'numeric'}) : "—"}</div>

            {/* EARNINGS & DEDUCTIONS SIDE BY SIDE */}
            <div className="earnings-deductions-grid">

              <div className="ed-section">
                <div className="ed-header">Earnings</div>
                <div className="ed-table">
                  {[
                    ["Basic Pay", salary.basicPay],
                    ["House Rent Allowance", salary.hra],
                    ["Special Allowance", salary.specialAllowance],
                    ["Leave Travel Allowance", salary.lta || "NA"],
                    ["Domestic Onsite All", salary.domesticOnsiteAll],
                    ["EXGRATIA/BONUS", salary.exgratiaBonus],
                    ["Shift Allowance", salary.shiftAllowance],
                    ["Variable Pay", salary.variablePay],
                  ].map(([label, val], i) => (
                    <div className="ed-row" key={i}>
                      <span>{label}</span>
                      <span className="ed-amt">{val === "NA" ? "NA" : val ? `₹${fmt(val)}` : "—"}</span>
                    </div>
                  ))}
                  <div className="ed-row ed-total">
                    <strong>Total Earnings</strong>
                    <strong className="amount">₹{fmt(totalEarnings)}</strong>
                  </div>
                </div>
              </div>

              <div className="ed-section">
                <div className="ed-header">Deductions</div>
                <div className="ed-table">
                  {[
                    ["Provident Fund", salary.pf],
                    ["Prof Tax", salary.profTax],
                    ["Income Tax", salary.incomeTax],
                    ["Late Penalty", salary.latePenalty],
                    ["Leave Deduction", salary.leaveDeduction],
                  ].map(([label, val], i) => (
                    <div className="ed-row" key={i}>
                      <span>{label}</span>
                      <span className="ed-amt deduction-amt">{val ? `₹${fmt(val)}` : "—"}</span>
                    </div>
                  ))}
                  <div className="ed-row ed-total">
                    <strong>Total Deductions</strong>
                    <strong className="amount deduction">₹{fmt(totalDeductions)}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* NET SALARY */}
            <div className="net-salary-bar">
              <span>Net Salary</span>
              <span className="net-amount">₹{fmt(netPay)}</span>
            </div>

            {/* ANNUAL CTC STRUCTURE */}
            {annualCTC > 0 && (
              <>
                <h3 className="section-title" style={{marginTop:'18px'}}>Annual CTC Structure</h3>
                <div className="ctc-table-wrap">
                  <table className="ctc-table">
                    <thead>
                      <tr>
                        <th>Salary</th>
                        <th colSpan={3} className="ctc-main-val">₹{fmt(annualCTC)}</th>
                      </tr>
                      <tr className="ctc-subhead">
                        <th></th>
                        <th>1 Month</th>
                        <th>12 Months</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryStructure.map(({ label, monthly, annual, pct }, i) => (
                        <tr key={i}>
                          <td>{label}</td>
                          <td>{monthly === "NA" ? "NA" : monthly ? fmt(monthly) : "—"}</td>
                          <td>{annual === "NA" ? "NA" : annual ? fmt(annual) : "—"}</td>
                          <td>{pct}</td>
                        </tr>
                      ))}
                      <tr className="ctc-subtotal">
                        <td><strong>TOTAL FIXED CASH</strong></td>
                        <td><strong>{fmt(targetFixedCash)}</strong></td>
                        <td><strong>{fmt(targetFixedCash * 12)}</strong></td>
                        <td><strong>93%</strong></td>
                      </tr>
                      <tr>
                        <td>Variable Pay</td>
                        <td>{fmt(salary.variablePay)}</td>
                        <td>{fmt(salary.variablePay * 12)}</td>
                        <td>5%</td>
                      </tr>
                      <tr className="ctc-subtotal">
                        <td><strong>TARGET CASH COMPENSATION</strong></td>
                        <td><strong>{fmt(targetCashComp)}</strong></td>
                        <td><strong>{fmt(targetCashComp * 12)}</strong></td>
                        <td><strong>98%</strong></td>
                      </tr>
                      <tr>
                        <td>Medical Insurance Premium</td>
                        <td>{fmt(salary.medicalInsurance)}</td>
                        <td>{fmt(salary.medicalInsurance * 12)}</td>
                        <td>2%</td>
                      </tr>
                      <tr className="ctc-total-row">
                        <td><strong>TARGET COST TO COMPANY</strong></td>
                        <td><strong>{fmt(targetCTC)}</strong></td>
                        <td><strong>{fmt(annualCTC)}</strong></td>
                        <td><strong>100%</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <button onClick={approvePayment} className="approve-btn" style={{marginTop:'16px'}}>
              Approve & Send Payslip
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Payroll;