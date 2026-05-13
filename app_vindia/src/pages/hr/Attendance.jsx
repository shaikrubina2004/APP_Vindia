import { API } from "../../services/authService";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Attendance.css";

function AttendanceManagement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateObj, setSelectedDateObj] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [leaveRequestsCount] = useState(3);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;
  const calendarRef = useRef(null);
  const navigate = useNavigate();

  const [attendanceByDate, setAttendanceByDate] = useState({});

  useEffect(() => {
    fetchAttendance();
    fetchTotalEmployees();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await API.get("/attendance");
      const formatted = {};
      res.data.forEach((row) => {
        const key = new Date(row.date).toLocaleDateString("en-CA");
        if (!formatted[key]) formatted[key] = [];
        formatted[key].push({
          id: row.id,
          name: row.name || `Employee ${row.employee_id}`,
          status: row.status.toLowerCase(),
          checkIn: row.check_in || "-",
          checkOut: row.check_out || "-",
          shift: row.shift || "Morning",
          shiftTime: "09:00 AM - 06:00 PM",
          remarks: row.remarks || "-",
          lateMinutes: row.late_minutes || 0,
        });
      });
      setAttendanceByDate(formatted);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTotalEmployees = async () => {
    try {
      const res = await API.get("/attendance/employees/count");
      setTotalEmployees(res.data.total);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (date) => date.toLocaleDateString("en-CA");

  // ≤59 min → "45 min late"   ≥60 min → "1h 15m late"
  const formatLate = (minutes) => {
    if (!minutes || minutes <= 0) return null;
    if (minutes < 60) return `${minutes} min late`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m late` : `${h}h late`;
  };

  const getAttendanceRecordsForDate = () => {
    const key = formatDate(selectedDateObj);
    return attendanceByDate[key] || [];
  };

  const attendanceRecords = getAttendanceRecordsForDate();

  const getStatusCounts = () => {
    const counts = {
      total: totalEmployees,
      present: 0,
      absent: 0,
      late: 0,
      wfh: 0,
    };
    attendanceRecords.forEach((record) => {
      if (!record || !record.status) return;
      const s = record.status.toLowerCase().trim();
      if (s === "present") counts.present++;
      else if (s === "absent") counts.absent++;
      else if (s === "late") counts.late++;
      else if (s === "wfh") counts.wfh++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const getDaysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthNames = [
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
  const shortMonthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthDays = [];
  for (let i = 0; i < firstDay; i++) monthDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) monthDays.push(i);

  const handleDateClick = (day) => {
    if (day) {
      setSelectedDateObj(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      );
      setCalendarOpen(false);
      setCurrentPage(1);
    }
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };
  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchStatus =
      selectedStatus === "all" ||
      record.status.toLowerCase().trim() === selectedStatus;
    const matchSearch = record.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / rowsPerPage),
  );
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const getStatusLabel = (status) => {
    switch (status) {
      case "present":
        return "Present";
      case "late":
        return "Late";
      case "absent":
        return "Absent";
      case "wfh":
        return "WFH";
      default:
        return "Unknown";
    }
  };

  const today = new Date();

  return (
    <div className="am-page">
      {/* ── Stat Cards ── */}
      <div className="am-cards">
        <div className="am-card am-card-blue">
          <div className="am-card-top">
            <span className="am-card-title">Total Employees</span>
            <span className="am-card-pct am-pct-blue">All staff</span>
          </div>
          <div className="am-card-value">{statusCounts.total}</div>
          <div className="am-card-sub">Registered employees</div>
        </div>

        <div className="am-card am-card-green">
          <div className="am-card-top">
            <span className="am-card-title">Present Today</span>
            <span className="am-card-pct am-pct-green">
              {statusCounts.total > 0
                ? Math.round((statusCounts.present / statusCounts.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="am-card-value">{statusCounts.present}</div>
          <div className="am-card-sub">On time arrivals</div>
        </div>

        <div className="am-card am-card-amber">
          <div className="am-card-top">
            <span className="am-card-title">Late Arrivals</span>
            <span className="am-card-pct am-pct-amber">
              {statusCounts.total > 0
                ? Math.round((statusCounts.late / statusCounts.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="am-card-value">{statusCounts.late}</div>
          <div className="am-card-sub">Past shift start</div>
        </div>

        <div className="am-card am-card-red">
          <div className="am-card-top">
            <span className="am-card-title">Absent Today</span>
            <span className="am-card-pct am-pct-red">
              {statusCounts.total > 0
                ? Math.round((statusCounts.absent / statusCounts.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="am-card-value">{statusCounts.absent}</div>
          <div className="am-card-sub">Not checked in</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="am-toolbar">
        {/* Search */}
        <div className="am-search-wrap">
          <svg
            className="am-search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="am-search"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <span className="am-record-count">
          {filteredRecords.length} records
        </span>

        <div className="am-toolbar-right">
          {/* Date picker */}
          <div className="am-cal-wrap" ref={calendarRef}>
            <button
              className="am-cal-btn"
              onClick={() => setCalendarOpen((v) => !v)}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {selectedDateObj.getDate()}{" "}
              {shortMonthNames[selectedDateObj.getMonth()]}{" "}
              {selectedDateObj.getFullYear()}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  transition: "transform 0.2s",
                  transform: calendarOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {calendarOpen && (
              <div className="am-cal-dropdown">
                <div className="am-cal-nav">
                  <button className="am-cal-nav-btn" onClick={handlePrevMonth}>
                    &#8592;
                  </button>
                  <span className="am-cal-month-label">
                    {monthNames[currentDate.getMonth()]}{" "}
                    {currentDate.getFullYear()}
                  </span>
                  <button className="am-cal-nav-btn" onClick={handleNextMonth}>
                    &#8594;
                  </button>
                </div>
                <div className="am-cal-grid">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="am-cal-head">
                      {d}
                    </div>
                  ))}
                  {monthDays.map((day, idx) => {
                    const isToday =
                      day &&
                      today.getFullYear() === currentDate.getFullYear() &&
                      today.getMonth() === currentDate.getMonth() &&
                      today.getDate() === day;
                    const isSelected =
                      day &&
                      selectedDateObj.getFullYear() ===
                        currentDate.getFullYear() &&
                      selectedDateObj.getMonth() === currentDate.getMonth() &&
                      selectedDateObj.getDate() === day;
                    return (
                      <div
                        key={idx}
                        className={`am-cal-day${!day ? " empty" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
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
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            <select
              className="am-filter-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Sort: All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="wfh">WFH</option>
            </select>
          </div>

          {/* Leave requests */}
          <button
            className="am-leave-btn"
            onClick={() => navigate("/hr/leaves")}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Leave Requests
            {leaveRequestsCount > 0 && (
              <span className="am-badge">{leaveRequestsCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="am-table-wrap">
        <table className="am-table">
          <thead>
            <tr className="am-thead-row">
              <th className="am-th am-th-check">
                <input type="checkbox" className="am-checkbox" />
              </th>
              <th className="am-th">Employee</th>
              <th className="am-th">Check In</th>
              <th className="am-th">Check Out</th>
              <th className="am-th">Shift</th>
              <th className="am-th">Shift Time</th>
              <th className="am-th">Late By</th>
              <th className="am-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((record) => (
                <tr key={record.id} className="am-tr">
                  <td className="am-td am-td-check">
                    <input type="checkbox" className="am-checkbox" />
                  </td>
                  <td className="am-td">
                    <div className="am-emp-cell">
                      <div className="am-avatar">
                        {record.name
                          ? record.name.trim().charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <div className="am-emp-info">
                        <span className="am-emp-name">{record.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="am-td am-td-mono">{record.checkIn}</td>
                  <td className="am-td am-td-mono">{record.checkOut}</td>
                  <td className="am-td">
                    {record.shift
                      ? record.shift.charAt(0).toUpperCase() +
                        record.shift.slice(1).toLowerCase()
                      : "Morning"}
                  </td>
                  <td className="am-td am-td-shift">{record.shiftTime}</td>
                  <td className="am-td">
                    {formatLate(record.lateMinutes) ? (
                      <span className="am-late-tag">
                        {formatLate(record.lateMinutes)}
                      </span>
                    ) : (
                      <span className="am-late-none">—</span>
                    )}
                  </td>
                  <td className="am-td">
                    <span className={`am-pill am-pill-${record.status}`}>
                      {getStatusLabel(record.status)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="am-empty-cell">
                  <div className="am-empty-inner">
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <p>No attendance records found for this date</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AttendanceManagement;
