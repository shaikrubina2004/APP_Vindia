import { API } from "../../services/authService";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ApplyLeave from "../../SharedResourse/ApplyLeave";
import "./Attendance.css";

function AttendanceManagement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateObj, setSelectedDateObj] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [leaveRequestsCount] = useState(3);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const navigate = useNavigate();

  // Edit inline state
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    status: "",
    checkIn: "",
    checkOut: "",
    remarks: "",
  });

  const [appliedLeaves, setAppliedLeaves] = useState([]);

  // Database of attendance records by date
  const [attendanceByDate, setAttendanceByDate] = useState({});
  
  useEffect(() => {
  fetchAttendance();
}, []);

const fetchAttendance = async () => {
  try {
    const res = await API.get("/attendance");

    console.log("API RESPONSE:", res.data);

    const formatted = {};

    res.data.forEach((row) => {
      const key = row.date.split("T")[0]; // ✅ FIX

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

    console.log("FORMATTED:", formatted);

    setAttendanceByDate(formatted);
  } catch (error) {
    console.error(error);
  }
};

  const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate() - 1).padStart(2, "0"); // 🔥 KEY FIX

  return `${year}-${month}-${day}`;
};

const getAttendanceRecordsForDate = () => {
  const key = formatDate(selectedDateObj);
  return attendanceByDate[key] || [];
};

  const attendanceRecords = getAttendanceRecordsForDate();

  // Calculate status counts for selected date
  const getStatusCounts = () => {
    const records = attendanceRecords;
    const counts = {
      total: 125,
      present: 0,
      absent: 0,
      late: 0,
      wfh: 0,
      leave: 0,
    };

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
  const handleSaveEdit = async (employeeId) => {
  try {
    await API.put(`/attendance/${employeeId}`, {
      status:
        editFormData.status.toLowerCase() === "wfh"
          ? "WFH"
          : editFormData.status.charAt(0).toUpperCase() +
            editFormData.status.slice(1),
    });

    fetchAttendance(); // 🔥 reload from DB
    setEditingEmployeeId(null);
  } catch (error) {
    console.error("Update failed:", error);
  }
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
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

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

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthDays = [];

  for (let i = 0; i < firstDay; i++) {
    monthDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    monthDays.push(i);
  }

  const handleDateClick = (day) => {
    if (day) {
      setSelectedDateObj(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      );
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesStatus =
      selectedStatus === "all" || record.status === selectedStatus;
    return matchesStatus;
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

  const formattedDate = `${selectedDateObj.getDate()} ${monthNames[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`;

  return (
    <div className="attendance-page">
      {/* Header */}
      <div className="att-header">
        <div>
          <h1>Attendance Management</h1>
          <p>View and manage employee attendance records</p>
        </div>
        <button className="leave-btn" onClick={() => navigate("/hr/leaves")}>
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
          Leave Requests
          <span className="badge-notification">{leaveRequestsCount}</span>
        </button>
      </div>

      {/* Overall Status Cards */}
      <div className="overall-status">
        <div className="status-card status-total">
          <div className="status-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="status-info">
            <span className="status-label">Total Employees</span>
            <span className="status-value">{statusCounts.total}</span>
          </div>
        </div>

        <div className="status-card status-present">
          <div className="status-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="status-info">
            <span className="status-label">Present</span>
            <span className="status-value">{statusCounts.present}</span>
          </div>
        </div>

        <div className="status-card status-absent">
          <div className="status-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <div className="status-info">
            <span className="status-label">Absent</span>
            <span className="status-value">{statusCounts.absent}</span>
          </div>
        </div>

        <div className="status-card status-late">
          <div className="status-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="status-info">
            <span className="status-label">Late Arrivals</span>
            <span className="status-value">{statusCounts.late}</span>
          </div>
        </div>
      </div>

      <div className="att-content">
        {/* Calendar Section */}
        <div className="calendar-section">
          <div className="calendar-card">
            <div className="calendar-nav">
              <button onClick={handlePrevMonth} className="cal-btn">
                ←
              </button>
              <h3>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <button onClick={handleNextMonth} className="cal-btn">
                →
              </button>
            </div>

            <div className="calendar-grid">
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
                  </div>
                  <div className="leave-card-details">
                    <div className="detail">
                      <span className="label">From:</span>
                      <span className="value">{leave.fromDate}</span>
                    </div>
                    <div className="detail">
                      <span className="label">To:</span>
                      <span className="value">{leave.toDate}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Applied On:</span>
                      <span className="value">{leave.appliedOn}</span>
                    </div>
                  </div>
                  {leave.reason && (
                    <div className="leave-reason">
                      <span className="label">Reason:</span>
                      <span className="value">{leave.reason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Leave Requests</h3>
              <button
                className="modal-close"
                onClick={() => setShowLeaveModal(false)}
              >
                ×
              </button>
            </div>

            <div className="leave-list">
              <div className="leave-item">
                <div className="leave-info">
                  <h4>Anita Verma</h4>
                  <p>Casual Leave - 2 days</p>
                  <span className="leave-date">Jan 15-16, 2024</span>
                </div>
                <div className="leave-actions">
                  <button className="btn-approve">Approve</button>
                  <button className="btn-reject">Reject</button>
                </div>
              </div>

              <div className="leave-item">
                <div className="leave-info">
                  <h4>Sanjay Mishra</h4>
                  <p>Sick Leave - 1 day</p>
                  <span className="leave-date">Jan 20, 2024</span>
                </div>
                <div className="leave-actions">
                  <button className="btn-approve">Approve</button>
                  <button className="btn-reject">Reject</button>
                </div>
              </div>

              <div className="leave-item">
                <div className="leave-info">
                  <h4>Neha Patel</h4>
                  <p>Earned Leave - 3 days</p>
                  <span className="leave-date">Jan 25-27, 2024</span>
                </div>
                <div className="leave-actions">
                  <button className="btn-approve">Approve</button>
                  <button className="btn-reject">Reject</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceManagement;