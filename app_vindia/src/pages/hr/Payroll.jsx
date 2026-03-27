import { useState } from "react";
import "./Payroll.css";

function Payroll() {

  const [empId, setEmpId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [employee, setEmployee] = useState({
    name: "",
    id: "",
    dept: "",
    designation: ""
  });

  const [calendar, setCalendar] = useState([]);

  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    leave: 0,
    holiday: 0,
    halfday: 0
  });

  const [salary, setSalary] = useState({
    basic: 0,
    allowance: 0,
    overtime: 0,
    bonus: 0,
    tax: 0,
    latePenalty: 0,
    leaveDeduction: 0
  });

  /* EMPLOYEE DATABASE */

  const employees = {

    EMP001: {
      name: "John Doe",
      dept: "HR",
      designation: "Manager",

      attendance: {
        present: 14,
        late: 5,
        leave: 3,
        halfday: 3,
        holiday: 6
      },

      salary: {
        basic: 30000,
        allowance: 5000,
        overtime: 1200,
        bonus: 2000,
        tax: 2000,
        pf: 3600,
        latePenalty: 200,
        leaveDeduction: 1000
      }
    },

    EMP002: {
      name: "Jane Smith",
      dept: "Finance",
      designation: "Accountant",

      attendance: {
        present: 18,
        late: 2,
        leave: 1,
        halfday: 2,
        holiday: 7
      },

      salary: {
        basic: 28000,
        allowance: 4000,
        overtime: 900,
        bonus: 1500,
        tax: 1800,
        pf: 3200,
        latePenalty: 150,
        leaveDeduction: 800
      }
    },

    EMP003: {
      name: "Alex Brown",
      dept: "IT",
      designation: "Developer",

      attendance: {
        present: 20,
        late: 3,
        leave: 2,
        halfday: 1,
        holiday: 5
      },

      salary: {
        basic: 35000,
        allowance: 6000,
        overtime: 2000,
        bonus: 2500,
        tax: 2500,
        pf: 4200,
        latePenalty: 100,
        leaveDeduction: 500
      }
    }

  };

  const searchEmployee = () => {

    if (!employees[empId]) {
      alert("Employee not found");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select start and end date");
      return;
    }

    const emp = employees[empId];

    setEmployee({
      id: empId,
      name: emp.name,
      dept: emp.dept,
      designation: emp.designation
    });

    setSalary(emp.salary);

    generateMiniCalendar(emp.attendance);
  };

  const generateMiniCalendar = (attendanceData) => {

    const start = new Date(startDate);
    const end = new Date(endDate);

    let days = [];
    let counts = { ...attendanceData };

    let startWeekDay = start.getDay();
    startWeekDay = startWeekDay === 0 ? 6 : startWeekDay - 1;

    for (let i = 0; i < startWeekDay; i++) {
      days.push({ label: "", status: "empty" });
    }

    let statusPool = [];

    Object.keys(attendanceData).forEach(status => {
      for (let i = 0; i < attendanceData[status]; i++) {
        statusPool.push(status);
      }
    });

    let index = 0;
    let current = new Date(start);

    while (current <= end) {

      const dayNum = current.getDate();
      let status = statusPool[index] || "present";

      days.push({
        label: dayNum,
        status
      });

      index++;

      current.setDate(current.getDate() + 1);
    }

    setCalendar(days);
    setStats(counts);
  };

  const approvePayment = () => {
    alert("Payslip Approved & Sent to Employee");
  };

  /* SALARY CALCULATIONS */

  const grossSalary =
    salary.basic +
    salary.allowance +
    salary.overtime +
    salary.bonus;

  const totalDeductions =
    salary.tax +
    salary.pf +
    salary.latePenalty +
    salary.leaveDeduction;

  const netSalary = grossSalary - totalDeductions;

  return (

    <div className="hr-page-wrapper">

      <div className="container">

        <div className="header">
          <h1>Payroll </h1>
        </div>

        <div className="search-section">

          <div className="search-grid">

            <input
              type="text"
              placeholder="Employee ID (EMP001)"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
            />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <button onClick={searchEmployee}>
               Search Employee
            </button>

          </div>

        </div>

        <div className="dashboard">

          <div className="card">

            <h2>Employee Details</h2>

            <div className="employee-card">

              <div className="emp-row">
                <span className="emp-label">Name</span>
                <span>{employee.name}</span>
              </div>

              <div className="emp-row">
                <span className="emp-label">Employee ID</span>
                <span>{employee.id}</span>
              </div>

              <div className="emp-row">
                <span className="emp-label">Department</span>
                <span>{employee.dept}</span>
              </div>

              <div className="emp-row">
                <span className="emp-label">Designation</span>
                <span>{employee.designation}</span>
              </div>

            </div>

            <h3 className="section-title">Attendance</h3>

            <div className="attendance-stats">

              <div className="stat-card present">
                <span>Present</span>
                <strong>{stats.present}</strong>
              </div>

              <div className="stat-card late">
                <span>Late</span>
                <strong>{stats.late}</strong>
              </div>

              <div className="stat-card leave">
                <span>Leaves</span>
                <strong>{stats.leave}</strong>
              </div>

              <div className="stat-card halfday">
                <span>Half Days</span>
                <strong>{stats.halfday}</strong>
              </div>
               <div className="stat-card holiday">
                <span>Holidays </span>
                <strong>{stats.holiday}</strong>
              </div>
            </div>

            {calendar.length > 0 && (

              <>
                <h3 className="section-title">Calendar</h3>

                <div className="calendar">

                  <div className="calendar-grid">

                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day,i) => (
                      <div key={i} className="calendar-header">
                        {day}
                      </div>
                    ))}

                    {calendar.map((day,index) => (
                      <div
                        key={index}
                        className={`calendar-day ${day.status}`}
                      >
                        {day.status !== "empty" ? day.label : ""}
                      </div>
                    ))}

                  </div>

                </div>

                <div className="legend">

                  <span className="legend-item present">Present</span>
                  <span className="legend-item late">Late</span>
                  <span className="legend-item leave">Leave</span>
                  <span className="legend-item holiday">Holiday</span>
                  <span className="legend-item halfday">Half Day</span>

                </div>

              </>
            )}

          </div>

          <div className="card">

            <h2>Salary Breakdown</h2>

            <div className="payroll-breakdown">

              <div><strong>Basic Salary:</strong> ₹{salary.basic}</div>
              <div><strong>Allowances:</strong> ₹{salary.allowance}</div>
              <div><strong>Overtime:</strong> ₹{salary.overtime}</div>
              <div><strong>Bonus:</strong> ₹{salary.bonus}</div>

              <hr/>

              <div>
                <strong>Gross Salary:</strong>
                <span className="amount"> ₹{grossSalary}</span>
              </div>

            </div>

            <div className="payroll-breakdown">

              <div><strong>Tax:</strong> ₹{salary.tax}</div>
              <div><strong>PF:</strong> ₹{salary.pf}</div>
              <div><strong>Late Penalty:</strong> ₹{salary.latePenalty}</div>
              <div><strong>Leave Deduction:</strong> ₹{salary.leaveDeduction}</div>

              <hr/>

              <div>
                <strong>Total Deductions:</strong>
                <span className="amount deduction"> ₹{totalDeductions}</span>
              </div>

            </div>

            <div className="payroll-breakdown">

              <div>
                <strong>Net Salary:</strong>
                <span className="amount salary"> ₹{netSalary}</span>
              </div>

              <button
                onClick={approvePayment}
                className="approve-btn"
              >
                Approve & Send Payslip
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Payroll;