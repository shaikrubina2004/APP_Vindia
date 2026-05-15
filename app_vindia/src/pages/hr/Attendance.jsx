import { API } from "../../services/authService";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Attendance.css";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL = {
  present:    "Present",
  late:       "Late",
  absent:     "Absent",
  wfh:        "WFH",
  "half day": "Half Day",
};

// Sub-label shown below the pill — derived from the remarks field
const REMARKS_SUBLABEL = {
  "afternoon present":       "Afternoon Present",
  "afternoon absent":        "Afternoon Absent",
  "late + afternoon absent": "Late + Afternoon Absent",
  "full day":                "",
  "present":                 "",
};

const getStatusLabel = (s = "") => STATUS_LABEL[s.toLowerCase().trim()] ?? s;
const getRemarkLabel = (r = "") => {
  if (!r || r === "—") return "";
  const key = r.toLowerCase().trim();
  if (key in REMARKS_SUBLABEL) return REMARKS_SUBLABEL[key];
  // pass through things like "Late by 34 min" but hide generic ones
  if (key === "present" || key === "full day" || key === "on time") return "";
  return r;
};

// Returns the right CSS pill class including half-day variants
const getPillClass = (status, remarks = "") => {
  const s = status.toLowerCase().trim();
  const r = (remarks || "").toLowerCase().trim();
  if (s === "half day") {
    if (r.includes("afternoon absent"))  return "am-pill-afternoon-absent";
    if (r.includes("afternoon present")) return "am-pill-afternoon-present";
    return "am-pill-half-day";
  }
  return `am-pill-${s.replace(/ /g, "-")}`;
};

const formatLate = (minutes) => {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min late`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m late` : `${h}h late`;
};

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

const isToday = (dateObj) => {
  const now = new Date();
  return (
    dateObj.getFullYear() === now.getFullYear() &&
    dateObj.getMonth()    === now.getMonth()    &&
    dateObj.getDate()     === now.getDate()
  );
};

// ─── Month names ──────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const SHORT_MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Component ────────────────────────────────────────────────────────────────

