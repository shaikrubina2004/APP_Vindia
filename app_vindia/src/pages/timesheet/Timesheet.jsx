import { useState } from "react";

/* ===================== */
/* CSS INJECTED GLOBALLY */
/* ===================== */
const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');

:root {
  --primary-blue: #1e5a96;
  --secondary-blue: #2b7abc;
  --text-primary: #1a1a2e;
  --text-secondary: #7a7a8a;
  --bg-light: #f7f9fc;
  --bg-white: #ffffff;
  --border-color: #e6e8ec;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;
}

* { box-sizing: border-box; }

.ts-page {
  padding: 20px;
  background: var(--bg-light);
  min-height: 100vh;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ====== HEADER ====== */
.ts-header {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 12px rgba(30,90,150,0.08);
  padding: 16px 20px;
  border-left: 4px solid var(--primary-blue);
}

.ts-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.ts-title-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ts-title-block h1 {
  font-size: 22px;
  font-weight: 800;
  color: var(--primary-blue);
  margin: 0;
  letter-spacing: -0.4px;
}

.ts-badge {
  background: var(--danger);
  color: white;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(239,68,68,0.3);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,100% { box-shadow: 0 2px 8px rgba(239,68,68,0.3); }
  50% { box-shadow: 0 2px 14px rgba(239,68,68,0.55); }
}

/* Week Nav */
.ts-week-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  padding: 10px 18px;
  border-radius: 8px;
  border: 1.5px solid var(--primary-blue);
}

.ts-nav-btn {
  background: var(--primary-blue);
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 700;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ts-nav-btn:hover {
  background: var(--secondary-blue);
  transform: translateY(-1px);
}

.ts-date-range {
  font-size: 14px;
  font-weight: 700;
  color: #0d2d54;
  min-width: 240px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
}

/* Info row */
.ts-info-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
}

.ts-status-badge {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border: 1.5px solid;
}

.ts-status-badge.not-submitted {
  background: rgba(245,158,11,0.1);
  color: var(--warning);
  border-color: var(--warning);
}

.ts-status-badge.submitted {
  background: rgba(34,197,94,0.1);
  color: var(--success);
  border-color: var(--success);
}

.ts-due {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 700;
}

.ts-links {
  display: flex;
  gap: 20px;
  margin-left: auto;
}

.ts-link {
  font-size: 12px;
  color: var(--primary-blue);
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  padding-bottom: 1px;
  transition: all 0.2s;
}

.ts-link:hover {
  border-bottom-color: var(--primary-blue);
}

/* ====== ACTION BAR ====== */
.ts-action-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.ts-btn-count {
  background: var(--bg-light);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 9px 16px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  cursor: not-allowed;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'DM Sans', sans-serif;
}

.ts-btn-submit {
  background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
  color: white;
  border: none;
  padding: 9px 22px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
  box-shadow: 0 3px 10px rgba(30,90,150,0.2);
}

.ts-btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 16px rgba(30,90,150,0.3);
}

.ts-btn-secondary {
  background: white;
  color: var(--text-secondary);
  border: 1.5px solid var(--border-color);
  padding: 9px 16px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
}

.ts-btn-secondary:hover {
  background: var(--bg-light);
  border-color: var(--primary-blue);
  color: var(--primary-blue);
}

.ts-btn-refresh {
  background: white;
  color: var(--primary-blue);
  border: 1.5px solid var(--border-color);
  width: 38px;
  height: 38px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ts-btn-refresh:hover {
  background: var(--bg-light);
  border-color: var(--primary-blue);
  transform: rotate(90deg);
}

/* ====== CARD ====== */
.ts-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 10px rgba(30,90,150,0.06);
  padding: 20px;
}

.ts-card-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ====== TABLE ====== */
.ts-table-wrap {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  margin-bottom: 14px;
}

.ts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-family: 'DM Sans', sans-serif;
}

.ts-table thead {
  background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
}

