import React, { useState } from "react";
import "./Attendance.css";

function AttendanceManagement() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 0));
  const [selectedDateObj, setSelectedDateObj] = useState(new Date(2024, 0, 5));
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [leaveRequestsCount] = useState(3);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({
    employeeName: "",
    fromDate: "",
    toDate: "",
    leaveType: "casual",
    reason: "",
  });
  const [appliedLeaves, setAppliedLeaves] = useState([]);

  // Database of attendance records by date
  const allAttendanceByDate = {
    "2024-1-5": [
      {
        id: 1,
        name: "Ravi Kumar",
        status: "present",
        checkIn: "09:02",
        checkOut: "18:01",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 2,
        name: "Meena Sharma",
        status: "late",
        checkIn: "09:45",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "Traffic delay",
      },
      {
        id: 3,
        name: "Arjun Patel",
        status: "absent",
        checkIn: "-",
        checkOut: "-",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "Sick leave approved",
      },
      {
        id: 4,
        name: "Priya Singh",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 5,
        name: "Vikram Gupta",
        status: "wfh",
        checkIn: "09:15",
        checkOut: "18:15",
        shift: "A",
        shiftTime: "12:00 PM - 09:00 PM",
        remarks: "Work from home",
      },
    ],
    "2024-1-6": [
      {
        id: 1,
        name: "Ravi Kumar",
        status: "present",
        checkIn: "09:05",
        checkOut: "18:02",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 2,
        name: "Meena Sharma",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 3,
        name: "Arjun Patel",
        status: "present",
        checkIn: "09:10",
        checkOut: "18:05",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
    ],
    "2024-1-8": [
      {
        id: 2,
        name: "Meena Sharma",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 4,
        name: "Priya Singh",
        status: "late",
        checkIn: "10:30",
        checkOut: "18:30",
        shift: "E",
        shiftTime: "06:00 PM - 03:00 AM",
        remarks: "Doctor appointment",
      },
      {
        id: 5,
        name: "Vikram Gupta",
        status: "wfh",
        checkIn: "09:00",
        checkOut: "17:00",
        shift: "N",
        shiftTime: "10:00 PM - 07:00 AM",
        remarks: "Working from home",
      },
    ],
    "2024-1-10": [
      {
        id: 1,
        name: "Ravi Kumar",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 3,
        name: "Arjun Patel",
        status: "absent",
        checkIn: "-",
        checkOut: "-",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "Approved leave",
      },
      {
        id: 4,
        name: "Priya Singh",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
    ],
    "2024-1-12": [
      {
        id: 1,
        name: "Ravi Kumar",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 2,
        name: "Meena Sharma",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 3,
        name: "Arjun Patel",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 4,
        name: "Priya Singh",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "M",
        shiftTime: "09:00 AM - 06:00 PM",
        remarks: "-",
      },
      {
        id: 5,
        name: "Vikram Gupta",
        status: "present",
        checkIn: "09:00",
        checkOut: "18:00",
        shift: "A",
        shiftTime: "12:00 PM - 09:00 PM",
        remarks: "-",
      },
    ],
  };

  const getAttendanceRecordsForDate = () => {
    const dateKey = `${selectedDateObj.getFullYear()}-${selectedDateObj.getMonth() + 1}-${selectedDateObj.getDate()}`;
    return allAttendanceByDate[dateKey] || [];
  };

  const attendanceRecords = getAttendanceRecordsForDate();

  // Calculate status counts for selected date
  const getStatusCounts = () => {
    const records = attendanceRecords;
    const counts = {
      total: 125, // Total employees
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

  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitLeaveRequest = (e) => {
    e.preventDefault();
    if (
      leaveFormData.employeeName &&
      leaveFormData.fromDate &&
      leaveFormData.toDate
    ) {
      setAppliedLeaves((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...leaveFormData,
          status: "pending",
          appliedOn: new Date().toLocaleDateString(),
        },
      ]);
      setLeaveFormData({
        employeeName: "",
        fromDate: "",
        toDate: "",
        leaveType: "casual",
        reason: "",
      });
      setShowLeaveForm(false);
    }
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
      case "leave":
        return "status-leave";
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
      case "leave":
        return "Leave";
      default:
        return "-";
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
        <button className="leave-btn" onClick={() => setShowLeaveModal(true)}>
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
                    selectedDateObj.getMonth() === currentDate.getMonth() &&
                    selectedDateObj.getFullYear() === currentDate.getFullYear()
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
                  <option value="leave">Leave</option>
                </select>
              </div>
            </div>
          </div>

          {/* Records Block Display */}
          <div className="records-block-container">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={`record-block ${getStatusClass(record.status)}`}
                >
                  <div className="record-header">
                    <div className="emp-info">
                      <div className="emp-avatar">{record.name.charAt(0)}</div>
                      <div className="emp-details">
                        <h4>{record.name}</h4>
                        <p>{getStatusLabel(record.status)}</p>
                      </div>
                    </div>
                    <button className="edit-btn-block">Edit</button>
                  </div>

                  <div className="record-details">
                    <div className="detail-item">
                      <span className="detail-label">Check In</span>
                      <span className="detail-value">{record.checkIn}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Check Out</span>
                      <span className="detail-value">{record.checkOut}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Shift</span>
                      <span className="detail-value">{record.shift}</span>
                    </div>
                  </div>

                  <div className="shift-time-display">
                    <span className="shift-time-label">Shift Time:</span>
                    <span className="shift-time-value">{record.shiftTime}</span>
                  </div>

                  {record.remarks !== "-" && (
                    <div className="record-remarks">
                      <span className="remarks-label">Remarks:</span>
                      <span className="remarks-value">{record.remarks}</span>
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

        {/* Leave Request Form */}
        {showLeaveForm && (
          <div className="leave-form-container">
            <form onSubmit={handleSubmitLeaveRequest} className="leave-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    name="employeeName"
                    value={leaveFormData.employeeName}
                    onChange={handleLeaveFormChange}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Leave Type</label>
                  <select
                    name="leaveType"
                    value={leaveFormData.leaveType}
                    onChange={handleLeaveFormChange}
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="earned">Earned Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>From Date</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={leaveFormData.fromDate}
                    onChange={handleLeaveFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>To Date</label>
                  <input
                    type="date"
                    name="toDate"
                    value={leaveFormData.toDate}
                    onChange={handleLeaveFormChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason</label>
                <textarea
                  name="reason"
                  value={leaveFormData.reason}
                  onChange={handleLeaveFormChange}
                  placeholder="Enter reason for leave"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  Submit Request
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowLeaveForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
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