function AttendanceManagement() {
  const navigate = useNavigate();
  const calendarRef = useRef(null);

  // calendar nav (separate from selected date)
  const [calNav, setCalNav]               = useState(new Date());
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [calendarOpen, setCalendarOpen]   = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery]       = useState("");
  const [currentPage, setCurrentPage]       = useState(1);
  const rowsPerPage = 10;

  // Two data sources:
  //   todayRows  — from /attendance/today/all (full employee list with today status)
  //   historyMap — from /attendance (historical, keyed by date)
  const [todayRows,   setTodayRows]   = useState([]);
  const [historyMap,  setHistoryMap]  = useState({});
  const [loading,     setLoading]     = useState(true);
  const [leaveCount,  setLeaveCount]  = useState(0);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target))
        setCalendarOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [todayRes, histRes] = await Promise.all([
        API.get("/attendance/today/all"),
        API.get("/attendance"),
      ]);

      // today rows — normalise status casing
      setTodayRows(
        (todayRes.data || []).map((r) => ({
          id:          r.attendance_id ?? `emp-${r.employee_id}`,
          employee_id: r.employee_id,
          name:        r.name || `Employee ${r.employee_id}`,
          designation: r.designation || "—",
          department:  r.department  || "—",
          status:      (r.status || "absent").toLowerCase(),
          empStatus:   (r.emp_status || "").toLowerCase(),
          checkIn:     fmtTime(r.check_in),
          checkOut:    fmtTime(r.check_out),
          shift:       r.shift || "Morning",
          shiftTime:   r.shift_timing || "09:00 AM – 06:00 PM",
          lateMinutes: r.late_minutes || 0,
          remarks:     r.remarks || "—",
          hasRecord:   !!r.attendance_id,
        }))
      );

      // historical map keyed by YYYY-MM-DD
      const map = {};
      (histRes.data || []).forEach((row) => {
        const key = new Date(row.date).toLocaleDateString("en-CA");
        if (!map[key]) map[key] = [];
        map[key].push({
          id:          row.id,
          employee_id: row.employee_id,
          name:        row.name || `Employee ${row.employee_id}`,
          status:      (row.status || "absent").toLowerCase(),
          checkIn:     fmtTime(row.check_in),
          checkOut:    fmtTime(row.check_out),
          shift:       row.shift || "Morning",
          shiftTime:   "09:00 AM – 06:00 PM",
          lateMinutes: row.late_minutes || 0,
          remarks:     row.remarks || "—",
        });
      });
      setHistoryMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Pick the right row source ─────────────────────────────────────────────
  const formatDate = (d) => d.toLocaleDateString("en-CA");

  const activeRows = isToday(selectedDate)
    ? todayRows
    : historyMap[formatDate(selectedDate)] || [];

  // ── Status counts ─────────────────────────────────────────────────────────
  const counts = activeRows.reduce(
    (acc, r) => {
      const s = r.status.toLowerCase().trim();
      const remark = (r.remarks || "").toLowerCase().trim();
      if (s === "present")       acc.present++;
      else if (s === "late")   { acc.late++; acc.present++; }
      else if (s === "absent")   acc.absent++;
      else if (s === "wfh")      acc.wfh++;
      else if (s === "half day") {
        acc.halfDay++;
        if (remark.includes("afternoon absent"))  acc.afternoonAbsent++;
        else if (remark.includes("afternoon present")) acc.afternoonPresent++;
      }
      return acc;
    },
    { present: 0, absent: 0, late: 0, wfh: 0, halfDay: 0, afternoonAbsent: 0, afternoonPresent: 0 }
  );
  const total = activeRows.length;

  // ── Filter + paginate ─────────────────────────────────────────────────────
  const filtered = activeRows.filter((r) => {
    const matchStatus =
      selectedStatus === "all" ||
      r.status.toLowerCase().trim() === selectedStatus;
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated   = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const daysInMonth   = new Date(calNav.getFullYear(), calNav.getMonth() + 1, 0).getDate();
  const firstDay      = new Date(calNav.getFullYear(), calNav.getMonth(), 1).getDay();
  const monthDays     = [];
  for (let i = 0; i < firstDay; i++) monthDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) monthDays.push(i);

  const handleDateClick = (day) => {
    if (!day) return;
    setSelectedDate(new Date(calNav.getFullYear(), calNav.getMonth(), day));
    setCalendarOpen(false);
    setCurrentPage(1);
  };

  const today = new Date();

  return (
    <div className="am-page">
      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="am-cards">
        <div className="am-card am-card-blue">
          <div className="am-card-top">
            <span className="am-card-title">Total Employees</span>
            <span className="am-card-pct am-pct-blue">All staff</span>
          </div>
          <div className="am-card-value">{total}</div>
          <div className="am-card-sub">Registered employees</div>
        </div>

        <div className="am-card am-card-green">
          <div className="am-card-top">
            <span className="am-card-title">Present</span>
            <span className="am-card-pct am-pct-green">
              {total > 0 ? Math.round((counts.present / total) * 100) : 0}%
            </span>
          </div>
          <div className="am-card-value">{counts.present}</div>
          <div className="am-card-sub">On time + late arrivals</div>
        </div>

        <div className="am-card am-card-amber">
          <div className="am-card-top">
            <span className="am-card-title">Late Arrivals</span>
            <span className="am-card-pct am-pct-amber">
              {total > 0 ? Math.round((counts.late / total) * 100) : 0}%
            </span>
          </div>
          <div className="am-card-value">{counts.late}</div>
          <div className="am-card-sub">Checked in 9:30 – 10:00</div>
        </div>

        <div className="am-card am-card-red">
          <div className="am-card-top">
            <span className="am-card-title">Absent</span>
            <span className="am-card-pct am-pct-red">
              {total > 0 ? Math.round((counts.absent / total) * 100) : 0}%
            </span>
          </div>
          <div className="am-card-value">{counts.absent}</div>
          <div className="am-card-sub">No check-in / after 10:00</div>
        </div>

        <div className="am-card am-card-wfh" onClick={() => { setSelectedStatus("wfh"); setCurrentPage(1); }}
          style={{ cursor: "pointer" }}>
          <div className="am-card-top">
            <span className="am-card-title">Work From Home</span>
            <span className="am-card-pct am-pct-wfh">
              {total > 0 ? Math.round((counts.wfh / total) * 100) : 0}%
            </span>
          </div>
          <div className="am-card-value">{counts.wfh}</div>
          <div className="am-card-sub">Remote employees today</div>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="am-toolbar">
        <div className="am-search-wrap">
          <svg className="am-search-icon" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="am-search"
            placeholder="Search employee…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <span className="am-record-count">{filtered.length} employees</span>

        <div className="am-toolbar-right">
          {/* Date picker */}
          <div className="am-cal-wrap" ref={calendarRef}>
            <button className="am-cal-btn" onClick={() => setCalendarOpen((v) => !v)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8"  y1="2" x2="8"  y2="6" />
                <line x1="3"  y1="10" x2="21" y2="10" />
              </svg>
              {selectedDate.getDate()} {SHORT_MONTH[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              {isToday(selectedDate) && (
                <span style={{ fontSize: 10, background: "#3b82f6", color: "#fff",
                  borderRadius: 4, padding: "1px 5px", marginLeft: 4 }}>Today</span>
              )}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                style={{ transition: "transform .2s", transform: calendarOpen ? "rotate(180deg)" : "rotate(0)" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {calendarOpen && (
              <div className="am-cal-dropdown">
                <div className="am-cal-nav">
                  <button className="am-cal-nav-btn"
                    onClick={(e) => { e.stopPropagation(); setCalNav(new Date(calNav.getFullYear(), calNav.getMonth() - 1)); }}>
                    &#8592;
                  </button>
                  <span className="am-cal-month-label">
                    {MONTH_NAMES[calNav.getMonth()]} {calNav.getFullYear()}
                  </span>
                  <button className="am-cal-nav-btn"
                    onClick={(e) => { e.stopPropagation(); setCalNav(new Date(calNav.getFullYear(), calNav.getMonth() + 1)); }}>
                    &#8594;
                  </button>
                </div>
                <div className="am-cal-grid">
                  {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                    <div key={d} className="am-cal-head">{d}</div>
                  ))}
                  {monthDays.map((day, idx) => {
                    const isTod = day &&
                      today.getFullYear() === calNav.getFullYear() &&
                      today.getMonth()    === calNav.getMonth()    &&
                      today.getDate()     === day;
                    const isSel = day &&
                      selectedDate.getFullYear() === calNav.getFullYear() &&
                      selectedDate.getMonth()    === calNav.getMonth()    &&
                      selectedDate.getDate()     === day;
                    return (
                      <div
                        key={idx}
                        className={`am-cal-day${!day ? " empty" : ""}${isTod ? " is-today" : ""}${isSel ? " is-selected" : ""}`}
                        onClick={() => handleDateClick(day)}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Status filter */}
          <div className="am-sort-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            <select className="am-filter-select" value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}>
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half day">Half Day</option>
              <option value="wfh">WFH</option>
            </select>
          </div>

          {/* Leave requests */}
          <button className="am-leave-btn" onClick={() => navigate("/hr/leaves")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Leave Requests
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="am-table-wrap">
        <table className="am-table">
          <thead>
            <tr className="am-thead-row">
              <th className="am-th am-th-check"><input type="checkbox" className="am-checkbox" /></th>
              <th className="am-th">Employee</th>
              <th className="am-th">Department</th>
              <th className="am-th">Check In</th>
              <th className="am-th">Check Out</th>
              <th className="am-th">Shift</th>
              <th className="am-th">Late By</th>
              <th className="am-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="am-empty-cell">
                  <div className="am-empty-inner">Loading…</div>
                </td>
              </tr>
            ) : paginated.length > 0 ? (
              paginated.map((record) => (
                <tr key={record.id} className="am-tr">
                  <td className="am-td am-td-check">
                    <input type="checkbox" className="am-checkbox" />
                  </td>
                  <td className="am-td">
                    <div className="am-emp-cell">
                      <div className={`am-avatar${record.empStatus === "work_from_home" ? " am-avatar-wfh" : ""}`}>
                        {record.name?.trim().charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div className="am-emp-info">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="am-emp-name">{record.name}</span>
                          {record.empStatus === "work_from_home" && (
                            <span className="am-wfh-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 3 }}>
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                              </svg>
                              WFH
                            </span>
                          )}
                        </div>
                        {record.designation && record.designation !== "—" && (
                          <span className="am-emp-designation">
                            {record.designation}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="am-td" style={{ color: "#64748b", fontSize: 13 }}>
                    {record.department}
                  </td>
                  <td className="am-td am-td-mono">{record.checkIn}</td>
                  <td className="am-td am-td-mono">{record.checkOut}</td>
                  <td className="am-td">{record.shift}</td>
                  <td className="am-td">
                    {formatLate(record.lateMinutes) ? (
                      <span className="am-late-tag">{formatLate(record.lateMinutes)}</span>
                    ) : (
                      <span className="am-late-none">—</span>
                    )}
                  </td>
                  <td className="am-td">
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span className={getPillClass(record.status, record.remarks)}>
                        {getStatusLabel(record.status)}
                      </span>
                      {getRemarkLabel(record.remarks) && (
                        <span style={{ fontSize: 10, color: "#64748b", lineHeight: 1.3 }}>
                          {getRemarkLabel(record.remarks)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="am-empty-cell">
                  <div className="am-empty-inner">
                    {selectedStatus === "wfh" ? (
                      <>
                        <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
                          stroke="#3b82f6" strokeWidth="1.2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        <p style={{ color: "#3b82f6", fontWeight: 600 }}>No Work From Home employees today</p>
                        <p style={{ fontSize: 12, color: "#94a3b8" }}>
                          Employees assigned "Work From Home" status will appear here
                        </p>
                      </>
                    ) : (
                      <>
                        <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="1.2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <p>No attendance records found for this date</p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0",
              background: currentPage === 1 ? "#f8fafc" : "#fff", cursor: "pointer" }}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setCurrentPage(p)}
              style={{ padding: "4px 10px", borderRadius: 6,
                border: p === currentPage ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                background: p === currentPage ? "#eff6ff" : "#fff",
                color: p === currentPage ? "#3b82f6" : "#374151",
                fontWeight: p === currentPage ? 700 : 400, cursor: "pointer" }}>
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0",
              background: currentPage === totalPages ? "#f8fafc" : "#fff", cursor: "pointer" }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default AttendanceManagement;