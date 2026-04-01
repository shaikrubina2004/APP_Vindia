import React, { useState, useContext } from "react";
import "./ApplyLeave.css";

// Create a mock Auth Context - Replace with your actual auth context
const AuthContext = React.createContext();

// Hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback for demo purposes
    return {
      user: {
        id: "EMP001",
        name: "John Doe",
        email: "john@company.com",
        role: "site_engineer",
        department: "civil",
        designation: "Senior Engineer",
        reportingManager: "EMP002",
        reportingManagerName: "Sarah Smith",
        leaveBalance: {
          casual: 12,
          sick: 6,
          earned: 20,
          unpaid: 0,
        },
      },
    };
  }
  return context;
};

function ApplyLeave({ onLeaveSubmitted }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    leaveType: "casual",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Get available balance for selected leave type
  const getAvailableBalance = () => {
    if (!user) return 0;
    const leaveType = formData.leaveType.toLowerCase().replace(" ", "_");
    return user.leaveBalance[leaveType] || 0;
  };

  // Calculate duration between dates
  const calculateDuration = (from, to) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const duration = calculateDuration(formData.fromDate, formData.toDate);
  const availableBalance = getAvailableBalance();

  // Validate leave balance
  const validateLeaveBalance = () => {
    const leaveType = formData.leaveType.toLowerCase();

    // Unpaid leave doesn't need balance check
    if (leaveType === "unpaid_leave") return true;

    if (duration > availableBalance) {
      setErrors({
        ...errors,
        leaveBalance: `Insufficient balance. Available: ${availableBalance} days, Required: ${duration} days`,
      });
      return false;
    }
    return true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validation
    if (!formData.fromDate) newErrors.fromDate = "From Date is required";
    if (!formData.toDate) newErrors.toDate = "To Date is required";
    if (!formData.reason || formData.reason.trim() === "")
      newErrors.reason = "Reason is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      setErrors({ dateRange: "From Date must be before To Date" });
      return;
    }

    if (!validateLeaveBalance()) {
      return;
    }

    // Prepare leave data with employee identification
    const leaveData = {
      // EMPLOYEE IDENTIFICATION - CRITICAL
      employeeId: user.id,
      employeeName: user.name,
      employeeEmail: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,

      // LEAVE DETAILS
      leaveType: formData.leaveType,
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      duration: duration,
      reason: formData.reason,

      // APPROVAL CHAIN
      reportingManager: user.reportingManager,
      reportingManagerName: user.reportingManagerName,

      // STATUS
      status: "pending",
      appliedOn: new Date().toISOString().split("T")[0],
      appliedAt: new Date().toISOString(),
    };

    setLoading(true);

    try {
      if (onLeaveSubmitted) {
        await onLeaveSubmitted(leaveData);
      }

      setSuccessMessage("Leave request submitted successfully!");

      // Reset form
      setFormData({
        leaveType: "casual",
        fromDate: "",
        toDate: "",
        reason: "",
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setErrors({
        submit: error.message || "Failed to submit leave request",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      leaveType: "casual",
      fromDate: "",
      toDate: "",
      reason: "",
    });
    setErrors({});
    setSuccessMessage("");
  };

  if (!user) {
    return (
      <div className="apply-leave-page">
        <div className="not-authenticated">
          <p>Please log in to apply for leave</p>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-leave-page">
      <div className="leave-form-container">
        {/* Form Header with Employee Info */}
        <div className="form-header">
          <div className="header-info">
            <h2>Apply for Leave</h2>
            <div className="employee-details">
              <p className="employee-name">
                <strong>{user.name}</strong>
              </p>
              <p className="employee-meta">
                <span className="meta-item">{user.designation}</span>
                <span className="separator">•</span>
                <span className="meta-item">{user.department}</span>
                <span className="separator">•</span>
                <span className="meta-item">ID: {user.id}</span>
              </p>
            </div>
          </div>

          {/* Leave Balance Card */}
          <div className="leave-balance-card">
            <p className="balance-title">Available Leave Balance</p>
            <div className="balance-grid">
              <div className="balance-item">
                <span className="label">Casual</span>
                <span
                  className={`value ${user.leaveBalance.casual < 5 ? "low" : ""}`}
                >
                  {user.leaveBalance.casual}
                </span>
              </div>
              <div className="balance-item">
                <span className="label">Sick</span>
                <span
                  className={`value ${user.leaveBalance.sick < 3 ? "low" : ""}`}
                >
                  {user.leaveBalance.sick}
                </span>
              </div>
              <div className="balance-item">
                <span className="label">Earned</span>
                <span
                  className={`value ${user.leaveBalance.earned < 5 ? "low" : ""}`}
                >
                  {user.leaveBalance.earned}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            {successMessage}
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            {errors.submit}
          </div>
        )}

        <form className="leave-form" onSubmit={handleSubmit}>
          {/* Leave Type */}
          <div className="form-group">
            <label>
              Leave Type <span className="required">*</span>
            </label>
            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleInputChange}
              className={errors.leaveType ? "input-error" : ""}
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
              <option value="unpaid">Unpaid Leave</option>
              <option value="comp_off">Comp Off</option>
            </select>
            {errors.leaveType && (
              <span className="error-text">{errors.leaveType}</span>
            )}
          </div>

          {/* From Date & To Date */}
          <div className="form-row">
            <div className="form-group">
              <label>
                From Date <span className="required">*</span>
              </label>
              <input
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleInputChange}
                className={errors.fromDate ? "input-error" : ""}
              />
              {errors.fromDate && (
                <span className="error-text">{errors.fromDate}</span>
              )}
            </div>
            <div className="form-group">
              <label>
                To Date <span className="required">*</span>
              </label>
              <input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleInputChange}
                className={errors.toDate ? "input-error" : ""}
              />
              {errors.toDate && (
                <span className="error-text">{errors.toDate}</span>
              )}
            </div>
          </div>

          {/* Duration Display & Error */}
          {formData.fromDate && formData.toDate && (
            <div className="duration-info">
              <span className="duration-label">Duration:</span>
              <span
                className={`duration-value ${duration > availableBalance ? "exceed" : ""}`}
              >
                {duration} day{duration !== 1 ? "s" : ""}
              </span>
              {duration > availableBalance && (
                <span className="duration-warning">
                  Exceeds available balance
                </span>
              )}
            </div>
          )}

          {/* Date Range Error */}
          {errors.dateRange && (
            <div className="error-message error-inline">
              <span className="error-icon">⚠</span>
              {errors.dateRange}
            </div>
          )}

          {/* Leave Balance Error */}
          {errors.leaveBalance && (
            <div className="error-message error-inline">
              <span className="error-icon">⚠</span>
              {errors.leaveBalance}
            </div>
          )}

          {/* Reason */}
          <div className="form-group">
            <label>
              Reason <span className="required">*</span>
            </label>
            <textarea
              name="reason"
              placeholder="Enter reason for leave"
              rows="4"
              value={formData.reason}
              onChange={handleInputChange}
              className={errors.reason ? "input-error" : ""}
            />
            {errors.reason && (
              <span className="error-text">{errors.reason}</span>
            )}
          </div>

          {/* Approval Info - HR REMOVED */}
          <div className="approval-info">
            <p className="info-title">Approval Routing:</p>
            <div className="approver-info">
              <div className="approver-item">
                <span className="approver-role">Reporting Manager</span>
                <span className="approver-name">
                  {user.reportingManagerName}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="form-buttons">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || duration > availableBalance}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="form-footer">
          <p>
            <strong>Note:</strong> Once submitted, your leave request will be
            forwarded to {user.reportingManagerName} for approval. You will
            receive an email notification once the request is processed.
          </p>
        </div>
      </div>
    </div>
  );
}

// Export context for provider
export { AuthContext, useAuth };

export default ApplyLeave;