.ts-table th {
  padding: 12px 10px;
  text-align: center;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-size: 10px;
  white-space: nowrap;
  border-right: 1px solid rgba(255,255,255,0.1);
}

.ts-table th.th-left {
  text-align: left;
  min-width: 180px;
}

.ts-table th.th-emp {
  min-width: 110px;
}

.ts-table th.th-day {
  min-width: 75px;
}

.ts-table th.th-total {
  min-width: 80px;
  background: rgba(255,255,255,0.12);
}

.ts-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}

.ts-table tbody tr:hover {
  background: rgba(30,90,150,0.03);
}

.ts-table td {
  padding: 10px;
  color: var(--text-primary);
  border-right: 1px solid var(--border-color);
  vertical-align: middle;
}

.ts-table td.td-hours {
  padding: 8px 5px;
  text-align: center;
}

.ts-table td.td-total {
  text-align: center;
  font-weight: 700;
  color: var(--primary-blue);
  background: var(--bg-light);
}

.ts-table td.td-action {
  text-align: center;
  border-right: none;
}

/* Input / Select */
.ts-select, .ts-input {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  font-family: 'DM Sans', sans-serif;
  color: var(--text-primary);
  background: white;
  transition: all 0.2s;
}

.ts-select:focus, .ts-input:focus {
  outline: none;
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 2px rgba(30,90,150,0.1);
}

.ts-input {
  text-align: center;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.ts-total-chip {
  background: var(--primary-blue);
  color: white;
  padding: 4px 10px;
  border-radius: 5px;
  font-weight: 700;
  display: inline-block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  min-width: 50px;
}

/* Total row */
.ts-total-row {
  background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
}

.ts-total-row td {
  padding: 12px 10px;
  color: white;
  font-weight: 700;
  font-size: 12px;
  border-right: 1px solid rgba(255,255,255,0.1);
  font-family: 'JetBrains Mono', monospace;
}

/* Delete btn */
.ts-btn-delete {
  background: transparent;
  color: var(--danger);
  border: 1.5px solid #fecaca;
  width: 28px;
  height: 28px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto;
}

.ts-btn-delete:hover {
  background: rgba(239,68,68,0.1);
  border-color: var(--danger);
}

/* Add row btn */
.ts-btn-add-row {
  background: white;
  color: var(--primary-blue);
  border: 2px dashed var(--primary-blue);
  padding: 11px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.2s;
  width: 100%;
  letter-spacing: 0.3px;
}

.ts-btn-add-row:hover {
  background: var(--bg-light);
  color: #0d2d54;
}

/* No data */
.ts-no-data {
  text-align: center;
  padding: 28px;
  color: var(--text-secondary);
  font-size: 12px;
  font-style: italic;
  margin: 0;
}

/* ====== UPLOAD LOCK BANNER ====== */
.ts-lock-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(245,158,11,0.08);
  border: 1.5px solid var(--warning);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
}

