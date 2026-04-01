import { useState } from "react";
import "../../styles/timesheet.css";

export default function ManagerTimesheet() {
  const [teamData, setTeamData] = useState([
    {
      id: 1,
      name: "Ravi Kumar",
      email: "ravi@gmail.com",
      period: "23 Mar - 31 Mar",

      workHours: 48,
      leaveHours: 9,

      type: "Labour",
      workingDays: 6,

      status: "Pending",
    },
    {
      id: 2,
      name: "Meena Sharma",
      email: "meena@gmail.com",
      period: "23 Mar - 31 Mar",

      workHours: 42,
      leaveHours: 0,

      type: "Non-Labour",
      workingDays: 6,

      status: "Pending",
    },
  ]);

  // 🔹 Break = 1 hr per working day
  const getBreak = (days) => days * 1;

  // 🔹 Work + Time Off
  const getTotal = (work, leave) => work + leave;

  // 🔹 ✅ FINAL FIXED FORMULA
  // Regular = Work - Break
  const getRegular = (work, days) =>
    work - getBreak(days);

  // 🔹 Overtime = Break
  const getOvertime = (days) => getBreak(days);

  const updateStatus = (id, status) => {
    setTeamData((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status } : t
      )
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
                <th>Work + Time Off</th>
                <th>Type</th>
                <th>Regular</th>
                <th>Overtime</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {teamData.map((t) => {
                const total = getTotal(t.workHours, t.leaveHours);
                const regular = getRegular(
                  t.workHours,
                  t.workingDays
                );
                const overtime = getOvertime(t.workingDays);

                return (
                  <tr key={t.id}>
                    {/* USER */}
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {t.email}
                      </div>
                    </td>

                    {/* PERIOD */}
                    <td>{t.period}</td>

                    {/* TIME OFF */}
                    <td>{t.leaveHours} hrs</td>

                    {/* WORK + TIME OFF */}
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
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="ts-btn-submit"
                            onClick={() =>
                              updateStatus(t.id, "Approved")
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
                              updateStatus(t.id, "Rejected")
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