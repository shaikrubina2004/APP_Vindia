import { useState, useEffect } from "react";
import "../../styles/timesheet.css";
import ApplyLeave from "../../SharedResourse/ApplyLeave";
import ManagerTimesheet from "./ManagerTimesheet";

function buildMonthWeeks(year, month) {
  const lastDate = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let d = 1;

  while (d <= lastDate) {
    const startDate = new Date(year, month, d);
    const startDow = startDate.getDay();
    const daysUntilNextSunday = startDow === 0 ? 7 : 7 - startDow;
    const endD = Math.min(d + daysUntilNextSunday, lastDate);

    const weekDays = [];
    for (let i = d; i <= endD; i++) {
      const date = new Date(year, month, i);
      weekDays.push({
        label: date.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
        }),
        full: new Date(date),
        dayOfWeek: date.getDay(),
        isSunday: date.getDay() === 0,
      });
    }
    weeks.push(weekDays);
    d = endD + 1;
  }

  while (weeks.length >= 2 && weeks[weeks.length - 1].length < 7) {
    weeks[weeks.length - 2] = [
      ...weeks[weeks.length - 2],
      ...weeks[weeks.length - 1],
    ];
    weeks.pop();
  }

  return weeks;
}

function getWeekDates(anchorDate) {
  const anchor = new Date(anchorDate);
  anchor.setHours(0, 0, 0, 0);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const date = anchor.getDate();
  const weeks = buildMonthWeeks(year, month);

  for (const week of weeks) {
    const from = week[0].full.getDate();
    const to = week[week.length - 1].full.getDate();
    if (date >= from && date <= to) return week;
  }
  return weeks[weeks.length - 1] || [];
}

function isUploadAllowed(weekDates) {
  if (!weekDates.length) return false;
  const lastDay = new Date(weekDates[weekDates.length - 1].full);
  lastDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= lastDay;
}

