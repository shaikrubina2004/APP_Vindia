import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/HRDashboard.css";
import CheckInButton from "../../SharedResourse/CheckInButton";

const API_URL = "http://localhost:5000/api";

// ✅ Authenticated axios instance — attaches the token from localStorage to
// every request. Plain `axios.get(...)` never sent the auth token, which
// worked only because of an unauthenticated duplicate route on the backend;
// now that the backend correctly requires auth, every call in this file
// must go through this instance instead of the bare `axios` import.
const authAxios = axios.create();

authAxios.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ==========================================================================
   Utility functions
   ========================================================================== */

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function getTodayString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";

  const [hours, minutes] = value.split(":");
  const hour = Number(hours);

  if (Number.isNaN(hour)) {
    return value;
  }

  return `${hour % 12 || 12}:${minutes || "00"} ${
    hour >= 12 ? "PM" : "AM"
  }`;
}

function getInitials(name = "Employee") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();

  return (day + 6) % 7;
}

/* ==========================================================================
   Icons
   ========================================================================== */

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/* ==========================================================================
   Shared components
   ========================================================================== */

function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`hrd-button hrd-button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}) {
  return (
    <section className={`hrd-card ${className}`}>
      <div className="hrd-card-header">
        <div>
          <h2 className="hrd-card-title">{title}</h2>

          {subtitle && (
            <p className="hrd-card-subtitle">{subtitle}</p>
          )}
        </div>

        {action && <div>{action}</div>}
      </div>

      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
  tone,
  icon: Icon,
}) {
  return (
    <article className={`hrd-metric-card hrd-metric-${tone}`}>
      <div className="hrd-metric-top">
        <span className="hrd-metric-label">{label}</span>

        <span className="hrd-metric-icon">
          <Icon />
        </span>
      </div>

      <div className="hrd-metric-value">
        {value ?? "—"}
      </div>

      <div className="hrd-metric-description">
        {description}
      </div>
    </article>
  );
}

function LoadingDashboard() {
  return (
    <main className="hrd-page">
      <div className="hrd-loading-header">
        <div className="hrd-loading-small" />
        <div className="hrd-loading-title" />
        <div className="hrd-loading-description" />
      </div>

      <div className="hrd-loading-metrics">
        <div />
        <div />
        <div />
        <div />
      </div>

      <div className="hrd-loading-layout">
        <div />
        <div />
      </div>
    </main>
  );
}

/* ==========================================================================
   Department distribution
   ========================================================================== */

function DepartmentDistribution({
  data,
  remainderDepartments = 0,
  remainderCount = 0,
}) {
  if (!data.length) {
    return (
      <div className="hrd-empty-state">
        No department data available.
      </div>
    );
  }

  const max = Math.max(
    ...data.map((item) => item.value),
    1
  );

  return (
    <div className="hrd-department-list">
      {data.map((item, index) => (
        <div
          className="hrd-department-row"
          key={item.label}
        >
          <span className="hrd-department-index">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div className="hrd-department-content">
            <div className="hrd-department-heading">
              <span className="hrd-department-name">
                {item.label}
              </span>
              <strong>{item.value}</strong>
            </div>

            <div className="hrd-department-track">
              <span
                className="hrd-department-fill"
                style={{
                  width: `${(item.value / max) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {remainderDepartments > 0 && (
        <div className="hrd-department-remainder">
          +{remainderDepartments} more department
          {remainderDepartments === 1 ? "" : "s"} ·{" "}
          {remainderCount} employee
          {remainderCount === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Attendance trend
   ========================================================================== */

function AttendanceTrend({ data }) {
  if (!data.some((item) => item.value > 0)) {
    return (
      <div className="hrd-empty-state">
        No attendance trend available.
      </div>
    );
  }

  const max = Math.max(
    ...data.map((item) => item.value),
    1
  );

  return (
    <div className="hrd-trend-chart">
      {data.map((item) => (
        <div
          className="hrd-trend-column"
          key={item.key}
        >
          <span className="hrd-trend-value">
            {item.value}
          </span>

          <div className="hrd-trend-bar-area">
            <span
              className="hrd-trend-bar"
              style={{
                height: `${Math.max(
                  (item.value / max) * 100,
                  5
                )}%`,
              }}
            />
          </div>

          <span className="hrd-trend-label">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ==========================================================================
   Recent joiners
   ========================================================================== */

function RecentJoiners({ employees }) {
  if (!employees.length) {
    return (
      <div className="hrd-empty-state">
        No recent joiners available.
      </div>
    );
  }

  return (
    <div className="hrd-joiners-list">
      {employees.map((employee) => (
        <div
          className="hrd-joiner-row"
          key={employee.id || employee.employee_id}
        >
          <div className="hrd-employee-avatar">
            {getInitials(employee.name)}
          </div>

          <div className="hrd-joiner-info">
            <strong>
              {employee.name || "Employee"}
            </strong>

            <span>
              {employee.department || "Unassigned"} · Joined{" "}
              {formatDate(employee.join_date)}
            </span>
          </div>

          <span className="hrd-new-badge">New</span>
        </div>
      ))}
    </div>
  );
}

/* ==========================================================================
   Calendar
   ========================================================================== */

function CalendarCard() {
  const today = new Date();

  const [year, setYear] = useState(
    today.getFullYear()
  );

  const [month, setMonth] = useState(
    today.getMonth()
  );

  const [selectedDay, setSelectedDay] = useState(null);

  // The calendar fetches its own birthday data instead of relying on the
  // dashboard's `employees` list, which is capped at 100 rows server-side
  // and also carries a lot of PII (salary, bank details, gov ID) that
  // this component has no reason to hold in memory.
  const [birthdayEmployees, setBirthdayEmployees] = useState([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchBirthdays() {
      try {
        setLoadingBirthdays(true);

        const response = await authAxios.get(
          `${API_URL}/employees/birthdays`
        );

        if (!cancelled) {
          setBirthdayEmployees(response.data || []);
        }
      } catch (error) {
        console.error("Unable to fetch birthdays:", error);

        if (!cancelled) {
          setBirthdayEmployees([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingBirthdays(false);
        }
      }
    }

    fetchBirthdays();

    return () => {
      cancelled = true;
    };
  }, []);

  // Group birthdays by day-of-month for the currently viewed month.
  // Parses the date string directly (instead of `new Date(dob)`) so the
  // day can't shift because of the browser's local timezone. The backend
  // also sends dob as plain text (dob::text) for the same reason, since
  // node-postgres otherwise converts DATE columns to JS Date objects
  // using the server's local timezone.
  const birthdays = useMemo(() => {
    const result = {};

    birthdayEmployees.forEach((employee) => {
      if (!employee.dob) return;

      const datePart = String(employee.dob).slice(0, 10);
      const parts = datePart.split("-").map(Number);

      if (parts.length !== 3 || parts.some(Number.isNaN)) return;

      const [, birthMonth, birthDay] = parts;

      if (birthMonth - 1 !== month) return;

      if (!result[birthDay]) {
        result[birthDay] = [];
      }

      result[birthDay].push(employee.name);
    });

    return result;
  }, [birthdayEmployees, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function changeMonth(direction) {
    setSelectedDay(null);

    if (direction === "previous") {
      if (month === 0) {
        setMonth(11);
        setYear((currentYear) => currentYear - 1);
      } else {
        setMonth((currentMonth) => currentMonth - 1);
      }
    }

    if (direction === "next") {
      if (month === 11) {
        setMonth(0);
        setYear((currentYear) => currentYear + 1);
      } else {
        setMonth((currentMonth) => currentMonth + 1);
      }
    }
  }

  return (
    <Card
      title="Calendar"
      subtitle="Employee birthdays"
    >
      <div className="hrd-calendar-header">
        <button
          type="button"
          className="hrd-calendar-nav"
          onClick={() => changeMonth("previous")}
          aria-label="Previous month"
        >
          ‹
        </button>

        <strong>
          {MONTH_NAMES[month]} {year}
        </strong>

        <button
          type="button"
          className="hrd-calendar-nav"
          onClick={() => changeMonth("next")}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="hrd-calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map(
          (day, index) => (
            <span
              className="hrd-calendar-weekday"
              key={`${day}-${index}`}
            >
              {day}
            </span>
          )
        )}

        {Array.from({ length: firstDay }).map(
          (_, index) => (
            <span
              className="hrd-calendar-empty"
              key={`empty-${index}`}
            />
          )
        )}

        {Array.from({ length: daysInMonth }).map(
          (_, index) => {
            const day = index + 1;

            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();

            const dayBirthdays = birthdays[day];
            const hasBirthday = Boolean(dayBirthdays);

            return (
              <button
                type="button"
                key={day}
                className={[
                  "hrd-calendar-day",
                  isToday ? "hrd-calendar-today" : "",
                  selectedDay === day
                    ? "hrd-calendar-selected"
                    : "",
                  hasBirthday ? "hrd-day-birthday" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedDay(day)}
                title={
                  hasBirthday
                    ? `Birthday: ${dayBirthdays.join(", ")}`
                    : ""
                }
              >
                {day}
              </button>
            );
          }
        )}
      </div>

      {selectedDay && birthdays[selectedDay] && (
        <div className="hrd-calendar-selection">
          <div>
            <strong>
              {MONTH_NAMES[month]} {selectedDay}
            </strong>

            <span>
              Birthday:{" "}
              {birthdays[selectedDay].join(", ")}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ==========================================================================
   Quick actions
   ========================================================================== */

function QuickActions({ navigate }) {
  return (
    <Card
      title="Quick actions"
      subtitle="Frequently used HR operations"
    >
      <div className="hrd-quick-actions">
        <button
          type="button"
          className="hrd-quick-action"
          onClick={() => navigate("/hr/employees")}
        >
          <span className="hrd-quick-icon">+</span>

          <span className="hrd-quick-content">
            <strong>Add employee</strong>
            <small>Create a new employee record</small>
          </span>

          <span className="hrd-quick-arrow">›</span>
        </button>

        <button
          type="button"
          className="hrd-quick-action"
          onClick={() => navigate("/hr/leave")}
        >
          <span className="hrd-quick-icon">✓</span>

          <span className="hrd-quick-content">
            <strong>Review leave</strong>
            <small>Manage pending requests</small>
          </span>

          <span className="hrd-quick-arrow">›</span>
        </button>

        <button
          type="button"
          className="hrd-quick-action"
          onClick={() => navigate("/hr/payroll")}
        >
          <span className="hrd-quick-icon">₹</span>

          <span className="hrd-quick-content">
            <strong>Open payroll</strong>
            <small>View payroll operations</small>
          </span>

          <span className="hrd-quick-arrow">›</span>
        </button>
      </div>
    </Card>
  );
}

/* ==========================================================================
   Main dashboard
   ========================================================================== */

export default function HRDashboard() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const hrName =
    user?.name ||
    user?.full_name ||
    user?.username ||
    user?.first_name ||
    "HR Manager";

  const employeeId =
    user?.employee_id || user?.id || null;

  // Used only by CheckInButton to decide whether to skip location
  // capture for the CEO — falls back to role if designation isn't
  // stored on the user object yet.
  const designation =
    user?.designation || user?.role || null;

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        const [
          employeesResponse,
          dashboardResponse,
          attendanceResponse,
        ] = await Promise.all([
          authAxios.get(`${API_URL}/employees`),
          authAxios.get(`${API_URL}/dashboard`),
          authAxios.get(`${API_URL}/attendance`),
        ]);

        setEmployees(employeesResponse.data || []);
        setDashboard(dashboardResponse.data || null);
        setAttendanceRows(attendanceResponse.data || []);
      } catch (fetchError) {
        console.error("Dashboard error:", fetchError);

        setEmployees([]);
        setDashboard(null);
        setAttendanceRows([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const totalEmployees = employees.length;

  const employeesOnLeave = employees.filter(
    (employee) => employee.status === "on_leave"
  ).length;

  const newJoiners = employees.filter((employee) => {
    if (!employee.join_date) return false;

    const joinedDate = new Date(employee.join_date);
    const thirtyDaysAgo = new Date();

    thirtyDaysAgo.setDate(
      thirtyDaysAgo.getDate() - 30
    );

    return joinedDate >= thirtyDaysAgo;
  }).length;

  const present =
    dashboard?.attendance?.present ??
    attendanceRows.filter((row) => {
      return (
        row.date === getTodayString() &&
        String(row.status).toLowerCase() === "present"
      );
    }).length;

  const onLeave =
    dashboard?.attendance?.on_leave ??
    employeesOnLeave;

  const departmentData = useMemo(() => {
    const departmentMap = {};

    employees.forEach((employee) => {
      // Trim so stray whitespace (e.g. " Finance" vs "Finance") doesn't
      // silently split one department into two separate buckets.
      const department =
        employee.department?.trim() || "Unassigned";

      departmentMap[department] =
        (departmentMap[department] || 0) + 1;
    });

    const sorted = Object.entries(departmentMap).sort(
      (first, second) => second[1] - first[1]
    );

    const top = sorted
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));

    const remainder = sorted.slice(6);
    const remainderCount = remainder.reduce(
      (sum, [, value]) => sum + value,
      0
    );

    return {
      top,
      remainderDepartments: remainder.length,
      remainderCount,
    };
  }, [employees]);

  const recentJoiners = useMemo(() => {
    return [...employees]
      .filter((employee) => employee.join_date)
      .sort(
        (first, second) =>
          new Date(second.join_date) -
          new Date(first.join_date)
      )
      .slice(0, 5);
  }, [employees]);

  const attendanceTrend = useMemo(() => {
    const months = [];

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date();

      date.setDate(1);
      date.setMonth(date.getMonth() - index);

      months.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString("en-US", {
          month: "short",
        }),
        value: 0,
      });
    }

    attendanceRows.forEach((row) => {
      if (!row.date) return;

      const date = new Date(row.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      const matchingMonth = months.find(
        (month) => month.key === key
      );

      if (
        matchingMonth &&
        String(row.status).toLowerCase() === "present"
      ) {
        matchingMonth.value += 1;
      }
    });

    return months;
  }, [attendanceRows]);

  const todayLabel = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  if (loading) {
    return <LoadingDashboard />;
  }

  return (
    <main className="hrd-page">
      <header className="hrd-header">
        <div className="hrd-header-content">
          <h1>
            {getGreeting()}, {hrName}
          </h1>
        </div>

        <div className="hrd-header-actions">
          {employeeId && (
            <CheckInButton
              employeeId={employeeId}
              designation={designation}
            />
          )}

          <Button
            variant="secondary"
            onClick={() => navigate("/hr/employees")}
          >
            View employees
          </Button>
        </div>
      </header>

      <section className="hrd-toolbar hrd-date-toolbar">
        <div className="hrd-date">
          <IconCalendar />
          <span>{todayLabel}</span>
        </div>
      </section>

      <section className="hrd-metrics">
        <MetricCard
          label="Total employees"
          value={totalEmployees}
          description="Current headcount"
          tone="brand"
          icon={IconUsers}
        />

        <MetricCard
          label="Present today"
          value={present}
          description="Attendance recorded"
          tone="success"
          icon={IconCheck}
        />

        <MetricCard
          label="On leave"
          value={onLeave}
          description="Approved leave"
          tone="warning"
          icon={IconClock}
        />

        <MetricCard
          label="New joiners"
          value={newJoiners}
          description="Joined in the last 30 days"
          tone="neutral"
          icon={IconUserPlus}
        />
      </section>

      <div className="hrd-layout">
        <div className="hrd-main-column">
          <div className="hrd-two-column hrd-primary-grid">
            <Card
              title="Department distribution"
              subtitle="Employee headcount by department"
            >
              <DepartmentDistribution
                data={departmentData.top}
                remainderDepartments={
                  departmentData.remainderDepartments
                }
                remainderCount={departmentData.remainderCount}
              />
            </Card>

            <Card
              title="Attendance trend"
              subtitle="Present count over the last six months"
            >
              <AttendanceTrend
                data={attendanceTrend}
              />
            </Card>
          </div>

          <Card
            title="Recent joiners"
            subtitle="Newest employees in the company"
            action={
              <button
                type="button"
                className="hrd-text-button"
                onClick={() =>
                  navigate("/hr/employees")
                }
              >
                View all
              </button>
            }
          >
            <RecentJoiners employees={recentJoiners} />
          </Card>
        </div>

        <aside className="hrd-sidebar">
          <CalendarCard />
          <QuickActions navigate={navigate} />
        </aside>
      </div>
    </main>
  );
}