import { API } from "../../services/authService";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ApplyLeave from "../../SharedResourse/ApplyLeave";
import "./Attendance.css";

function AttendanceManagement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateObj, setSelectedDateObj] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [leaveRequestsCount] = useState(3);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef(null);
  const navigate = useNavigate();

  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    status: "",
    checkIn: "",
    checkOut: "",
    remarks: "",
  });

  const [appliedLeaves, setAppliedLeaves] = useState([]);
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
          shift: "M",
          shiftTime: "09:00 AM - 06:00 PM",
          remarks: row.remarks || "-",
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
      const status = record.status.toLowerCase().trim();
      if (status === "present") counts.present++;
      else if (status === "absent") counts.absent++;
      else if (status === "late") counts.late++;
      else if (status === "wfh") counts.wfh++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const handleEditClick = (employee) => {
    setEditingEmployeeId(employee.id);
    setEditFormData({
      status: employee.status,
      checkIn: employee.checkIn !== "-" ? employee.checkIn.substring(0, 5) : "",
      checkOut:
        employee.checkOut !== "-" ? employee.checkOut.substring(0, 5) : "",
      remarks: employee.remarks !== "-" ? employee.remarks : "",
    });
  };

  const handleSaveEdit = async (employeeId) => {
    try {
      await API.put(`/attendance/${employeeId}`, {
        status:
          editFormData.status.toLowerCase() === "wfh"
            ? "WFH"
            : editFormData.status.charAt(0).toUpperCase() +
              editFormData.status.slice(1),
      });
      fetchAttendance();
      setEditingEmployeeId(null);
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingEmployeeId(null);
    setEditFormData({ status: "", checkIn: "", checkOut: "", remarks: "" });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeaveSubmitted = (leaveData) => {
    setAppliedLeaves((prev) => [
      ...prev,
      {
        id: Date.now(),
        employeeName: leaveData.name,
        leaveType: leaveData.leaveType.toLowerCase().replace(" ", ""),
        fromDate: leaveData.fromDate,
        toDate: leaveData.toDate,
        reason: leaveData.reason,
        status: leaveData.status.toLowerCase(),
        appliedOn: leaveData.appliedOn,
      },
    ]);
    setShowLeaveForm(false);
  };

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
    if (selectedStatus === "all") return true;
    return record.status.toLowerCase().trim() === selectedStatus;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case "present":
        return "status-present";
      case "late":
        return "status-late";
      case "absent":
        return "status-absent";
      case "wfh":
        return "status-wfh";
      default:
        return "status-default";
    }
  };

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
    <div className="attendance-page">
      {/* ── Header ── */}
      <div className="att-header">
        <div>
          <h1>Attendance Management</h1>
          <p>View and manage employee attendance records</p>
        </div>
        <button className="leave-btn" onClick={() => navigate("/hr/leaves")}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Leave Requests
          <span className="badge-notification">{leaveRequestsCount}</span>
        </button>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon-wrap ic-blue">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{statusCounts.total}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap ic-green">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Present</span>
            <span className="stat-value">{statusCounts.present}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap ic-red">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Absent</span>
            <span className="stat-value">{statusCounts.absent}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap ic-amber">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Late Arrivals</span>
            <span className="stat-value">{statusCounts.late}</span>
          </div>
        </div>
      </div>

      {/* ── Controls Bar ── */}
      <div className="controls-bar">
        <div className="cal-picker-wrap" ref={calendarRef}>
          <button
            className="cal-icon-btn"
            onClick={() => setCalendarOpen((v) => !v)}
          >
            <svg
              width="15"
              height="15"
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
            <span className="cal-date-text">
              {selectedDateObj.getDate()}{" "}
              {shortMonthNames[selectedDateObj.getMonth()]}{" "}
              {selectedDateObj.getFullYear()}
            </span>
            <svg
              width="11"
              height="11"
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
            <div className="cal-dropdown">
              <div className="cal-drop-nav">
                <button className="cal-nav-btn" onClick={handlePrevMonth}>
                  &#8592;
                </button>
                <span className="cal-drop-month">
                  {monthNames[currentDate.getMonth()]}{" "}
                  {currentDate.getFullYear()}
                </span>
                <button className="cal-nav-btn" onClick={handleNextMonth}>
                  &#8594;
                </button>
              </div>
              <div className="cal-drop-grid">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="cal-drop-head">
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
                      className={`cal-drop-day${!day ? " empty" : ""}${isToday ? " cal-today" : ""}${isSelected ? " cal-selected" : ""}`}
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

        <span className="controls-record-count">
          {filteredRecords.length} records
        </span>
        <div className="controls-spacer" />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="wfh">WFH</option>
        </select>
      </div>

      {/* ── Records List ── */}
      <div className="records-list">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <div key={record.id}>
              {editingEmployeeId === record.id ? (
                /* ── Inline Edit Form ── */
                <div className="inline-edit-form">
                  <div className="edit-form-header">
                    <h4>Edit — {record.name}</h4>
                    <button className="close-edit" onClick={handleCancelEdit}>
                      ×
                    </button>
                  </div>
                  <div className="edit-form-grid">
                    <div className="edit-form-group">
                      <label>Status</label>
                      <select
                        name="status"
                        value={editFormData.status}
                        onChange={handleEditFormChange}
                        className="edit-form-input"
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="wfh">WFH</option>
                        <option value="leave">Leave</option>
                      </select>
                    </div>
                    <div className="edit-form-group">
                      <label>Check In</label>
                      <input
                        type="time"
                        name="checkIn"
                        value={editFormData.checkIn}
                        onChange={handleEditFormChange}
                        className="edit-form-input"
                      />
                    </div>
                    <div className="edit-form-group">
                      <label>Check Out</label>
                      <input
                        type="time"
                        name="checkOut"
                        value={editFormData.checkOut}
                        onChange={handleEditFormChange}
                        className="edit-form-input"
                      />
                    </div>
                    <div className="edit-form-group">
                      <label>Remarks</label>
                      <input
                        type="text"
                        name="remarks"
                        value={editFormData.remarks}
                        onChange={handleEditFormChange}
                        placeholder="Add remarks..."
                        className="edit-form-input"
                      />
                    </div>
                  </div>
                  <div className="edit-form-actions">
                    <button
                      className="edit-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      className="edit-save-btn"
                      onClick={() => handleSaveEdit(record.id)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Full-width record row ── */
                <div className={`record-row ${getStatusClass(record.status)}`}>
                  <div className="row-avatar">
                    {record.name
                      ? record.name.trim().charAt(0).toUpperCase()
                      : "?"}
                  </div>

                  <div className="row-emp">
                    <span className="row-name">{record.name}</span>
                    <span className={`status-pill pill-${record.status}`}>
                      {getStatusLabel(record.status)}
                    </span>
                  </div>

                  <div className="row-divider" />

                  <div className="row-meta">
                    <span className="row-meta-label">Check In</span>
                    <span className="row-meta-value">{record.checkIn}</span>
                  </div>

                  <div className="row-divider" />

                  <div className="row-meta">
                    <span className="row-meta-label">Check Out</span>
                    <span className="row-meta-value">{record.checkOut}</span>
                  </div>

                  <div className="row-divider" />

                  <div className="row-meta">
                    <span className="row-meta-label">Shift</span>
                    <span className="row-meta-value">{record.shift}</span>
                  </div>

                  <div className="row-divider" />

                  <div className="row-meta row-shift-time">
                    <span className="row-meta-label">Shift Time</span>
                    <span className="row-meta-value shift-blue">
                      {record.shiftTime}
                    </span>
                  </div>

                  <div className="row-divider" />

                  <div className="row-meta row-remarks">
                    <span className="row-meta-label">Remarks</span>
                    <span className="row-meta-value">
                      {record.remarks !== "-" ? record.remarks : "—"}
                    </span>
                  </div>

                  {/* Spacer pushes Edit to the far right */}
                  <div className="row-spacer" />

                  <button
                    className="edit-btn-row"
                    onClick={() => handleEditClick(record)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-records">
            <p>No attendance records found for this date</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceManagement;