function toDateStr(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isDateOnLeave(dayFull, appliedLeaves) {
  const dayStr = toDateStr(dayFull);
  return appliedLeaves.some(
    (leave) => dayStr >= leave.fromDate && dayStr <= leave.toDate,
  );
}

function getLeaveTypeForDate(dayFull, appliedLeaves) {
  const dayStr = toDateStr(dayFull);
  const leave = appliedLeaves.find(
    (l) => dayStr >= l.fromDate && dayStr <= l.toDate,
  );
  return leave ? leave.leaveType : null;
}

const WBS_PROJECTS = [
  { code: "1.0", name: "Site Preparation & Foundation" },
  { code: "2.0", name: "Structural Work" },
  { code: "3.0", name: "MEP Installation" },
];

const WBS_TASKS = [
  { code: "1.1", name: "Excavation Work", projectCode: "1.0" },
  { code: "1.2", name: "Foundation Laying", projectCode: "1.0" },
  { code: "2.1", name: "Column Installation", projectCode: "2.0" },
  { code: "2.2", name: "Beam Work", projectCode: "2.0" },
  { code: "3.1", name: "Electrical Work", projectCode: "3.0" },
  { code: "3.2", name: "Plumbing Work", projectCode: "3.0" },
];

const MANAGER_ROLES = [
  "PROJECT_MANAGER",
  "OPERATIONS_MANAGER",
  "HR_MANAGER",
  "FINANCE_MANAGER",
  "IT_MANAGER",
  "BDM",
];

const getUser = () => {
  try {
    const stored = localStorage.getItem("user");
    return stored
      ? JSON.parse(stored)
      : { role: "PROJECT_MANAGER", name: "Demo User" };
  } catch {
    return { role: "PROJECT_MANAGER", name: "Demo User" };
  }
};

export default function Timesheet() {
  const user = getUser();

  // ── FIX 1: isManager computed from MANAGER_ROLES constant ─────────────────
const isManager = true;
  const [view, setView] = useState("MY");
  const currentDate = new Date();
  const [rows, setRows] = useState([
    {
      id: 1,
      projectCode: "",
      taskCode: "",
      employeeType: "Labour",
      hours: {},
      groupId: 1,
    },
  ]);
  const [submissionStatus, setSubmissionStatus] = useState("NOT SUBMITTED");
  const [appliedLeaves, setAppliedLeaves] = useState([]);

  const weekDates = getWeekDates(currentDate);
  const canSubmit = isUploadAllowed(weekDates);

  const leaveDayFlags = weekDates.map((day) =>
    isDateOnLeave(day.full, appliedLeaves),
  );

  const formatRange = () => {
    const s = weekDates[0]?.full;
    const e = weekDates[weekDates.length - 1]?.full;
    if (!s || !e) return "";
    return `${s.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  const getDueDate = () => {
    const e = weekDates[weekDates.length - 1]?.full;
    return (
      e?.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) || ""
    );
  };

  const getHourVal = (row, idx) => {
    const dateKey = toDateStr(weekDates[idx].full);
    return (row.hours || {})[dateKey] || "";
  };

  const handleHours = (id, idx, val) => {
    if (leaveDayFlags[idx]) return;
    const dateKey = toDateStr(weekDates[idx].full);
    setRows(
      rows.map((r) => {
        if (r.id !== id) return r;
        return { ...r, hours: { ...(r.hours || {}), [dateKey]: val } };
      }),
    );
  };

  const rowTotal = (row) =>
    weekDates
      .reduce((a, _, idx) => {
        if (leaveDayFlags[idx]) return a;
        return a + Number(getHourVal(row, idx) || 0);
      }, 0)
      .toFixed(2);

  const dayTotal = (idx) =>
    leaveDayFlags[idx]
      ? "—"
      : rows
          .reduce((s, r) => s + Number(getHourVal(r, idx) || 0), 0)
          .toFixed(2);

  const grandTotal = () =>
    rows
      .reduce(
        (s, r) =>
          s +
          weekDates.reduce(
            (a, _, idx) =>
              leaveDayFlags[idx] ? a : a + Number(getHourVal(r, idx) || 0),
            0,
          ),
        0,
      )
      .toFixed(2);

  const entryCount = () =>
    rows.reduce(
      (c, r) =>
        c +
        weekDates.filter(
          (_, idx) => !leaveDayFlags[idx] && Number(getHourVal(r, idx)) > 0,
        ).length,
      0,
    );

  const timeOffDayValue = (idx) => (leaveDayFlags[idx] ? 9 : "");
  const timeOffTotal = () =>
    weekDates.reduce((s, _, idx) => s + (leaveDayFlags[idx] ? 9 : 0), 0);

  const handleProjectSelect = (id, projectCode) => {
    setRows(
      rows.map((r) => (r.id === id ? { ...r, projectCode, taskCode: "" } : r)),
    );
  };

  const handleTaskSelect = (id, taskCode) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, taskCode } : r)));
  };

  const handleEmpType = (id, val) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, employeeType: val } : r)));
  };

  const addTaskToGroup = (groupId) => {
    const lastGroupRow = rows.filter((r) => r.groupId === groupId).pop();
    if (!lastGroupRow || !lastGroupRow.projectCode) {
      alert("Please select a project first");
      return;
    }
    const newRow = {
      id: Date.now(),
      projectCode: lastGroupRow.projectCode,
      taskCode: "",
      employeeType: "Labour",
      hours: {},
      groupId,
    };
    const insertIndex = rows.findIndex((r) => r.id === lastGroupRow.id) + 1;
    setRows([
      ...rows.slice(0, insertIndex),
      newRow,
      ...rows.slice(insertIndex),
    ]);
  };

  const addRow = () => {
    const newGroupId = Math.max(...rows.map((r) => r.groupId), 0) + 1;
    setRows([
      ...rows,
      {
        id: Date.now(),
        projectCode: "",
        taskCode: "",
        employeeType: "Labour",
        hours: {},
        groupId: newGroupId,
      },
    ]);
  };

  const deleteRow = (id) => {
    if (id === 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };

  // ── FIX 2: Quick fill now skips Sunday AND leave days ──────────────────────
  const handleQuickFill = () => {
    const h = prompt("Enter hours for all working days:", "8");
    if (h && !isNaN(h) && Number(h) > 0) {
      setRows(
        rows.map((r) => ({
          ...r,
          hours: {
            ...(r.hours || {}),
            ...Object.fromEntries(
              weekDates
                .filter((d, idx) => !leaveDayFlags[idx] && !d.isSunday) // ← skips Sunday
                .map((d) => [toDateStr(d.full), h]),
            ),
          },
        })),
      );
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleClearAll = () => {
    if (confirm("Clear all time entries for this week?")) {
      setRows(
        rows.map((r) => {
          const updatedHours = { ...(r.hours || {}) };
          weekDates.forEach((d) => {
            delete updatedHours[toDateStr(d.full)];
          });
          return { ...r, hours: updatedHours };
        }),
      );
    }
  };

  const handleSubmit = async () => {
  try {
    const payload = [];

    rows.forEach((row) => {
      Object.entries(row.hours || {}).forEach(([date, hrs]) => {
        if (hrs > 0) {
          payload.push({
            project_id: row.projectCode,
            task_id: row.taskCode,
            user_id: user.id,
            work_date: date,
            hours: hrs,
            description: row.employeeType,
          });
        }
      });
    });

    await fetch("http://localhost:5000/api/timesheets/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setSubmissionStatus("SUBMITTED");
    alert("Timesheet submitted successfully");

  } catch (err) {
    console.error(err);
    alert("Submission failed");
  }
};
const fetchMyTimesheet = async () => {
  try {
    const res = await fetch(
      `http://localhost:5000/api/timesheets/user/${user.email}`
    );

    if (!res.ok) {
      throw new Error("API failed");
    }

    const data = await res.json();

    if (data.length > 0) {
      const latest = data[0];
      setRows(latest.rows || []);
      setSubmissionStatus(latest.status || "NOT SUBMITTED");
    }

  } catch (err) {
    console.error("Fetch error:", err);
  }
};
useEffect(() => {
  fetchMyTimesheet();
}, []);
  const handleLeaveSubmitted = (leaveData) => {
    setAppliedLeaves((prev) => [
      ...prev,
      {
        id: Date.now(),
        employeeName: leaveData.employeeName || leaveData.name,
        leaveType: leaveData.leaveType,
        fromDate: leaveData.fromDate,
        toDate: leaveData.toDate,
        reason: leaveData.reason,
        status: leaveData.status,
        appliedOn: leaveData.appliedOn,
      },
    ]);
  };

  const leaveTypeLabel = (type) => {
    const map = {
      casual: "CL",
      sick: "SL",
      earned: "EL",
      maternity: "ML",
      paternity: "PL",
      unpaid: "UL",
      comp_off: "CO",
    };
    return map[type] || type?.toUpperCase() || "LV";
  };

  return (
    <div className="ts-page">

      {/* ── FIX 3: Toggle always rendered first, clearly visible ── */}
      {isManager && (
        <div className="ts-toggle">
          <button
            className={`ts-toggle-btn ${view === "MY" ? "active" : ""}`}
            onClick={() => setView("MY")}
          >
            📄 My Timesheet
          </button>
          <button
            className={`ts-toggle-btn ${view === "TEAM" ? "active" : ""}`}
            onClick={() => setView("TEAM")}
          >
            👥 Team Timesheet
          </button>
        </div>
      )}

      {/* ── TEAM VIEW ── */}
      {isManager && view === "TEAM" && <ManagerTimesheet />}

      {/* ── MY TIMESHEET VIEW ── */}
      {(view === "MY" || !isManager) && (
        <>
          <div className="ts-header">
            <div className="ts-header-top">
              <div className="ts-title-block">
                <h1>TIMESHEET</h1>
                <span className="ts-badge">{entryCount()}</span>
              </div>
              <div className="ts-week-nav">
                <div className="ts-date-range">{formatRange()}</div>
              </div>
            </div>
            <div className="ts-info-row">
              <span
                className={`ts-status-badge ${submissionStatus === "SUBMITTED" ? "submitted" : "not-submitted"}`}
              >
                {submissionStatus}
              </span>
              <span className="ts-due">📅 Due: {getDueDate()}</span>
            </div>
          </div>

          {!canSubmit && (
            <div className="ts-lock-banner">
              <span className="ts-lock-icon">🔒</span>
              <span>
                Submission locked. Timesheet for{" "}
                <strong>{formatRange()}</strong> can only be submitted on or
                after <strong>{getDueDate()}</strong>.
              </span>
            </div>
          )}

          <div className="ts-action-bar">
            <button className="ts-btn-count">
              {entryCount()} TIME ENTRY(IES)
            </button>
            <button
              className="ts-btn-submit"
              onClick={handleSubmit}
              style={{
                opacity: !canSubmit ? 0.5 : 1,
                cursor: !canSubmit ? "not-allowed" : "pointer",
              }}
            >
              ✓ SUBMIT TIMESHEET
            </button>
            <button className="ts-btn-secondary" onClick={handleQuickFill}>
              QUICK FILL
            </button>
            <button className="ts-btn-secondary" onClick={handleClearAll}>
              CLEAR ALL
            </button>
            <button
              className="ts-btn-refresh"
              onClick={() => window.location.reload()}
              title="Refresh"
            >
              ↻
            </button>
          </div>

          <div className="ts-card">
            <div className="ts-card-title">
              <span>⏱ Time Distribution</span>
              <span className="ts-card-subtitle">
                {weekDates.length} days incl. sunday
              </span>
            </div>

            <div className="ts-table-wrap">
              <table className="ts-table">
                <thead>
                  <tr>
                    <th className="th-left" style={{ minWidth: 160 }}>
                      Project
                    </th>
                    <th className="th-left" style={{ minWidth: 160 }}>
                      Task
                    </th>
                    <th className="th-emp">Employee Type</th>
                    {weekDates.map((d, i) => (
                      <th
                        key={i}
                        className={`th-day ${d.isSunday ? "ts-sunday-header" : ""} ${leaveDayFlags[i] ? "ts-leave-header" : ""}`}
                      >
                        {d.label}
                        {d.isSunday && (
                          <div
                            style={{
                              fontSize: "8px",
                              fontWeight: 600,
                              opacity: 0.85,
                              letterSpacing: "0.3px",
                            }}
                          >
                            COMP-OFF
                          </div>
                        )}
                        {leaveDayFlags[i] && !d.isSunday && (
                          <div
                            style={{
                              fontSize: "8px",
                              fontWeight: 700,
                              opacity: 0.9,
                              letterSpacing: "0.3px",
                              color: "#f87171",
                            }}
                          >
                            {leaveTypeLabel(
                              getLeaveTypeForDate(d.full, appliedLeaves),
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="th-total">Total Hrs</th>
                    <th
                      style={{
                        minWidth: 60,
                        textAlign: "center",
                        borderRight: "none",
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, idx) => {
                    const isLastInGroup =
                      idx === rows.length - 1 ||
                      rows[idx + 1]?.groupId !== row.groupId;
                    const isFirstInGroup =
                      idx === 0 || rows[idx - 1]?.groupId !== row.groupId;

                    return (
                      <tr
                        key={row.id}
                        className={isFirstInGroup ? "ts-task-group-header" : ""}
                      >
                        <td>
                          {isFirstInGroup ? (
                            <select
                              className="ts-select"
                              value={row.projectCode}
                              onChange={(e) =>
                                handleProjectSelect(row.id, e.target.value)
                              }
                            >
                              <option value="">Select Project</option>
                              {WBS_PROJECTS.map((p) => (
                                <option key={p.code} value={p.code}>
                                  {p.code} – {p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: "12px",
                              }}
                            >
                              ─ Sub-task
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="ts-task-actions">
                            <select
                              className="ts-select"
                              value={row.taskCode}
                              onChange={(e) =>
                                handleTaskSelect(row.id, e.target.value)
                              }
                              disabled={!row.projectCode}
                              style={{ opacity: !row.projectCode ? 0.5 : 1 }}
                            >
                              <option value="">Select Task</option>
                              {WBS_TASKS.filter(
                                (t) => t.projectCode === row.projectCode,
                              ).map((t) => (
                                <option key={t.code} value={t.code}>
                                  {t.code} – {t.name}
                                </option>
                              ))}
                            </select>
                            {isLastInGroup && row.projectCode && (
                              <button
                                className="ts-btn-add-task"
                                onClick={() => addTaskToGroup(row.groupId)}
                                title="Add another task for this project"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </td>

                        <td>
                          <select
                            className="ts-select"
                            value={row.employeeType}
                            onChange={(e) =>
                              handleEmpType(row.id, e.target.value)
                            }
                          >
                            <option value="Labour">Labour</option>
                            <option value="Employee">Employee</option>
                          </select>
                        </td>

                        {weekDates.map((day, di) => {
                          const isLeaveDay = leaveDayFlags[di];
                          return (
                            <td
                              key={di}
                              className={`td-hours ${day.isSunday ? "ts-sunday-cell" : ""} ${isLeaveDay ? "ts-leave-blocked-cell" : ""}`}
                            >
                              {isLeaveDay ? (
                                <div
                                  title="On leave — entry blocked"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                    fontSize: "14px",
                                    opacity: 0.45,
                                    cursor: "not-allowed",
                                    userSelect: "none",
                                  }}
                                >
                                  🔒
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  className={`ts-input ${day.isSunday ? "ts-sunday-input" : ""}`}
                                  placeholder="0"
                                  min="0"
                                  max="24"
                                  value={getHourVal(row, di)}
                                  onChange={(e) =>
                                    handleHours(row.id, di, e.target.value)
                                  }
                                />
                              )}
                            </td>
                          );
                        })}

                        <td className="td-total">
                          <span className="ts-total-chip">{rowTotal(row)}</span>
                        </td>
                        <td className="td-action">
                          {row.id !== 1 && (
                            <button
                              className="ts-btn-delete"
                              onClick={() => deleteRow(row.id)}
                              title="Delete row"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="ts-time-off-row">
                    <td
                      colSpan={2}
                      style={{
                        fontWeight: 600,
                        fontSize: "13px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      🏖 Time Off
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {appliedLeaves.length > 0
                        ? appliedLeaves
                            .map((l) => leaveTypeLabel(l.leaveType))
                            .join(", ")
                        : "—"}
                    </td>
                    {weekDates.map((day, di) => {
                      const val = timeOffDayValue(di);
                      const leaveType = getLeaveTypeForDate(
                        day.full,
                        appliedLeaves,
                      );
                      return (
                        <td
                          key={di}
                          className={`td-hours ts-time-off-cell ${val ? "ts-time-off-active" : ""}`}
                          title={
                            val
                              ? `${leaveTypeLabel(leaveType)} – 9 hrs auto-filled`
                              : ""
                          }
                        >
                          {val ? (
                            <div className="ts-time-off-value">
                              <span>{val}</span>
                              <span className="ts-leave-badge">
                                {leaveTypeLabel(leaveType)}
                              </span>
                            </div>
                          ) : (
                            <span style={{ opacity: 0.25, fontSize: "12px" }}>
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="td-total">
                      <span className="ts-total-chip ts-leave-total">
                        {timeOffTotal() > 0 ? timeOffTotal() : "—"}
                      </span>
                    </td>
                    <td style={{ borderRight: "none" }} />
                  </tr>

                  <tr className="ts-total-row">
                    <td
                      colSpan={3}
                      style={{
                        textAlign: "left",
                        borderRight: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      TOTAL HOURS
                    </td>
                    {weekDates.map((_, di) => (
                      <td key={di}>{dayTotal(di)}</td>
                    ))}
                    <td>{grandTotal()}</td>
                    <td style={{ borderRight: "none" }} />
                  </tr>
                </tbody>
              </table>
            </div>

            <button className="ts-btn-add-row" onClick={addRow}>
              + ADD NEW PROJECT GROUP
            </button>
          </div>

          <div className="ts-card">
            <h3 className="ts-card-title">🏖 Time Off</h3>
            <div className="leave-form-wrapper">
              <ApplyLeave
                userRole={user.role || "employee"}
                employeeName={user.name || ""}
                onLeaveSubmitted={handleLeaveSubmitted}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}