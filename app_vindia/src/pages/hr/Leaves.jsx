import { useState, useEffect } from "react";
import "./Leaves.css";

function Leaves() {
  const salaryPerDay = 1000;

  const maxTotalLeaves = 18;
  const maxSickLeaves = 6;
  const maxCasualLeaves = 12;

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [message, setMessage] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const [leaves, setLeaves] = useState([
    {
      name: "Ravi",
      type: "Sick Leave",
      date: today,
      status: "Pending",
      joiningDate: "2026-01-01",
    },
    {
      name: "Meena",
      type: "Casual Leave",
      date: today,
      status: "Pending",
      joiningDate: "2026-02-01",
    },
    {
      name: "Arjun",
      type: "Casual Leave",
      date: today,
      status: "Pending",
      joiningDate: "2026-01-15",
    },
    {
      name: "Anu",
      type: "Sick Leave",
      date: today,
      status: "Pending",
      joiningDate: "2025-12-01",
    },
    {
      name: "Faisal",
      type: "Casual Leave",
      date: today,
      status: "Pending",
      joiningDate: "2025-11-10",
    },

    {
      name: "Ravi",
      type: "Casual Leave",
      date: "2026-02-10",
      status: "Approved",
      joiningDate: "2026-01-01",
    },
    {
      name: "Ravi",
      type: "Sick Leave",
      date: "2026-02-05",
      status: "Approved",
      joiningDate: "2026-01-01",
    },
    {
      name: "Ravi",
      type: "Sick Leave",
      date: "2026-03-02",
      status: "Approved",
      joiningDate: "2026-01-01",
    },

    {
      name: "Meena",
      type: "Casual Leave",
      date: "2026-02-05",
      status: "Approved",
      joiningDate: "2026-02-01",
    },
    {
      name: "Meena",
      type: "Sick Leave",
      date: "2026-03-08",
      status: "Approved",
      joiningDate: "2026-02-01",
    },

    {
      name: "Arjun",
      type: "Casual Leave",
      date: "2026-01-10",
      status: "Approved",
      joiningDate: "2026-01-15",
    },
    {
      name: "Arjun",
      type: "Casual Leave",
      date: "2026-02-12",
      status: "Approved",
      joiningDate: "2026-01-15",
    },
    {
      name: "Arjun",
      type: "Sick Leave",
      date: "2026-02-15",
      status: "Approved",
      joiningDate: "2026-01-15",
    },

    {
      name: "Anu",
      type: "Sick Leave",
      date: "2026-01-05",
      status: "Approved",
      joiningDate: "2025-12-01",
    },
    {
      name: "Anu",
      type: "Sick Leave",
      date: "2026-02-18",
      status: "Approved",
      joiningDate: "2025-12-01",
    },

    {
      name: "Faisal",
      type: "Casual Leave",
      date: "2026-01-20",
      status: "Approved",
      joiningDate: "2025-11-10",
    },
    {
      name: "Faisal",
      type: "Casual Leave",
      date: "2026-02-25",
      status: "Approved",
      joiningDate: "2025-11-10",
    },
  ]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(t);
    }
  }, [message]);

  const getMonthlyLeaves = (name) => {
    const monthMap = {};

    leaves.forEach((l) => {
      if (l.name === name && l.status === "Approved") {
        const d = new Date(l.date);
        const key = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;

        if (!monthMap[key]) monthMap[key] = { casual: 0, sick: 0 };

        if (l.type === "Casual Leave") monthMap[key].casual++;
        if (l.type === "Sick Leave") monthMap[key].sick++;
      }
    });

    return monthMap;
  };

  // 🔥 Till-date summary logic
  const calculateSummary = (name) => {
    const todayDate = new Date();

    const approved = leaves.filter(
      (l) =>
        l.name === name &&
        l.status === "Approved" &&
        new Date(l.date) <= todayDate,
    );

    const currentYear = todayDate.getFullYear();

    const sickTaken = approved.filter((l) => l.type === "Sick Leave").length;

    const casualTaken = approved.filter(
      (l) =>
        l.type === "Casual Leave" &&
        new Date(l.date).getFullYear() === currentYear,
    ).length;

    const totalTaken = sickTaken + casualTaken;

    const balance = Math.max(maxTotalLeaves - totalTaken, 0);

    const extraLeaves = Math.max(totalTaken - maxTotalLeaves, 0);

    return {
      total: totalTaken,
      sick: sickTaken,
      casual: casualTaken,
      balance,
      cut: extraLeaves * salaryPerDay,
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
              {leaves
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(
                  (l, i) =>
                    l.date === today && (
                      <>
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
                                  onClick={() =>
                                    handleStatusChange(i, "Approved")
                                  }
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(i, "Rejected")
                                  }
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>

                          <td>
                            <button
                              className="view"
                              onClick={() => {
                                setSelectedEmployee(l.name);
                                setSelectedIndex(i);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>

                        {selectedIndex === i && summary && (
                          <tr>
                            <td colSpan="6">
                              <div className="summary">
                                <h3>{selectedEmployee}</h3>

                                {/* 🔥 UPDATED LABELS */}
                                <div className="grid">
                                  <div>
                                    <span>Total Leave Taken</span>
                                    <b>{summary.total}</b>
                                  </div>

                                  <div>
                                    <span>Sick Leave Taken</span>
                                    <b>{summary.sick}</b>
                                  </div>

                                  <div>
                                    <span>Casual Leave Taken</span>
                                    <b>{summary.casual}</b>
                                  </div>

                                  <div>
                                    <span>Balance (Till Date)</span>
                                    <b>{summary.balance}</b>
                                  </div>

                                  <div>
                                    <span>Salary Cut (LOP)</span>
                                    <b
                                      style={{
                                        color:
                                          summary.cut > 0 ? "red" : "green",
                                      }}
                                    >
                                      ₹{summary.cut}
                                    </b>
                                  </div>
                                </div>

                                {/* Monthly Cards */}
                                <div style={{ marginTop: "15px" }}>
                                  <h4 style={{ color: "#1e3a8a" }}>
                                    Monthly Leaves
                                  </h4>

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "12px",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {Object.entries(
                                      getMonthlyLeaves(selectedEmployee),
                                    ).map(([month, data]) => (
                                      <div
                                        key={month}
                                        style={{
                                          padding: "12px",
                                          background: "#f9fbff",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: "8px",
                                          minWidth: "130px",
                                          boxShadow:
                                            "0 2px 6px rgba(0,0,0,0.05)",
                                        }}
                                      >
                                        <div style={{ fontWeight: "600" }}>
                                          {month}
                                        </div>
                                        <div>
                                          Casual: <b>{data.casual}</b>
                                        </div>
                                        <div>
                                          Sick: <b>{data.sick}</b>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ),
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Leaves;
