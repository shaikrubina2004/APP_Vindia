import { API } from "../../services/authService";
import React, { useState, useEffect, useRef, useMemo } from "react";
import "./Attendance.css";

const STATUS_LABEL = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  wfh: "WFH",
  "half day": "Half Day",
};

const REMARKS_SUBLABEL = {
  "afternoon present": "Afternoon Present",
  "afternoon absent": "Afternoon Absent",
  "late + afternoon absent": "Late + Afternoon Absent",
  "full day": "",
  present: "",
};

const getStatusLabel = (s = "") => STATUS_LABEL[s.toLowerCase().trim()] ?? s;

const getRemarkLabel = (r = "") => {
  if (!r || r === "—") return "";
  const key = r.toLowerCase().trim();
  if (key in REMARKS_SUBLABEL) return REMARKS_SUBLABEL[key];
  if (key === "present" || key === "full day" || key === "on time") return "";
  return r;
};

const getPillClass = (status, remarks = "") => {
  const s = status.toLowerCase().trim();
  const r = (remarks || "").toLowerCase().trim();
  if (s === "half day") {
    if (r.includes("afternoon absent")) return "am-pill-afternoon-absent";
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
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getDate() === now.getDate()
  );
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const SHORT_MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const toDateKey = (d) => (d ? new Date(d).toLocaleDateString("en-CA") : "");

function AttendanceManagement() {
  const calendarRef = useRef(null);

  const [calNav, setCalNav] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [todayRows, setTodayRows] = useState([]);
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setCalendarOpen(false);
      }
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

      const mappedToday = (todayRes.data || []).map((r) => ({
        id: r.attendance_id ?? `emp-${r.employee_id}`,
        employee_id: r.employee_id,
        name: r.name || `Employee ${r.employee_id}`,
        designation: r.designation || "—",
        department: r.department || "—",
        status: (r.status || "absent").toLowerCase(),
        empStatus: (r.emp_status || "").toLowerCase(),
        checkIn: fmtTime(r.check_in),
        checkOut: fmtTime(r.check_out),
        shift: r.shift || "Morning",
        shiftTime: r.shift_timing || "09:00 AM – 06:00 PM",
        lateMinutes: r.late_minutes || 0,
        remarks: r.remarks || "—",
        hasRecord: !!r.attendance_id,
        date: toDateKey(new Date()),
      }));

      const map = {};
      (histRes.data || []).forEach((row) => {
        const key = toDateKey(row.date);
        if (!map[key]) map[key] = [];
        map[key].push({
          id: row.id,
          employee_id: row.employee_id,
          name: row.name || `Employee ${row.employee_id}`,
          designation: row.designation || "—",
          department: row.department || "—",
          status: (row.status || "absent").toLowerCase(),
          checkIn: fmtTime(row.check_in),
          checkOut: fmtTime(row.check_out),
          shift: row.shift || "Morning",
          shiftTime: "09:00 AM – 06:00 PM",
          lateMinutes: row.late_minutes || 0,
          remarks: row.remarks || "—",
          date: key,
        });
      });

      setTodayRows(mappedToday);
      setHistoryMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const allRows = useMemo(() => {
    const historyRows = Object.values(historyMap).flat();
    const todayKey = toDateKey(new Date());
    const todayIds = new Set(todayRows.map((r) => `${r.employee_id}-${todayKey}`));
    const uniqueHistory = historyRows.filter((r) => !todayIds.has(`${r.employee_id}-${r.date}`));
    return [...todayRows, ...uniqueHistory];
  }, [todayRows, historyMap]);

  const filtered = useMemo(() => {
    const nameQ = searchName.trim().toLowerCase();
    const statusQ = selectedStatus.trim().toLowerCase();
    const dateQ = selectedDate ? toDateKey(selectedDate) : "";

    return allRows.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const status = (r.status || "").toLowerCase().trim();
      const rowDate = (r.date || "").toLowerCase();

      const nameMatch = !nameQ || name.includes(nameQ);
      const statusMatch = !statusQ || statusQ === "all" ? true : status === statusQ;
      const dateMatch = !dateQ || rowDate === dateQ;

      return nameMatch && statusMatch && dateMatch;
    });
  }, [allRows, searchName, selectedStatus, selectedDate]);

  const counts = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const s = r.status.toLowerCase().trim();
        const remark = (r.remarks || "").toLowerCase().trim();
        if (s === "present") acc.present++;
        else if (s === "late") {
          acc.late++;
          acc.present++;
        } else if (s === "absent") acc.absent++;
        else if (s === "wfh") acc.wfh++;
        else if (s === "half day") {
          acc.halfDay++;
          if (remark.includes("afternoon absent")) acc.afternoonAbsent++;
          else if (remark.includes("afternoon present")) acc.afternoonPresent++;
        }
        return acc;
      },
      {
        present: 0,
        absent: 0,
        late: 0,
        wfh: 0,
        halfDay: 0,
        afternoonAbsent: 0,
        afternoonPresent: 0,
      }
    );
  }, [filtered]);

  const total = filtered.length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, selectedStatus, selectedDate]);

  const daysInMonth = new Date(calNav.getFullYear(), calNav.getMonth() + 1, 0).getDate();
  const firstDay = new Date(calNav.getFullYear(), calNav.getMonth(), 1).getDay();
  const monthDays = [];
  for (let i = 0; i < firstDay; i++) monthDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) monthDays.push(i);

  const handleDateClick = (day) => {
    if (!day) return;
    const picked = new Date(calNav.getFullYear(), calNav.getMonth(), day);
    setSelectedDate(picked);
    setCalendarOpen(false);
  };

  const clearDate = () => {
    setSelectedDate(null);
  };

  const today = new Date();

  return (
    <div className="am-page">
      <div className="am-cards">
        <div className="am-card am-card-blue">
          <div className="am-card-top">
            <span className="am-card-title">Total Employees</span>
            <span className="am-card-pct am-pct-blue">All staff</span>
          </div>
          <div className="am-card-value">{total}</div>
          <div className="am-card-sub">Filtered employees</div>
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
          <div className="am-card-sub">Checked in late</div>
        </div>

        <div className="am-card am-card-red">
          <div className="am-card-top">
            <span className="am-card-title">Absent</span>
            <span className="am-card-pct am-pct-red">
              {total > 0 ? Math.round((counts.absent / total) * 100) : 0}%
            </span>
          </div>
          <div className="am-card-value">{counts.absent}</div>
          <div className="am-card-sub">No attendance record</div>
        </div>

        <div className="am-card am-card-wfh">
          <div className="am-card-top">
            <span className="am-card-title">Work From Home</span>
            <span className="am-card-pct am-pct-wfh">
              {total > 0 ? Math.round((counts.wfh / total) * 100) : 0}%
            </span>
          </div>
          <div className="am-card-value">{counts.wfh}</div>
          <div className="am-card-sub">Remote employees</div>
        </div>
      </div>

      <div className="am-toolbar">
        <div className="am-toolbar-left">
          <div className="am-search-wrap">
            <svg className="am-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="am-search"
              placeholder="Search employee name…"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>

          <select
            className="am-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="half day">Half Day</option>
            <option value="wfh">WFH</option>
          </select>

          <button className="am-search-btn" onClick={() => setCurrentPage(1)}>
            Search
          </button>
        </div>

        <div className="am-toolbar-right">
          <div className="am-cal-wrap" ref={calendarRef}>
            <button className="am-cal-btn" onClick={() => setCalendarOpen((v) => !v)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {selectedDate ? (
                <>
                  {selectedDate.getDate()} {SHORT_MONTH[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </>
              ) : (
                <>Select Date</>
              )}
              {selectedDate && isToday(selectedDate) && <span className="am-today-badge">Today</span>}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: "transform .2s", transform: calendarOpen ? "rotate(180deg)" : "rotate(0)" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {calendarOpen && (
              <div className="am-cal-dropdown">
                <div className="am-cal-nav">
                  <button className="am-cal-nav-btn" onClick={(e) => { e.stopPropagation(); setCalNav(new Date(calNav.getFullYear(), calNav.getMonth() - 1)); }}>
                    &#8592;
                  </button>
                  <span className="am-cal-month-label">
                    {MONTH_NAMES[calNav.getMonth()]} {calNav.getFullYear()}
                  </span>
                  <button className="am-cal-nav-btn" onClick={(e) => { e.stopPropagation(); setCalNav(new Date(calNav.getFullYear(), calNav.getMonth() + 1)); }}>
                    &#8594;
                  </button>
                </div>

                <div className="am-cal-grid">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="am-cal-head">{d}</div>
                  ))}
                  {monthDays.map((day, idx) => {
                    const isTod =
                      day &&
                      today.getFullYear() === calNav.getFullYear() &&
                      today.getMonth() === calNav.getMonth() &&
                      today.getDate() === day;
                    const isSel =
                      day &&
                      selectedDate &&
                      selectedDate.getFullYear() === calNav.getFullYear() &&
                      selectedDate.getMonth() === calNav.getMonth() &&
                      selectedDate.getDate() === day;
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

                <button className="am-clear-date-btn" onClick={clearDate}>
                  Clear Date
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="am-table-wrap">
        <table className="am-table">
          <thead>
            <tr className="am-thead-row">
              <th className="am-th am-th-check">
                <input type="checkbox" className="am-checkbox" />
              </th>
              <th className="am-th">Employee</th>
              <th className="am-th">Department</th>
              <th className="am-th">Date</th>
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
                <td colSpan={9} className="am-empty-cell">
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
                            <span className="am-wfh-badge">WFH</span>
                          )}
                        </div>
                        {record.designation && record.designation !== "—" && (
                          <span className="am-emp-designation">{record.designation}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="am-td" style={{ color: "#64748b", fontSize: 13 }}>
                    {record.department}
                  </td>
                  <td className="am-td am-td-mono">{record.date}</td>
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
                <td colSpan={9} className="am-empty-cell">
                  <div className="am-empty-inner">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <p>No attendance records found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="am-pagination">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="am-page-btn">‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setCurrentPage(p)} className={`am-page-btn ${p === currentPage ? "active" : ""}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="am-page-btn">›</button>
        </div>
      )}
    </div>
  );
}

export default AttendanceManagement;