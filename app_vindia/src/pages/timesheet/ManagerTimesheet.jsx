import { useState, useEffect } from "react";
import "../../styles/timesheet.css";

export default function ManagerTimesheet() {
  const [teamData, setTeamData] = useState([]);

  // ✅ LOAD FROM BACKEND (NOT localStorage)
  useEffect(() => {
    fetch("http://localhost:5000/api/timesheets")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((t) => {
          // calculate work hours safely
          let workHours = 0;

          try {
            const rows =
              typeof t.rows === "string"
                ? JSON.parse(t.rows)
                : t.rows || [];

            workHours = rows.reduce((sum, r) => {
              const hoursObj =
                typeof r.hours === "string"
                  ? JSON.parse(r.hours)
                  : r.hours || {};

              return (
                sum +
                Object.values(hoursObj).reduce(
                  (a, b) => a + Number(b || 0),
                  0
                )
              );
            }, 0);
          } catch {
            workHours = 0;
          }

          return {
            id: t.id,
            name: t.name,
            email: t.email,
            period: t.week,

            // ✅ FIXED FIELD MAPPING
            leaveHours: t.leave_hours,
            workingDays: t.working_days,

            type: t.type,
            status: t.status,
            workHours,
          };
        });

        setTeamData(formatted);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  // 🔹 Calculations
  const getBreak = (days) => days * 1;
  const getTotal = (work, leave) => work + leave;
  const getRegular = (work, days) =>
    Math.max(work - getBreak(days), 0);
  const getOvertime = (work, days) =>
    Math.max(work - getRegular(work, days), 0);

  // ✅ APPROVE / REJECT → BACKEND
  const updateStatus = async (id, status) => {
    try {
      await fetch(`http://localhost:5000/api/timesheets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      // update UI instantly
      setTeamData((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status } : t
        )
      );
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  return (
    <div className="ts-page">
      <div className="ts-card">
        <h2 className="ts-card-title">Team Timesheets</h2>

        <div className="ts-table-wrap">
          <table className="ts-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Timesheet Period</th>
                <th>Time Off</th>
                <th>Total Hours</th>
                <th>Type</th>
                <th>Regular</th>
                <th>Overtime</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {teamData.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "#6b7280",
                    }}
                  >
                    No timesheets submitted yet.
                  </td>
                </tr>
              ) : (
                teamData.map((t) => {
                  const total = getTotal(
                    t.workHours,
                    t.leaveHours
                  );
                  const regular = getRegular(
                    t.workHours,
                    t.workingDays
                  );
                  const overtime = getOvertime(
                    t.workHours,
                    t.workingDays
                  );

                  return (
                    <tr key={t.id}>
                      {/* USER */}
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {t.name}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#888",
                          }}
                        >
                          {t.email}
                        </div>
                      </td>

                      {/* PERIOD */}
                      <td>{t.period}</td>

                      {/* TIME OFF */}
                      <td>{t.leaveHours} hrs</td>

                      {/* TOTAL */}
                      <td>
                        <b>{total} hrs</b>
                      </td>

                      {/* TYPE */}
                      <td>{t.type}</td>

                      {/* REGULAR */}
                      <td>
                        <b>{regular} hrs</b>
                      </td>

                      {/* OVERTIME */}
                      <td>{overtime} hrs</td>

                      {/* STATUS */}
                      <td>
                        <span
                          className={`ts-status-badge ${
                            t.status === "Approved"
                              ? "submitted"
                              : t.status === "Rejected"
                              ? "not-submitted"
                              : "not-submitted"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td>
                        {t.status === "Pending" ? (
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                            }}
                          >
                            <button
                              className="ts-btn-submit"
                              onClick={() =>
                                updateStatus(
                                  t.id,
                                  "Approved"
                                )
                              }
                            >
                              Approve
                            </button>

                            <button
                              className="ts-btn-secondary"
                              style={{
                                color: "red",
                                borderColor: "red",
                              }}
                              onClick={() =>
                                updateStatus(
                                  t.id,
                                  "Rejected"
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#9ca3af",
                            }}
                          >
                            {t.status === "Approved"
                              ? "✓ Approved"
                              : "✕ Rejected"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}