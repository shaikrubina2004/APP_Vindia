import { useState, useEffect } from "react";
import "./Leaves.css";

function Leaves() {
  const salaryPerDay = 1000;

  const maxTotalLeaves = 12;
  const maxSickLeaves = 6;

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [message, setMessage] = useState("");

  const [leaves, setLeaves] = useState([
    // ===== TODAY =====
    { name: "Ravi", type: "Sick Leave", date: "2026-03-24", status: "Pending", reason: "Fever", joiningDate: "2026-02-01" },
    { name: "Meena", type: "Casual Leave", date: "2026-03-24", status: "Pending", reason: "Function", joiningDate: "2026-02-01" },
    { name: "Arjun", type: "Casual Leave", date: "2026-03-24", status: "Pending", reason: "Personal", joiningDate: "2026-01-01" },

    // ===== RAVI =====
    { name: "Ravi", type: "Casual Leave", date: "2026-02-10", status: "Approved", joiningDate: "2026-02-01" },
    { name: "Ravi", type: "Sick Leave", date: "2026-02-05", status: "Approved", joiningDate: "2026-02-01" },
    { name: "Ravi", type: "Sick Leave", date: "2026-03-02", status: "Approved", joiningDate: "2026-02-01" },
    { name: "Ravi", type: "Sick Leave", date: "2026-03-15", status: "Approved", joiningDate: "2026-02-01" },
    { name: "Ravi", type: "Sick Leave", date: "2026-04-01", status: "Approved", joiningDate: "2026-02-01" },
    { name: "Ravi", type: "Sick Leave", date: "2026-04-10", status: "Approved", joiningDate: "2026-02-01" },
    { name: "Ravi", type: "Sick Leave", date: "2026-05-01", status: "Approved", joiningDate: "2026-02-01" },

    // ===== MEENA =====
    { name: "Meena", type: "Casual Leave", date: "2026-02-05", status: "Approved", joiningDate: "2026-02-01" },
    { name: "Meena", type: "Sick Leave", date: "2026-03-08", status: "Approved", joiningDate: "2026-02-01" },

    // ===== ARJUN =====
    { name: "Arjun", type: "Casual Leave", date: "2026-01-10", status: "Approved", joiningDate: "2026-01-01" },
    { name: "Arjun", type: "Casual Leave", date: "2026-02-12", status: "Approved", joiningDate: "2026-01-01" },
    { name: "Arjun", type: "Sick Leave", date: "2026-02-15", status: "Approved", joiningDate: "2026-01-01" },
  ]);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(t);
    }
  }, [message]);

  // 🔥 MONTHLY VIEW FUNCTION
  const getMonthlyLeaves = (name) => {
    const monthMap = {};

    leaves.forEach(l => {
      if (l.name === name && l.status === "Approved") {
        const d = new Date(l.date);
        const month = d.toLocaleString("default", { month: "short" });
        const year = d.getFullYear();
        const key = `${month} ${year}`;

        if (!monthMap[key]) {
          monthMap[key] = { casual: 0, sick: 0 };
        }

        if (l.type === "Casual Leave") monthMap[key].casual++;
        if (l.type === "Sick Leave") monthMap[key].sick++;
      }
    });

    return monthMap;
  };

  const handleStatusChange = (index, newStatus) => {
    const leave = leaves[index];

    if (newStatus === "Approved") {
      const emp = leaves.filter(
        l => l.name === leave.name && l.status === "Approved"
      );

      // 🔴 Sick limit
      const sickCount = emp.filter(l => l.type === "Sick Leave").length;
      if (leave.type === "Sick Leave" && sickCount >= maxSickLeaves) {
        setMessage("Max 6 Sick Leaves reached");
        return;
      }

      // 🔥 STRICT CASUAL RULE
      if (leave.type === "Casual Leave") {
        const leaveMonth = new Date(leave.date).getMonth();
        const leaveYear = new Date(leave.date).getFullYear();

        const casualThisMonth = leaves.filter(
          l =>
            l.name === leave.name &&
            l.type === "Casual Leave" &&
            l.status === "Approved" &&
            new Date(l.date).getMonth() === leaveMonth &&
            new Date(l.date).getFullYear() === leaveYear
        ).length;

        if (casualThisMonth >= 1) {
          setMessage("Only 1 casual leave allowed per month");
          return;
        }
      }
    }

    setLeaves(prev =>
      prev.map((l, i) =>
        i === index ? { ...l, status: newStatus } : l
      )
    );
  };

  const calculateSummary = (name) => {
    const approved = leaves.filter(
      l => l.name === name && l.status === "Approved"
    );

    return {
      total: approved.length,
      sick: approved.filter(l => l.type === "Sick Leave").length,
      casual: approved.filter(l => l.type === "Casual Leave").length,
      balance: Math.max(maxTotalLeaves - approved.length, 0),
      cut: Math.max(approved.length - maxTotalLeaves, 0) * salaryPerDay
    };
  };

  const summary = selectedEmployee && calculateSummary(selectedEmployee);

  return (
    <div className="leave-page">
      <div className="wrap">

        {message && <div className="popup">{message}</div>}

        <div className="header">
          <h1>HR Leave Dashboard</h1>
          <span className="date">{today}</span>
        </div>

        <div className="card">
          <h2>Today's Leave Requests</h2>

          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
                <th>Summary</th>
              </tr>
            </thead>

            <tbody>
              {leaves.map((l, i) =>
                l.date === today && (
                  <tr key={i}>
                    <td className="emp">{l.name}</td>
                    <td>{l.type}</td>
                    <td>{l.date}</td>

                    <td>
                      <span className={`tag ${l.status.toLowerCase()}`}>
                        {l.status}
                      </span>
                    </td>

                    <td>
                      {l.status === "Pending" && (
                        <>
                          <button onClick={() => handleStatusChange(i, "Approved")}>
                            Approve
                          </button>
                          <button onClick={() => handleStatusChange(i, "Rejected")}>
                            Reject
                          </button>
                        </>
                      )}
                    </td>

                    <td>
                      <button className="view" onClick={() => setSelectedEmployee(l.name)}>
                        View
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>

          {summary && (
            <div className="summary">
              <h3>{selectedEmployee}</h3>

              {/* 🔴 SICK ALERT */}
              {summary.sick >= 6 && (
                <div className="alert-box">
                  ⚠ Employee reached max 6 Sick Leaves
                </div>
              )}

              {/* 🔴 SALARY ALERT */}
              {summary.cut > 0 && (
                <div className="alert-box">
                  ⚠ Salary deduction applied due to extra leaves
                </div>
              )}

              <div className="grid">
                <div><span>Total</span><b>{summary.total}</b></div>

                <div>
                  <span>Sick</span>
                  <b className={summary.sick >= 6 ? "danger-text" : ""}>
                    {summary.sick}
                  </b>
                </div>

                <div><span>Casual</span><b>{summary.casual}</b></div>
                <div><span>Balance</span><b>{summary.balance}</b></div>

                {/* 🔥 SALARY CUT */}
                <div>
                  <span>Salary Cut</span>
                  <b className={summary.cut > 0 ? "danger-text" : ""}>
                    ₹{summary.cut}
                  </b>
                </div>
              </div>

              {/* 🔥 MONTHLY VIEW */}
              <div style={{ marginTop: "15px" }}>
                <h4 style={{ color: "#1e3a8a" }}>Monthly Leaves</h4>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {Object.entries(getMonthlyLeaves(selectedEmployee)).map(
                    ([month, data]) => (
                      <div
                        key={month}
                        style={{
                          padding: "10px",
                          background: "#f9fbff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          minWidth: "120px",
                        }}
                      >
                        <b>{month}</b>
                        <div>Casual: {data.casual}</div>
                        <div>Sick: {data.sick}</div>
                      </div>
                    )
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Leaves;