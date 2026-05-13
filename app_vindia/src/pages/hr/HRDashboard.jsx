import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/HRDashboard.css";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

// ─── Check In / Out Button ───────────────────────────────────────────────────

const CheckInButton = ({ employeeId }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(false);
  const [elapsed, setElapsed]       = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTodayAttendance();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (attendance?.check_in && !attendance?.check_out) {
      const tick = () => {
        const [h, m, s] = attendance.check_in.split(":").map(Number);
        const inMs = (h * 3600 + m * 60 + s) * 1000;
        const nowMs = new Date() - new Date().setHours(0, 0, 0, 0);
        const diff = Math.max(0, nowMs - inMs);
        const th = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const tm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const ts = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setElapsed(`${th}:${tm}:${ts}`);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed("");
    }
  }, [attendance]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/attendance/today?employee_id=${employeeId}`
      );
      setAttendance(res.data || null);
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const dateStr = now.toISOString().slice(0, 10);

      const shiftStart = new Date();
      shiftStart.setHours(9, 0, 0, 0);
      const lateMs = Math.max(0, now - shiftStart);
      const lateMinutes = Math.floor(lateMs / 60000);

      const res = await axios.post("http://localhost:5000/api/attendance", {
        employee_id: employeeId,
        date: dateStr,
        check_in: timeStr,
        status: "Present",
        shift: "morning",
        late_minutes: lateMinutes,
        remarks: lateMinutes > 0 ? `Late by ${lateMinutes} min` : "",
      });
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
      alert("Check-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendance?.id) return;
    setBusy(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);

      const res = await axios.put(
        `http://localhost:5000/api/attendance/${attendance.id}`,
        { check_out: timeStr }
      );
      setAttendance(res.data);
      clearInterval(timerRef.current);
    } catch (err) {
      console.error(err);
      alert("Check-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const isCheckedIn  = attendance?.check_in && !attendance?.check_out;
  const isCheckedOut = attendance?.check_in && attendance?.check_out;

  if (loading) {
    return (
      <button
        disabled
        style={{
          padding: "8px 18px", borderRadius: 10, border: "1.5px solid #e2e8f0",
          background: "#f8fafc", color: "#94a3b8", fontSize: 13, fontWeight: 600,
          cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#cbd5e1", display: "inline-block" }} />
        Loading…
      </button>
    );
  }

  if (isCheckedOut) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <button
          disabled
          style={{
            padding: "8px 18px", borderRadius: 10, border: "1.5px solid #86efac",
            background: "#f0fdf4", color: "#16a34a", fontSize: 13, fontWeight: 700,
            cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
          ✓ Done for Today
        </button>
        <span style={{ fontSize: 10, color: "#64748b" }}>
          {fmtTime(attendance.check_in)} – {fmtTime(attendance.check_out)}
        </span>
      </div>
    );
  }

  if (isCheckedIn) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <button
          onClick={handleCheckOut}
          disabled={busy}
          style={{
            padding: "8px 18px", borderRadius: 10, border: "none",
            background: busy ? "#fca5a5" : "#dc2626",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all .2s",
            boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#fff",
            display: "inline-block",
            animation: "pulse 1.2s ease-in-out infinite",
          }} />
          {busy ? "Saving…" : "Check Out"}
        </button>
        <span style={{ fontSize: 10, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
          In: {fmtTime(attendance.check_in)}
          {elapsed && <> &nbsp;·&nbsp; <strong style={{ color: "#2563eb" }}>{elapsed}</strong></>}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleCheckIn}
      disabled={busy}
      style={{
        padding: "8px 18px", borderRadius: 10, border: "none",
        background: busy ? "#86efac" : "#16a34a",
        color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: busy ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 6,
        transition: "all .2s",
        boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
      {busy ? "Saving…" : "Check In"}
    </button>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

const STAT_GRADIENTS = {
  navy:  "linear-gradient(135deg, #001D39 0%, #0A4174 100%)",
  teal:  "linear-gradient(135deg, #093d2e 0%, #0d5c42 100%)",
  blue:  "linear-gradient(135deg, #0A4174 0%, #49769F 100%)",
  sky:   "linear-gradient(135deg, #4E8EA2 0%, #7BBDE8 100%)",
};

function StatCard({ label, value, icon, colorKey }) {
  return (
    <div
      className="stat-card"
      style={{ background: STAT_GRADIENTS[colorKey] }}
    >
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value ?? "—"}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

// ─── Calendar ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function TrainingCalendar({ employees }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notes, setNotes] = useState({});
  const [selected, setSelected] = useState(null);
  const [noteInput, setNoteInput] = useState("");

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const birthdayDays = {};
  (employees || []).forEach((emp) => {
    if (!emp.dob) return;
    const bd = new Date(emp.dob);
    if (bd.getMonth() === month) {
      const day = bd.getDate();
      if (!birthdayDays[day]) birthdayDays[day] = [];
      birthdayDays[day].push(emp.name);
    }
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  function selectMonth(m) {
    setMonth(m);
    setDropdownOpen(false);
    setSelected(null);
  }

  function handleDayClick(day) {
    setSelected(day);
    setNoteInput(notes[`${year}-${month}-${day}`] || "");
  }

  function saveNote() {
    if (selected) {
      setNotes(prev => ({ ...prev, [`${year}-${month}-${selected}`]: noteInput }));
      setSelected(null);
    }
  }

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <div className="calendar-month-selector">
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <div className="month-dropdown-wrap">
            <button
              className="month-dropdown-trigger"
              onClick={() => setDropdownOpen(o => !o)}
            >
              {MONTH_NAMES[month]} {year}
              <span className="dropdown-arrow">{dropdownOpen ? "▲" : "▼"}</span>
            </button>
            {dropdownOpen && (
              <div className="month-dropdown-menu">
                {MONTH_NAMES.map((name, i) => (
                  <button
                    key={i}
                    className={`month-option ${i === month ? "month-option--active" : ""}`}
                    onClick={() => selectMonth(i)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>
      </div>

      <div className="calendar-grid">
        {dayLabels.map((d, i) => (
          <div key={i} className="cal-day-label">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          const hasNote = !!notes[`${year}-${month}-${day}`];
          const hasBirthday = !!birthdayDays[day];
          const isSelected = selected === day;

          return (
            <div
              key={day}
              className={[
                "cal-day",
                isToday ? "cal-today" : "",
                hasNote ? "cal-has-note" : "",
                hasBirthday ? "cal-birthday" : "",
                isSelected ? "cal-selected" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => handleDayClick(day)}
              title={hasBirthday ? `🎂 ${birthdayDays[day].join(", ")}` : ""}
            >
              {day}
              {hasBirthday && <span className="birthday-dot" />}
            </div>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><span className="legend-dot today-dot" /> Today</span>
        <span><span className="legend-dot note-dot" /> Reminder</span>
        <span><span className="legend-dot bday-dot" /> Birthday</span>
      </div>

      {selected && (
        <div className="note-editor">
          <p className="note-editor-title">{MONTH_NAMES[month]} {selected}</p>
          {birthdayDays[selected] && (
            <p className="birthday-notice">🎂 {birthdayDays[selected].join(", ")}</p>
          )}
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Add a reminder…"
            rows={2}
          />
          <div className="note-actions">
            <button onClick={saveNote} className="note-save">Save</button>
            <button onClick={() => setSelected(null)} className="note-cancel">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Attendance Donut ────────────────────────────────────────────────────────

function AttendanceDonut({ present, absent, onLeave, total }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const pPresent = total ? present / total : 0;
  const pAbsent = total ? absent / total : 0;
  const pLeave = total ? onLeave / total : 0;
  const seg1 = pPresent * circ;
  const seg2 = pAbsent * circ;
  const seg3 = pLeave * circ;

  return (
    <div className="attendance-donut-wrap">
      <svg viewBox="0 0 110 110" width="110" height="110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e8f0f7" strokeWidth="10" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="#7BBDE8"
          strokeWidth="10"
          strokeDasharray={`${seg1} ${circ - seg1}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="butt" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="#0A4174"
          strokeWidth="10"
          strokeDasharray={`${seg2} ${circ - seg2}`}
          strokeDashoffset={circ / 4 - seg1}
          strokeLinecap="butt" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="#BDD8E9"
          strokeWidth="10"
          strokeDasharray={`${seg3} ${circ - seg3}`}
          strokeDashoffset={circ / 4 - seg1 - seg2}
          strokeLinecap="butt" />
        <text x="55" y="51" textAnchor="middle" fontSize="14" fontWeight="700" fill="#001D39">{total}</text>
        <text x="55" y="64" textAnchor="middle" fontSize="8" fill="#6EA2B3">Total</text>
      </svg>
      <div className="donut-legend">
        <span><span className="legend-dot" style={{ background: "#7BBDE8" }} /> Present <strong>{present}</strong></span>
        <span><span className="legend-dot" style={{ background: "#0A4174" }} /> Absent <strong>{absent}</strong></span>
        <span><span className="legend-dot" style={{ background: "#BDD8E9" }} /> On Leave <strong>{onLeave}</strong></span>
      </div>
    </div>
  );
}

// ─── New Joiners Bar Chart ───────────────────────────────────────────────────

function NewJoinersChart({ employees }) {
  const monthCounts = {};
  const monthLabels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleString("default", { month: "short" });
    monthCounts[key] = 0;
    monthLabels.push({ key, label });
  }
  (employees || []).forEach((emp) => {
    if (!emp.join_date) return;
    const d = new Date(emp.join_date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in monthCounts) monthCounts[key]++;
  });
  const values = monthLabels.map((m) => monthCounts[m.key]);
  const max = Math.max(...values, 1);

  return (
    <div className="joiners-chart">
      <div className="chart-bars">
        {monthLabels.map((m, i) => (
          <div key={m.key} className="bar-col">
            <span className="bar-val">{values[i]}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${(values[i] / max) * 100}%` }} />
            </div>
            <span className="bar-label">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

function HRDashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [hrName] = useState("Amanda");

  // ── Get employee_id from localStorage (same pattern as ProjectCoordinatorDashboard) ──
  const employeeId =
    JSON.parse(localStorage.getItem("user") || "{}")?.employee_id ||
    JSON.parse(localStorage.getItem("user") || "{}")?.id ||
    null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, dashRes] = await Promise.all([
          axios.get("http://localhost:5000/api/employees"),
          axios.get("http://localhost:5000/api/dashboard"),
        ]);
        setEmployees(empRes.data);
        setDashboard(dashRes.data);
      } catch (err) {
        console.error("Dashboard error:", err);
      }
    };
    fetchData();
  }, []);

  const total = employees.length;
  const active = employees.filter((e) => e.status === "active").length;
  const onLeave = employees.filter((e) => e.status === "on_leave").length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newJoiners = employees.filter(
    (e) => e.join_date && new Date(e.join_date) >= thirtyDaysAgo
  ).length;

  const pendingLeaves = (dashboard?.pending || []).filter(
    (r) => r.status === "pending"
  ).length;

  const present = dashboard?.attendance?.present ?? Math.round(active * 0.85);
  const absent = dashboard?.attendance?.absent ?? Math.round(active * 0.1);
  const attendanceOnLeave = dashboard?.attendance?.on_leave ?? onLeave;

  const statCards = [
    { label: "Total Employees", value: total,      icon: "👥", colorKey: "navy" },
    { label: "Active Employees", value: active,    icon: "✅", colorKey: "teal" },
    { label: "New Joiners",      value: newJoiners, icon: "🌟", colorKey: "blue" },
    { label: "On Leave",         value: onLeave,   icon: "🗓️", colorKey: "sky"  },
  ];

  const pendingRequests = (dashboard?.pending || [])
    .filter((r) => r.status === "pending")
    .slice(0, 4);

  return (
    <div className="hr-dashboard-v2">
      {/* ── Top Bar ── */}
      <div className="top-bar">
        <div className="greeting-block">
          <h1 className="greeting-name">{getGreeting()}, {hrName}!</h1>
          <p className="greeting-sub">Here's what's happening in your organization today</p>
        </div>
        <div className="top-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input placeholder="Search employees…" />
          </div>

          {/* ── CHECK IN / OUT — same as ProjectCoordinatorDashboard ── */}
          {employeeId && <CheckInButton employeeId={employeeId} />}

          <button className="upgrade-btn" onClick={() => navigate("/hr/employees")}>
            All Employees
          </button>
        </div>
      </div>

      {/* ── Row 1 ── */}
      <div className="row-1">
        <div className="employee-stats-card">
          <div className="card-header-line">
            <span className="card-title">Employee Overview</span>
            <span className="card-subtitle">Today</span>
          </div>
          <div className="stat-cards-grid">
            {statCards.map((c, i) => <StatCard key={i} {...c} />)}
          </div>
        </div>

        <TrainingCalendar employees={employees} />
      </div>

      {/* ── Row 2 ── */}
      <div className="row-2">
        {/* Attendance */}
        <div className="bottom-card attendance-card">
          <div className="card-header-line">
            <span className="card-title">Attendance Today</span>
          </div>
          <AttendanceDonut
            present={present}
            absent={absent}
            onLeave={attendanceOnLeave}
            total={present + absent + attendanceOnLeave || total}
          />
        </div>

        {/* Pending Leaves */}
        <div className="bottom-card pending-leaves-card">
          <div className="card-header-line">
            <span className="card-title">Pending Leave Requests</span>
            <button className="add-new-btn" onClick={() => navigate("/hr/leaves")}>
              View All <span>→</span>
            </button>
          </div>
          <div className="leaves-scroll">
            {pendingRequests.length === 0 && (
              <p className="empty-msg">No pending requests 🎉</p>
            )}
            {pendingRequests.map((req, i) => (
              <div key={i} className="leave-row">
                <div className="leave-avatar">
                  {(req.employee_name || req.name || "?")[0].toUpperCase()}
                </div>
                <div className="leave-info">
                  <p className="leave-name">{req.employee_name || req.name}</p>
                  <p className="leave-meta">
                    {req.leave_type || "Leave"} · {req.from_date || req.start_date} → {req.to_date || req.end_date}
                  </p>
                </div>
                <button className="approve-btn" onClick={() => navigate("/hr/leaves")}>
                  Approve
                </button>
              </div>
            ))}
          </div>
          {pendingLeaves > 0 && (
            <div className="pending-summary">
              <span className="pending-badge">{pendingLeaves}</span>
              <span className="pending-label">total pending requests</span>
            </div>
          )}
        </div>

        {/* New Joiners */}
        <div className="bottom-card joiners-card">
          <div className="card-header-line">
            <span className="card-title">New Joiners</span>
            <span className="card-badge">{newJoiners} this month</span>
          </div>
          <NewJoinersChart employees={employees} />
        </div>
      </div>
    </div>
  );
}

export default HRDashboard;