.ts-lock-icon {
  font-size: 16px;
}
`;

function injectStyle(id, css) {
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}

/* ======================================= */
/* WEEK LOGIC — Mon-to-Sun, date-anchored */
/* ======================================= */

/**
 * RULES:
 *  - Week 1 : from the 1st of the month → up to and including the first Sunday
 *             (i.e. whatever day 1st falls on, the week runs until the Sunday of that week)
 *  - Week 2 : next Monday → next Sunday
 *  - Week 3 : next Monday → next Sunday
 *  - Week 4 (last) : next Monday → END OF MONTH (absorbs all remaining days,
 *             even if month ends before Sunday — can exceed 7 days if tail exists)
 *  - NEXT MONTH always starts fresh from its own 1st
 *  - Sunday IS included (employees can log comp-off hours)
 *  - Sunday columns are visually highlighted
 */

function makeDay(date) {
  return {
    label: date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
    }),
    full: new Date(date),
    dayOfWeek: date.getDay(),
    isSunday: date.getDay() === 0,
  };
}

/**
 * Build all weeks for a given year+month.
 *
 * FIRST WEEK: starts on the 1st. Always ends on the NEXT Sunday
 *   (if 1st is already Sunday, still go to the following Sunday → 8-day week).
 *
 * MIDDLE WEEKS: Mon → Sun (7 days).
 *
 * LAST WEEK RULE: After building all weeks, check the last week's start date.
 *   If it starts AFTER date 24, it cannot be a standalone week — merge it
 *   into the previous week. This way the final week always starts on 24 or earlier
 *   and absorbs all remaining month days.
 *
 * Next month always starts fresh from its own 1st.
 */
function buildMonthWeeks(year, month) {
  const lastDate = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let d = 1;

  while (d <= lastDate) {
    const startDate = new Date(year, month, d);
    const startDow = startDate.getDay();

    // Always go to NEXT Sunday (never stop on same-day Sunday)
    const daysUntilNextSunday = startDow === 0 ? 7 : 7 - startDow;
    const sundayDateNum = d + daysUntilNextSunday;

    // End at Sunday or month end, whichever comes first
    const endD = Math.min(sundayDateNum, lastDate);

    const weekDays = [];
    for (let i = d; i <= endD; i++) {
      weekDays.push(makeDay(new Date(year, month, i)));
    }

    weeks.push(weekDays);
    d = endD + 1;
  }

  // POST-PROCESS: if the last week has fewer than 7 days,
  // merge it into the previous week
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

function getPrevWeekAnchor(weekDates) {
  const firstDate = weekDates[0].full;
  // Go one day before the start of this week
  const prev = new Date(firstDate);
  prev.setDate(firstDate.getDate() - 1);
  return prev;
}

function getNextWeekAnchor(weekDates) {
  const lastDate = weekDates[weekDates.length - 1].full;
  // Go one day after the end of this week
  const next = new Date(lastDate);
  next.setDate(lastDate.getDate() + 1);
  return next;
}

function isUploadAllowed(weekDates) {
  if (!weekDates.length) return false;
  const lastDay = new Date(weekDates[weekDates.length - 1].full);
  lastDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= lastDay;
}

/* ============================= */
/* MOCK WBS */
/* ============================= */
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

/* ============================= */
/* COMPONENT */
/* ============================= */
export default function Timesheet() {
  injectStyle("ts-styles", css);

  const [currentDate, setCurrentDate] = useState(new Date("2026-03-23"));
  const [rows, setRows] = useState([
    {
      id: 1,
      projectCode: "",
      employeeType: "Labour",
      tasks: [
        {
          taskCode: "",
          hours: [],
        },
      ],
    },
  ]);
  const [submissionStatus, setSubmissionStatus] = useState("NOT SUBMITTED");

  const weekDates = getWeekDates(currentDate);
  const canSubmit = isUploadAllowed(weekDates);

  /* ---- Navigation ---- */
  const nextWeek = () => {
    setCurrentDate(getNextWeekAnchor(weekDates));
    setSubmissionStatus("NOT SUBMITTED");
  };

  const prevWeek = () => {
    setCurrentDate(getPrevWeekAnchor(weekDates));
    setSubmissionStatus("NOT SUBMITTED");
  };

  const addTaskToRow = (rowId) => {
    setRows(
      rows.map((row) => {
        if (row.id !== rowId) return row;

        return {
          ...row,
          tasks: [
            ...row.tasks,
            {
              taskCode: "",
              hours: Array(weekDates.length).fill(""),
            },
          ],
        };
      }),
    );
  };

  /* ---- Formatting ---- */
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

  /* ---- Row ops ---- */
  const handleProjectSelect = (id, projectCode) => {
    setRows(
      rows.map((r) =>
        r.id === id
          ? { ...r, projectCode, taskCode: "" } // reset task when project changes
          : r,
      ),
    );
  };

  const handleTaskSelect = (rowId, taskIndex, value) => {
    setRows(
      rows.map((row) => {
        if (row.id !== rowId) return row;

        const updatedTasks = [...row.tasks];
        updatedTasks[taskIndex].taskCode = value;

        return { ...row, tasks: updatedTasks };
      }),
    );
  };

  const handleEmpType = (id, val) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, employeeType: val } : r)));
  };

  const handleHours = (rowId, taskIndex, dayIndex, value) => {
    setRows(
      rows.map((row) => {
        if (row.id !== rowId) return row;

        const updatedTasks = [...row.tasks];
        const hours = [...updatedTasks[taskIndex].hours];
        hours[dayIndex] = value;

        updatedTasks[taskIndex].hours = hours;

        return { ...row, tasks: updatedTasks };
      }),
    );
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        projectCode: "",
        taskCode: "",
        employeeType: "Labour",
        hours: Array(weekDates.length).fill(""),
      },
    ]);
  };

  const deleteRow = (id) => {
    if (rows.length > 1) setRows(rows.filter((r) => r.id !== id));
  };

  /* ---- Totals ---- */
  const rowTotal = (h) =>
    (h || []).reduce((a, b) => a + Number(b || 0), 0).toFixed(2);
  const dayTotal = (idx) =>
    rows.reduce((s, r) => s + Number((r.hours || [])[idx] || 0), 0).toFixed(2);
  const grandTotal = () =>
    rows
      .reduce(
        (s, r) => s + (r.hours || []).reduce((a, b) => a + Number(b || 0), 0),
        0,
      )
      .toFixed(2);
  const entryCount = () =>
    rows.reduce(
      (c, r) =>
        c + (r.hours || []).filter((h) => h !== "" && Number(h) > 0).length,
      0,
    );

  /* ---- Submit ---- */
  const handleSubmit = () => {
    if (!canSubmit) {
      alert(
        "Timesheet can only be submitted on or after the last working day of the week.",
      );
      return;
    }
    if (rows.some((r) => !r.projectCode || !r.taskCode)) {
      alert("Please select Project and Task for all rows.");
      return;
    }
    if (Number(grandTotal()) === 0) {
      alert("Please enter time entries before submitting.");
      return;
    }
    setSubmissionStatus("SUBMITTED");
    alert(`Timesheet submitted with ${grandTotal()} hours!`);
  };

  const handleClearAll = () => {
    if (confirm("Clear all time entries?")) {
      setRows(
        rows.map((r) => ({ ...r, hours: Array(weekDates.length).fill("") })),
      );
    }
  };

  const handleQuickFill = () => {
    const h = prompt("Enter hours for all working days:", "8");
    if (h && !isNaN(h) && Number(h) > 0) {
      setRows(
        rows.map((r) => ({ ...r, hours: Array(weekDates.length).fill(h) })),
      );
    }
  };

  return (
    <div className="ts-page">
      {/* HEADER */}
      <div className="ts-header">
        <div className="ts-header-top">
          <div className="ts-title-block">
            <h1>TIMESHEET</h1>
            <span className="ts-badge">{entryCount()}</span>
          </div>
          <div className="ts-week-nav">
            <button
              className="ts-nav-btn"
              onClick={prevWeek}
              title="Previous week"
            >
              ‹
            </button>
            <div className="ts-date-range">{formatRange()}</div>
            <button className="ts-nav-btn" onClick={nextWeek} title="Next week">
              ›
            </button>
          </div>
        </div>

        <div className="ts-info-row">
          <span
            className={`ts-status-badge ${submissionStatus === "SUBMITTED" ? "submitted" : "not-submitted"}`}
          >
            {submissionStatus}
          </span>
          <span className="ts-due">📅 Due: {getDueDate()}</span>
          <div className="ts-links">
            <a href="#approvers" className="ts-link">
              See all approvers
            </a>
            <a href="#timesheets" className="ts-link">
              See all timesheets
            </a>
          </div>
        </div>
      </div>

      {/* LOCK BANNER */}
      {!canSubmit && (
        <div className="ts-lock-banner">
          <span className="ts-lock-icon">🔒</span>
          <span>
            Submission locked. Timesheet for <strong>{formatRange()}</strong>{" "}
            can only be submitted on or after <strong>{getDueDate()}</strong>.
          </span>
        </div>
      )}

      {/* ACTION BAR */}
      <div className="ts-action-bar">
        <button className="ts-btn-count">{entryCount()} TIME ENTRY(IES)</button>
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

      {/* TABLE */}
      <div className="ts-card">
        <h3 className="ts-card-title">
          ⏱ Time Distribution
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: "var(--primary-blue)",
              background: "rgba(30,90,150,0.08)",
              padding: "3px 10px",
              borderRadius: "5px",
              fontWeight: 700,
            }}
          >
            {weekDates.length} day{weekDates.length !== 1 ? "s" : ""} incl.
            Sunday
          </span>
        </h3>

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
                    className="th-day"
                    style={
                      d.isSunday
                        ? {
                            background: "rgba(139,92,246,0.25)",
                            color: "#e0d0ff",
                            borderRight: "1px solid rgba(139,92,246,0.3)",
                          }
                        : {}
                    }
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
                  </th>
                ))}
                <th className="th-total">Total Hrs</th>
                <th style={{ minWidth: 50, borderRight: "none" }}>Del</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {/* PROJECT */}
                  <td>
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
                  </td>

                  {/* TASK — filtered by selected project */}
                  <td>
                    {row.tasks.map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginBottom: "4px",
                        }}
                      >
                        <select
                          className="ts-select"
                          value={task.taskCode}
                          onChange={(e) =>
                            handleTaskSelect(row.id, taskIndex, e.target.value)
                          }
                          disabled={!row.projectCode}
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

                        {/* ➕ button */}
                        {taskIndex === row.tasks.length - 1 && (
                          <button
                            onClick={() => addTaskToRow(row.id)}
                            style={{
                              width: "28px",
                              height: "28px",
                              cursor: "pointer",
                            }}
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </td>

                  {/* EMPLOYEE TYPE */}
                  <td>
                    <select
                      className="ts-select"
                      value={row.employeeType}
                      onChange={(e) => handleEmpType(row.id, e.target.value)}
                    >
                      <option value="Labour">Labour</option>
                      <option value="Employee">Employee</option>
                    </select>
                  </td>
                  {weekDates.map((day, di) => (
                    <td
                      key={di}
                      className="td-hours"
                      style={
                        day.isSunday
                          ? {
                              background: "rgba(139,92,246,0.06)",
                              borderRight: "1px solid rgba(139,92,246,0.15)",
                            }
                          : {}
                      }
                    >
                      <input
                        type="number"
                        className="ts-input"
                        placeholder="0"
                        min="0"
                        max="24"
                        value={(row.hours || [])[di] || ""}
                        onChange={(e) =>
                          handleHours(row.id, di, e.target.value)
                        }
                        style={
                          day.isSunday
                            ? {
                                borderColor: "rgba(139,92,246,0.4)",
                                color: "#6d28d9",
                              }
                            : {}
                        }
                      />
                    </td>
                  ))}
                  <td className="td-total">
                    <span className="ts-total-chip">{rowTotal(row.hours)}</span>
                  </td>
                  <td className="td-action">
                    <button
                      className="ts-btn-delete"
                      onClick={() => deleteRow(row.id)}
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}

              {/* TOTAL ROW */}
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
                <td style={{ borderRight: "none" }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <button className="ts-btn-add-row" onClick={addRow}>
          + ADD NEW TASK ROW
        </button>
      </div>

      {/* TIME OFF */}
      <div className="ts-card">
        <h3 className="ts-card-title">🏖 Time Off</h3>
        <p className="ts-no-data">
          There are no time off bookings on this timesheet.
        </p>
      </div>
    </div>
  );
}
