import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/HRDashboard.css";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    <div className={`hd-card ${className}`}>
      <div className="hd-card-head">
        <div>
          <h3 className="hd-card-title">{title}</h3>
          <p className="hd-card-subtitle">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone, sub }) {
  return (
    <div className="hd-kpi-card">
      <div className={`hd-kpi-strip hd-${tone}`} />
      <div className="hd-kpi-body">
        <div className="hd-kpi-label">{label}</div>
        <div className="hd-kpi-value">{value ?? "—"}</div>
        <div className="hd-kpi-sub">{sub}</div>
      </div>
    </div>
  );
}

const CheckInButton = ({ employeeId }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState("");
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
      const res = await axios.post("http://localhost:5000/api/attendance", {
        employee_id: employeeId,
        date: dateStr,
        check_in: timeStr,
        shift: "Morning",
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

  const isCheckedIn = attendance?.check_in && !attendance?.check_out;
  const isCheckedOut = attendance?.check_in && attendance?.check_out;

  if (loading) return <button className="hd-action-btn hd-loading" disabled>Loading…</button>;

  if (isCheckedOut) {
    return (
      <div className="hd-check-wrap">
        <button className="hd-action-btn hd-done" disabled>Done for Today</button>
        <span className="hd-check-sub">{fmtTime(attendance.check_in)} – {fmtTime(attendance.check_out)}</span>
      </div>
    );
  }

  if (isCheckedIn) {
    return (
      <div className="hd-check-wrap">
        <button className="hd-action-btn hd-out" onClick={handleCheckOut} disabled={busy}>
          {busy ? "Saving…" : "Check Out"}
        </button>
        <span className="hd-check-sub">
          In: {fmtTime(attendance.check_in)} {elapsed ? <strong>{elapsed}</strong> : null}
        </span>
      </div>
    );
  }

  return (
    <button className="hd-action-btn hd-in" onClick={handleCheckIn} disabled={busy}>
      {busy ? "Saving…" : "Check In"}
    </button>
  );
};

function AttendanceRing({ present, absent, leave }) {
  const total = present + absent + leave || 1;
  const p = Math.round((present / total) * 100);
  const a = Math.round((absent / total) * 100);
  return (
    <div className="hd-att-wrap">
      <div
        className="hd-ring"
        style={{
          background: `conic-gradient(#7BBDE8 0 ${p}%, #0A4174 ${p}% ${p + a}%, #BDD8E9 ${p + a}% 100%)`,
        }}
      >
        <div className="hd-ring-center">
          <div className="hd-ring-number">{total}</div>
          <div className="hd-ring-label">Total</div>
        </div>
      </div>
      <div className="hd-legend">
        <div><span className="dot present" />Present <strong>{present}</strong></div>
        <div><span className="dot absent" />Absent <strong>{absent}</strong></div>
        <div><span className="dot leave" />On Leave <strong>{leave}</strong></div>
      </div>
    </div>
  );
}

function BarChart({ data = [] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="hd-bars">
      {data.map((d) => (
        <div key={d.label} className="hd-bar-col">
          <div className="hd-bar-value">{d.value}</div>
          <div className="hd-bar-track">
            <div className="hd-bar-fill" style={{ height: `${(d.value / max) * 100}%` }} />
          </div>
          <div className="hd-bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function SmallCalendar({ employees }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [events, setEvents] = useState({});
  const [selected, setSelected] = useState(null);
  const [eventText, setEventText] = useState("");
  const [eventType, setEventType] = useState("note");

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const birthdays = {};
  (employees || []).forEach((emp) => {
    if (!emp.dob) return;
    const bd = new Date(emp.dob);
    if (bd.getMonth() === month) {
      const day = bd.getDate();
      if (!birthdays[day]) birthdays[day] = [];
      birthdays[day].push(emp.name);
    }
  });

  const monthKey = (day) => `${year}-${month}-${day}`;

  const handleDayClick = (day) => {
    setSelected(day);
    const existing = events[monthKey(day)];
    setEventText(existing?.text || "");
    setEventType(existing?.type || "note");
  };

  const saveEvent = () => {
    if (!selected || !eventText.trim()) return;
    setEvents((prev) => ({
      ...prev,
      [monthKey(selected)]: { text: eventText.trim(), type: eventType },
    }));
    setSelected(null);
    setEventText("");
    setEventType("note");
  };

  const deleteEvent = () => {
    if (!selected) return;
    setEvents((prev) => {
      const copy = { ...prev };
      delete copy[monthKey(selected)];
      return copy;
    });
    setSelected(null);
    setEventText("");
    setEventType("note");
  };

  const labels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <SectionCard title="Calendar" subtitle="Birthdays and reminders">
      <div className="cal-mini-head">
        <button className="cal-nav-btn" onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelected(null); }}>‹</button>
        <div className="month-dropdown-wrap">
          <button className="month-dropdown-trigger" onClick={() => setDropdownOpen((o) => !o)}>
            {MONTH_NAMES[month]} {year} <span>{dropdownOpen ? "▲" : "▼"}</span>
          </button>
          {dropdownOpen && (
            <div className="month-dropdown-menu">
              {MONTH_NAMES.map((name, i) => (
                <button
                  key={i}
                  className={`month-option ${i === month ? "month-option--active" : ""}`}
                  onClick={() => { setMonth(i); setDropdownOpen(false); setSelected(null); }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="cal-nav-btn" onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelected(null); }}>›</button>
      </div>

      <div className="calendar-grid calendar-grid-small">
        {labels.map((d, i) => <div key={i} className="cal-day-label">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayKey = monthKey(day);
          const event = events[dayKey];
          const hasBirthday = !!birthdays[day];
          const isSelected = selected === day;
          return (
            <div
              key={day}
              className={[
                "cal-day",
                isToday ? "cal-today" : "",
                event ? `cal-${event.type}` : "",
                hasBirthday ? "cal-birthday" : "",
                isSelected ? "cal-selected" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => handleDayClick(day)}
              title={[
                hasBirthday ? `Birthday: ${birthdays[day].join(", ")}` : "",
                event?.text ? event.text : "",
              ].filter(Boolean).join(" • ")}
            >
              {day}
              {(hasBirthday || event) && <span className="day-badge" />}
            </div>
          );
        })}
      </div>

      <div className="cal-legend cal-legend-small">
        <span><span className="legend-dot today-dot" /> Today</span>
        <span><span className="legend-dot note-dot" /> Note</span>
        <span><span className="legend-dot bday-dot" /> Birthday</span>
      </div>

      {selected && (
        <div className="note-editor note-editor-small">
          <div className="note-editor-title">{MONTH_NAMES[month]} {selected}</div>
          {birthdays[selected] && (
            <div className="birthday-notice">Birthday: {birthdays[selected].join(", ")}</div>
          )}
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="event-select">
            <option value="note">Important note</option>
            <option value="birthday">Birthday</option>
            <option value="holiday">Holiday</option>
          </select>
          <textarea
            value={eventText}
            onChange={(e) => setEventText(e.target.value)}
            placeholder="Add a birthday, reminder, or important event…"
            rows={3}
          />
          <div className="note-actions">
            <button onClick={saveEvent} className="note-save">Save</button>
            <button onClick={deleteEvent} className="note-cancel">Delete</button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default function HRDashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const hrName = user?.name || user?.full_name || user?.username || user?.first_name || "there";
  const employeeId = user?.employee_id || user?.id || null;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [empRes, dashRes, attRes] = await Promise.all([
          axios.get("http://localhost:5000/api/employees"),
          axios.get("http://localhost:5000/api/dashboard"),
          axios.get("http://localhost:5000/api/attendance"),
        ]);
        setEmployees(empRes.data || []);
        setDashboard(dashRes.data || null);
        setAttendanceRows(attRes.data || []);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
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

  const present = dashboard?.attendance?.present ?? Math.round(active * 0.85);
  const absent = dashboard?.attendance?.absent ?? Math.round(active * 0.1);
  const attendanceOnLeave = dashboard?.attendance?.on_leave ?? onLeave;

  const recentJoiners = [...employees]
    .filter((e) => e.join_date)
    .sort((a, b) => new Date(b.join_date) - new Date(a.join_date))
    .slice(0, 5);

  const departmentMap = employees.reduce((acc, e) => {
    const key = e.department || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const departmentData = Object.entries(departmentMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  const attendanceTrend = useMemo(() => {
    const counts = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      counts[d.toLocaleString("default", { month: "short" })] = 0;
    }
    attendanceRows.forEach((r) => {
      if (!r.date) return;
      const month = new Date(r.date).toLocaleString("default", { month: "short" });
      if (month in counts && String(r.status).toLowerCase() === "present") counts[month]++;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [attendanceRows]);

  const kpis = [
    { label: "Total Employees", value: total, sub: "Company headcount", tone: "navy" },
    { label: "Active Employees", value: active, sub: "Currently employed", tone: "teal" },
    { label: "Present Today", value: present, sub: "Checked in today", tone: "blue" },
    { label: "New Joiners", value: newJoiners, sub: "Last 30 days", tone: "sky" },
  ];

  return (
    <div className="hd-page">
      <div className="hd-top">
        <div>
          <div className="hd-greet">{getGreeting()}, {hrName}!</div>
          <div className="hd-greet-sub">Operational HR overview for your team.</div>
        </div>

        <div className="hd-top-actions">
          <div className="hd-search">
            <span className="hd-search-icon">Search</span>
            <input placeholder="Search employees…" />
          </div>
          {employeeId && <CheckInButton employeeId={employeeId} />}
          <button className="hd-secondary-btn" onClick={() => navigate("/hr/employees")}>
            All Employees
          </button>
        </div>
      </div>

      <div className="hd-kpi-grid">
        {kpis.map((k) => <StatCard key={k.label} {...k} />)}
      </div>

      <div className="hd-grid-top">
        <SectionCard title="Attendance Today" subtitle="Present, absent, and on leave">
          <AttendanceRing present={present} absent={absent} leave={attendanceOnLeave} />
        </SectionCard>

        <SectionCard title="Department Mix" subtitle="Employees by department">
          {departmentData.length === 0
            ? <div className="hd-empty">No department data available.</div>
            : <BarChart data={departmentData} />}
        </SectionCard>

        <SmallCalendar employees={employees} />
      </div>

      <div className="hd-grid-bottom">
        <SectionCard title="Recent Joiners" subtitle="Newest employees in the company">
          <div className="hd-list">
            {recentJoiners.length === 0 ? (
              <div className="hd-empty">No recent joiners.</div>
            ) : (
              recentJoiners.map((emp) => (
                <div className="hd-row" key={emp.id || emp.employee_id}>
                  <div className="hd-avatar hd-soft">{(emp.name || "E")[0].toUpperCase()}</div>
                  <div className="hd-row-body">
                    <div className="hd-row-title">{emp.name || "Employee"}</div>
                    <div className="hd-row-sub">{emp.department || "—"} · Joined {fmtDate(emp.join_date)}</div>
                  </div>
                  <div className="hd-tag">New</div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Attendance Trend" subtitle="Present count over the last 6 months">
          {attendanceTrend.some((x) => x.value > 0)
            ? <BarChart data={attendanceTrend} />
            : <div className="hd-empty">No attendance trend data available.</div>}
        </SectionCard>
      </div>
    </div>
  );
}