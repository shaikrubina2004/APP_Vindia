import { API } from "../../services/authService";
import React from "react";
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
  const today = new Date().toLocaleDateString("en-CA");
  const [summaryData, setSummaryData] = useState(null);

  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
  fetchLeaves();
}, []);


  const fetchLeaves = async () => {
  try {
    const res = await API.get("/leaves");

    console.log("LEAVES:", res.data);

    // map backend → UI format
    const formatted = res.data.map((l) => ({
      id: l.id,
      employee_id: l.employee_id,   // ✅ ADD THIS
      name: l.name,
      type: l.reason,
      date: l.from_date,
      status: l.status,
    }));

    setLeaves(formatted);
  } catch (err) {
    console.error(err);
  }
};

  // ✅ APPROVE / REJECT FUNCTION
  const handleAction = async (id, newStatus) => {
  try {
    await API.put(`/leaves/${id}/status`, {
      status: newStatus,
    });

    fetchLeaves(); // reload from DB
    setMessage(`Leave ${newStatus} successfully`);
  } catch (err) {
    console.error(err);
  }
};

const fetchSummary = async (id) => {
  try {
    const res = await API.get(`/leaves/summary/${id}`);

    console.log("SUMMARY:", res.data);

    // ✅ convert to numbers
    const formatted = {
      total: Number(res.data.total),
      sick: Number(res.data.sick),
      casual: Number(res.data.casual),
    };

    setSummaryData(formatted);
  } catch (err) {
    console.error(err);
  }
};


  // 🔥 MONTHLY FUNCTION
  const getMonthlyLeaves = (name) => {
    const monthMap = {};

    leaves.forEach((l) => {
      if (l.name === name && l.status === "Approved") {
        const d = new Date(l.date);
        const key = `${d.toLocaleString("default", {
          month: "short",
        })} ${d.getFullYear()}`;

        if (!monthMap[key]) monthMap[key] = { casual: 0, sick: 0 };

        if (l.type === "Casual Leave") monthMap[key].casual++;
        if (l.type === "Sick Leave") monthMap[key].sick++;
      }
    });

    return monthMap;
  };

  // 🔥 SUMMARY FUNCTION
  const calculateSummary = (name) => {
    const todayDate = new Date();

    const approved = leaves.filter(
      (l) =>
        l.name === name &&
        l.status === "Approved" &&
        new Date(l.date) <= todayDate
    );

    const sickTaken = approved.filter((l) => l.type === "Sick Leave").length;
    const casualTaken = approved.filter(
      (l) => l.type === "Casual Leave"
    ).length;

    const totalTaken = sickTaken + casualTaken;
    const balance = maxTotalLeaves - (summaryData.total || 0);
    const extraLeaves = Math.max(totalTaken - maxTotalLeaves, 0);

    return {
      total: totalTaken,
      sick: sickTaken,
      casual: casualTaken,
      balance,
      cut: extraLeaves * salaryPerDay,
    };
  };
console.log("SUMMARY STATE:", summaryData);


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
    .filter((l) => {
      const localDate = new Date(l.date).toLocaleDateString("en-CA");
      return localDate === today;
    })
    .map((l, i) => (
      <React.Fragment key={l.id}>
        {/* MAIN ROW */}
        <tr>
          <td className="emp">{l.name}</td>
          <td>{l.type}</td>
          <td>
          {new Date(l.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </td>

          <td>
            <span className={`tag ${l.status.toLowerCase()}`}>
              {l.status}
            </span>
          </td>

          <td>
            {l.status === "Pending" && (
              <>
                <button onClick={() => handleAction(l.id, "Approved")}>
                  Approve
                </button>

                <button onClick={() => handleAction(l.id, "Rejected")}>
                  Reject
                </button>
              </>
            )}
          </td>

          <td>
            <button
              className="view"
              onClick={() => {
                if (selectedIndex === i) {
                  setSelectedIndex(null);
                  setSelectedEmployee(null);
                  setSummaryData(null);
                } else {
                  setSelectedEmployee(l.name);
                  setSelectedIndex(i);
                 setSummaryData(null);  // ✅ ADD THIS
                fetchSummary(l.employee_id); // ✅ FIXED
                }
              }}
            >
              {selectedIndex === i ? "Hide" : "View"}
            </button>
          </td>
        </tr>

        {/* SUMMARY ROW */}
        {selectedIndex === i && summaryData !== null && (
          <tr>
            <td colSpan="6">
              <div className="summary">
                <h3>{selectedEmployee}</h3>

                <div className="grid">
                  <div>
                    <span>Total Leave Taken</span>
                    <b>{summaryData.total || 0}</b>
                  </div>

                  <div>
                    <span>Sick Leave Taken</span>
                    <b>{summaryData.sick || 0}</b>
                  </div>

                  <div>
                    <span>Casual Leave Taken</span>
                    <b>{summaryData.casual || 0}</b>
                  </div>

                  <div>
                    <span>Balance</span>
                    <b>{maxTotalLeaves - (summaryData.total || 0)}</b>
                  </div>

                  <div>
                    <span>Salary Cut</span>
                    <b
                      style={{
                        color:
                          (summaryData.total || 0) > maxTotalLeaves
                            ? "red"
                            : "green",
                      }}
                    >
                      ₹
                      {Math.max(
                        (summaryData.total || 0) - maxTotalLeaves,
                        0
                      ) * salaryPerDay}
                    </b>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ))}
</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Leaves;
