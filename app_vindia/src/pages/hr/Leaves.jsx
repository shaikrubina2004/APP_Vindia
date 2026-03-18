import { useState, useEffect } from "react";
import "./Leaves.css";

function Leaves() {
  const salaryPerDay = 1000;

  const maxTotalLeaves = 12;
  const maxSickLeaves = 6;


  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [message, setMessage] = useState("");

  const [leaves, setLeaves] = useState([
    { name: "Ravi", type: "Sick Leave", date: "2026-03-18", status: "Pending", reason: "Fever" },
    { name: "Meena", type: "Casual Leave", date: "2026-03-18", status: "Pending", reason: "Function" },

    // Ravi (6 sick)
    { name: "Ravi", type: "Sick Leave", date: "2026-01-01", status: "Approved" },
    { name: "Ravi", type: "Sick Leave", date: "2026-01-02", status: "Approved" },
    { name: "Ravi", type: "Sick Leave", date: "2026-01-03", status: "Approved" },
    { name: "Ravi", type: "Sick Leave", date: "2026-01-04", status: "Approved" },
    { name: "Ravi", type: "Sick Leave", date: "2026-01-05", status: "Approved" },
    { name: "Ravi", type: "Sick Leave", date: "2026-01-06", status: "Approved" },

    // Casual
    { name: "Ravi", type: "Casual Leave", date: "2026-02-01", status: "Approved" },
    { name: "Ravi", type: "Casual Leave", date: "2026-02-02", status: "Approved" },

    { name: "Meena", type: "Casual Leave", date: "2026-03-01", status: "Approved" },
    // 🔥 ARJUN (14 leaves → salary cut)
{ name: "Arjun", type: "Sick Leave", date: "2026-01-01", status: "Approved" },
{ name: "Arjun", type: "Sick Leave", date: "2026-01-02", status: "Approved" },
{ name: "Arjun", type: "Sick Leave", date: "2026-01-03", status: "Approved" },
{ name: "Arjun", type: "Sick Leave", date: "2026-01-04", status: "Approved" },
{ name: "Arjun", type: "Sick Leave", date: "2026-01-05", status: "Approved" },
{ name: "Arjun", type: "Sick Leave", date: "2026-01-06", status: "Approved" },

// casual (8 → extra 2)
{ name: "Arjun", type: "Casual Leave", date: "2026-02-01", status: "Approved" },
{ name: "Arjun", type: "Casual Leave", date: "2026-02-02", status: "Approved" },
{ name: "Arjun", type: "Casual Leave", date: "2026-02-03", status: "Approved" },
{ name: "Arjun", type: "Casual Leave", date: "2026-02-04", status: "Approved" },
{ name: "Arjun", type: "Casual Leave", date: "2026-02-05", status: "Approved" },
{ name: "Arjun", type: "Casual Leave", date: "2026-02-06", status: "Approved" },
{ name: "Arjun", type: "Casual Leave", date: "2026-02-07", status: "Approved" },
{ name: "Arjun", type: "Casual Leave", date: "2026-02-08", status: "Approved" },

// today request (so visible in table)
{ name: "Arjun", type: "Casual Leave", date: "2026-03-18", status: "Pending", reason: "Personal" },
  ]);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleStatusChange = (index, newStatus) => {
    const leave = leaves[index];

    if (newStatus === "Approved") {
      const emp = leaves.filter(
        l => l.name === leave.name && l.status === "Approved"
      );

      const sickCount = emp.filter(l => l.type === "Sick Leave").length;
      const casualCount = emp.filter(l => l.type === "Casual Leave").length;

      if (leave.type === "Sick Leave" && sickCount >= maxSickLeaves) {
        setMessage("Max 6 Sick Leaves reached");
        return;
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

    const total = approved.length;

    return {
      total,
      sick: approved.filter(l => l.type === "Sick Leave").length,
      casual: approved.filter(l => l.type === "Casual Leave").length,
      balance: Math.max(maxTotalLeaves - total, 0),
      cut: Math.max(total - maxTotalLeaves, 0) * salaryPerDay
    };
  };

  const summary = selectedEmployee && calculateSummary(selectedEmployee);

  return (
    <div className="hr">
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
                          <button
                            disabled={
                              l.type === "Sick Leave" &&
                              summary?.sick >= 6 &&
                              l.name === selectedEmployee
                            }
                            onClick={() => handleStatusChange(i, "Approved")}
                          >
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

              {/* 🔴 ALERT */}
              {summary.sick >= 6 && (
                <div className="alert-box">
                  ⚠ Employee already used maximum 6 Sick Leaves
                </div>
              )}

              <div className="grid">
                <div><span>Total</span><b>{summary.total}</b></div>

                <div className="sick-box">
                  <span>Sick</span>
                  <b className={summary.sick >= 6 ? "danger-text" : ""}>
                    {summary.sick}
                  </b>

                  {summary.sick >= 6 && (
                    <span className="badge">LIMIT REACHED</span>
                  )}
                </div>

                <div><span>Casual</span><b>{summary.casual}</b></div>
                <div><span>Balance</span><b>{summary.balance}</b></div>

                <div>
                  <span>Salary Cut</span>
                  <b style={{ color: summary.cut ? "red" : "#1e3a8a" }}>
                    ₹{summary.cut}
                  </b>
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