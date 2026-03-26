import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import ApplyLeave from "../../SharedResourse/ApplyLeave";
=======
import axios from "axios";
>>>>>>> Stashed changes
=======
import axios from "axios";
>>>>>>> Stashed changes
import "./Attendance.css";

function AttendanceManagement() {
  const navigate = useNavigate();

  const employeeId = 3; // later from login token
  const [attendanceByDate, setAttendanceByDate] = useState({});
  const [currentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

<<<<<<< Updated upstream
<<<<<<< Updated upstream
  const [appliedLeaves, setAppliedLeaves] = useState([]);
=======
=======
>>>>>>> Stashed changes
  /* ======================
     FETCH ATTENDANCE
  ====================== */
  useEffect(() => {
    fetchAttendance();
  }, []);
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/attendance/${employeeId}`
      );

      const grouped = {};

      res.data.forEach((row) => {
        const dateKey = new Date(row.date).toISOString().split("T")[0];

        if (!grouped[dateKey]) grouped[dateKey] = [];

<<<<<<< Updated upstream
<<<<<<< Updated upstream
    records.forEach((record) => {
      if (record.status === "present") counts.present++;
      else if (record.status === "absent") counts.absent++;
      else if (record.status === "late") counts.late++;
      else if (record.status === "wfh") counts.wfh++;
      else if (record.status === "leave") counts.leave++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  // Edit button handler - show form for that employee
  const handleEditClick = (employee) => {
    setEditingEmployeeId(employee.id);
    setEditFormData({
      status: employee.status,
      checkIn: employee.checkIn,
      checkOut: employee.checkOut,
      remarks: employee.remarks,
    });
  };

  // Save edit changes
  const handleSaveEdit = (employeeId) => {
    const dateKey = `${selectedDateObj.getFullYear()}-${selectedDateObj.getMonth() + 1}-${selectedDateObj.getDate()}`;

    setAttendanceByDate((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey].map((emp) =>
        emp.id === employeeId ? { ...emp, ...editFormData } : emp,
      ),
    }));

    setEditingEmployeeId(null);
    console.log("Updated employee:", employeeId, editFormData);
    // Here you would also save to Supabase
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingEmployeeId(null);
    setEditFormData({
      status: "",
      checkIn: "",
      checkOut: "",
      remarks: "",
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle leave submission from ApplyLeave component
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
    // Close the form after successful submission
    setShowLeaveForm(false);
=======
=======
>>>>>>> Stashed changes
        grouped[dateKey].push({
          id: row.id,
          name: row.employee_name || `Employee ${row.employee_id}`,
          status: row.status?.toLowerCase() || "absent",
          checkIn: row.check_in || "-",
          checkOut: row.check_out || "-",
          shift: row.shift || "M",
          shiftTime: "09:00 AM - 06:00 PM",
          remarks: row.remarks || "—",
        });
      });

      setAttendanceByDate(grouped);
    } catch (err) {
      console.error("Attendance fetch failed", err);
    }
>>>>>>> Stashed changes
  };

  /* ======================
     DATE HELPERS
  ====================== */
  const selectedKey = selectedDate.toISOString().split("T")[0];
  const records = attendanceByDate[selectedKey] || [];

  const statusCounts = {
    total: records.length,
    present: records.filter((r) => r.status === "present").length,
    absent: records.filter((r) => r.status === "absent").length,
  };

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  /* ======================
     JSX
  ====================== */
  return (
    <div className="attendance-page">
      {/* HEADER */}
      <div className="att-header">
        <div>
          <h1>Attendance Management</h1>
          <p>View and manage employee attendance records</p>
        </div>
        <button className="leave-btn" onClick={() => navigate("/hr/leaves")}>
<<<<<<< Updated upstream
<<<<<<< Updated upstream
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
          Leave Requests
        </button>
      </div>

      {/* STATUS CARDS */}
      <div className="overall-status">
        <div className="status-card">
          <span>Total</span>
          <strong>{statusCounts.total}</strong>
        </div>
        <div className="status-card">
          <span>Present</span>
          <strong>{statusCounts.present}</strong>
        </div>
        <div className="status-card">
          <span>Absent</span>
          <strong>{statusCounts.absent}</strong>
        </div>
      </div>

      {/* CONTENT */}
      <div className="att-content">
        {/* CALENDAR */}
        <div className="calendar-section">
          <div className="calendar-card">
            <h3>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>

            <div className="calendar-grid">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="cal-day-header">
                  {day}
                </div>
              ))}

              {monthDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`cal-day ${
                    day === selectedDateObj.getDate() &&
                    currentDate.getMonth() === selectedDateObj.getMonth()
                      ? "selected"
                      : ""
                  } ${day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() ? "today" : ""}`}
                  onClick={() => handleDateClick(day)}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Selected Date Display */}
          <div className="selected-date-card">
            <h3>📅 {formattedDate}</h3>
            <span className="record-count">
              {filteredRecords.length} records
            </span>
          </div>

          {/* Filter Section */}
          <div className="filter-section">
            <div className="filter-inputs">
              <div className="filter-item">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="filter-input"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="wfh">WFH</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records Block Display */}
          <div className="records-block-container">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <div key={record.id}>
                  {editingEmployeeId === record.id ? (
                    // Inline Edit Form
                    <div className="inline-edit-form">
                      <div className="edit-form-header">
                        <h4>Edit - {record.name}</h4>
                        <button
                          className="close-edit"
                          onClick={handleCancelEdit}
                        >
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
                          className="edit-save-btn"
                          onClick={() => handleSaveEdit(record.id)}
                        >
                          Save
                        </button>
                        <button
                          className="edit-cancel-btn"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal Record Display
                    <div
                      className={`record-block ${getStatusClass(record.status)}`}
                    >
                      <div className="record-header">
                        <div className="emp-info">
                          <div className="emp-avatar">
                            {record.name.charAt(0)}
                          </div>
                          <div className="emp-details">
                            <h4>{record.name}</h4>
                            <p>{getStatusLabel(record.status)}</p>
                          </div>
                        </div>
                        <button
                          className="edit-btn-block"
                          onClick={() => handleEditClick(record)}
                        >
                          Edit
                        </button>
                      </div>

                      <div className="record-details">
                        <div className="detail-item">
                          <span className="detail-label">Check In</span>
                          <span className="detail-value">{record.checkIn}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Check Out</span>
                          <span className="detail-value">
                            {record.checkOut}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Shift</span>
                          <span className="detail-value">{record.shift}</span>
                        </div>
                      </div>

                      <div className="shift-time-display">
                        <span className="shift-time-label">Shift Time:</span>
                        <span className="shift-time-value">
                          {record.shiftTime}
                        </span>
                      </div>

                      {record.remarks !== "-" && (
                        <div className="record-remarks">
                          <span className="remarks-label">Remarks:</span>
                          <span className="remarks-value">
                            {record.remarks}
                          </span>
                        </div>
                      )}
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
      </div>

      {/* Leave Request Section */}
      <div className="leave-request-section">
        <div className="leave-header">
          <div className="leave-header-text">
            <h2>My Leave Requests</h2>
            <p className="leave-subtitle">
              Apply for leave and track your requests
            </p>
          </div>
          <button
            className="apply-leave-btn"
            onClick={() => setShowLeaveForm(!showLeaveForm)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Apply for Leave
          </button>
        </div>

        {/* ApplyLeave Component - Replaces inline form */}
        {showLeaveForm && (
          <div className="leave-form-wrapper">
            <ApplyLeave
              userRole="employee"
              employeeName=""
              onLeaveSubmitted={handleLeaveSubmitted}
            />
          </div>
        )}

        {/* Applied Leaves List */}
        {appliedLeaves.length > 0 && (
          <div className="applied-leaves">
            <h3>Your Leave History</h3>
            <div className="leaves-list">
              {appliedLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className={`leave-card leave-status-${leave.status}`}
                >
                  <div className="leave-card-header">
                    <div className="leave-title">
                      <h4>{leave.employeeName}</h4>
                      <p className="leave-type">
                        {leave.leaveType.charAt(0).toUpperCase() +
                          leave.leaveType.slice(1)}{" "}
                        Leave
                      </p>
                    </div>
                    <span className={`status-badge status-${leave.status}`}>
                      {leave.status}
                    </span>
=======
=======
>>>>>>> Stashed changes
              {[...Array(31)].map((_, i) => {
                const day = i + 1;
                return (
                  <div
                    key={day}
                    className={`cal-day ${
                      day === selectedDate.getDate() ? "selected" : ""
                    }`}
                    onClick={() =>
                      setSelectedDate(
                        new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth(),
                          day
                        )
                      )
                    }
                  >
                    {day}
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RECORDS */}
        <div className="main-content">
          <h3>
            📅 {selectedDate.getDate()}{" "}
            {monthNames[selectedDate.getMonth()]}{" "}
            {selectedDate.getFullYear()}
          </h3>

          {records.length ? (
            records.map((r) => (
              <div key={r.id} className={`record-block status-${r.status}`}>
                <strong>{r.name}</strong>
                <span>{r.status}</span>

                <div className="meta">
                  <span>Check-in: {r.checkIn}</span>
                  <span>Check-out: {r.checkOut}</span>
                  <span>Shift: {r.shift}</span>
                </div>

                <small>{r.remarks}</small>
              </div>
            ))
          ) : (
            <p className="no-records">No attendance records</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceManagement;