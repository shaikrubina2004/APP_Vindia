import { useState, useEffect } from "react";
import "../../styles/timesheet.css";

export default function ManagerTimesheet() {
  const [teamData, setTeamData] = useState([]);

  // ✅ Load timesheets from localStorage
  useEffect(() => {
    const stored =
      JSON.parse(localStorage.getItem("timesheets")) || [];

    const formatted = stored.map((t) => {
      const workHours = t.rows.reduce(
        (sum, r) =>
          sum +
          (r.hours || []).reduce((a, b) => a + Number(b || 0), 0),
        0
      );

      return {
        id: t.id,
        name: "Employee",
        email: "employee@mail.com",
        period: t.week,
        workHours,
        leaveHours: 0,
        type: "Labour",
        workingDays: 6,
        status: t.status || "Pending",
      };
    });

    setTeamData(formatted);
  }, []);

  // 🔹 Calculations
  const getBreak = (days) => days * 1; // 1 hr per day
  const getTotal = (work, leave) => work + leave;
  const getRegular = (work, days) => work - getBreak(days);
  const getOvertime = (days) => getBreak(days);

  // ✅ Approve / Reject
  const updateStatus = (id, status) => {
    const updated = teamData.map((t) =>
      t.id === id ? { ...t, status } : t
    );
    setTeamData(updated);

    // update localStorage also
    const stored =
      JSON.parse(localStorage.getItem("timesheets")) || [];

    const updatedStorage = stored.map((t) =>
      t.id === id ? { ...t, status } : t
    );

    localStorage.setItem(
      "timesheets",
      JSON.stringify(updatedStorage)
    );
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
              {teamData.map((t) => {
                const total = getTotal(
                  t.workHours,
                  t.leaveHours
                );
                const regular = getRegular(
                  t.workHours,
                  t.workingDays
                );
                const overtime = getOvertime(
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
                      {t.status === "Pending" && (
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
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}