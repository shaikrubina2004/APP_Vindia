import React, { useState } from "react";
import "./ApplyLeave.css";
import { useAuth } from "../context/useAuth";
import { fetchMyLeaveBalance } from "../services/leaveService";

const LEAVE_TYPES = [
  ["casual", "Casual Leave"],
  ["sick", "Sick Leave"],
  ["earned", "Earned Leave"],
  ["maternity", "Maternity Leave"],
  ["paternity", "Paternity Leave"],
  ["unpaid", "Unpaid Leave"],
  ["comp_off", "Comp Off"],
];

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
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const loadBalance = async () => {
    setBalanceLoading(true);
    try {
      const response = await fetchMyLeaveBalance();
      setBalance(response.data?.balance || null);
    } catch (error) {
      console.error("Failed to load leave balance:", error);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) loadBalance();
  }, [user?.id]);

  const calculateDuration = (from, to) => {
    if (!from || !to) return 0;
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    return Math.ceil((end - start) / 86400000) + 1;
  };

  const duration = calculateDuration(formData.fromDate, formData.toDate);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, dateRange: undefined, submit: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!formData.fromDate) nextErrors.fromDate = "From Date is required";
    if (!formData.toDate) nextErrors.toDate = "To Date is required";
    if (!formData.reason.trim()) nextErrors.reason = "Reason is required";

    if (formData.fromDate && formData.toDate) {
      if (new Date(`${formData.fromDate}T00:00:00`) > new Date(`${formData.toDate}T00:00:00`)) {
        nextErrors.dateRange = "From Date must be before To Date";
      }
    }

    if (duration > 0 && balance) {
      if (formData.leaveType === "casual" && duration > Number(balance.balanceCL || 0)) {
        nextErrors.submit = `You have only ${Number(balance.balanceCL || 0)} Casual Leave day(s) available. Choose Loss of Pay to continue.`;
      }
      if (formData.leaveType === "sick" && duration > Number(balance.balanceSL || 0)) {
        nextErrors.submit = `You have only ${Number(balance.balanceSL || 0)} Sick Leave day(s) available. Choose Loss of Pay to continue.`;
      }
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const leaveData = {
      leaveType: formData.leaveType,
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      duration,
      reason: formData.reason.trim(),
      employeeName: user?.name || "",
      employeeEmail: user?.email || "",
      role: user?.role || "",
      department: user?.department || "",
      designation: user?.designation || "",
      reportingManager: user?.reportingManager || null,
      reportingManagerName: user?.reportingManagerName || null,
    };

    setLoading(true);
    try {
      if (!onLeaveSubmitted) throw new Error("Leave submission is not connected to the server.");
      const saved = await onLeaveSubmitted(leaveData);
      const pendingMessage = saved?.status
        ? `Leave request submitted successfully (${saved.status}).`
        : "Leave request submitted successfully.";
      setSuccessMessage(pendingMessage);
      setFormData({ leaveType: "casual", fromDate: "", toDate: "", reason: "" });
      setErrors({});
      window.setTimeout(() => setSuccessMessage(""), 3500);
    } catch (error) {
      setErrors({ submit: error?.response?.data?.message || error?.message || "Failed to submit leave request" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ leaveType: "casual", fromDate: "", toDate: "", reason: "" });
    setErrors({});
    setSuccessMessage("");
  };

  if (!user) {
    return (
      <div className="apply-leave-page">
        <div className="not-authenticated"><p>Please log in to apply for leave</p></div>
      </div>
    );
  }

  return (
    <div className="apply-leave-page">
      <div className="leave-form-container">
        <div className="form-header">
          <div className="header-info">
            <h2>Apply for Leave</h2>
            <div className="employee-details">
              <p className="employee-name"><strong>{user.name}</strong></p>
              <p className="employee-meta">
                <span className="meta-item">{user.designation || "Employee"}</span>
                {user.department && <><span className="separator">•</span><span className="meta-item">{user.department}</span></>}
                {user.id && <><span className="separator">•</span><span className="meta-item">User ID: {user.id}</span></>}
              </p>
            </div>
          </div>

          <div className="leave-balance-card">
            <p className="balance-title">Your Leave Balance</p>
            {balanceLoading ? (
              <div className="balance-loading">Loading current balance…</div>
            ) : balance ? (
              <>
                <div className="balance-grid">
                  <div className="balance-item">
                    <span className="label">Casual Leave</span>
                    <span className={`value ${Number(balance.balanceCL) <= 0 ? "low" : ""}`}>{balance.balanceCL} d</span>
                    <span className="balance-sub">{balance.usedCL} used / {balance.accruedCL} accrued</span>
                  </div>
                  <div className="balance-item">
                    <span className="label">Sick Leave</span>
                    <span className={`value ${Number(balance.balanceSL) <= 0 ? "low" : ""}`}>{balance.balanceSL} d</span>
                    <span className="balance-sub">{balance.usedSL} used / {balance.accruedSL} accrued</span>
                  </div>
                  <div className="balance-item">
                    <span className="label">Paid Leave</span>
                    <span className="value">{balance.total} d</span>
                    <span className="balance-sub">Pending: {balance.pendingPaidDays || 0} d</span>
                  </div>
                </div>
                {Number(balance.total) <= 0 ? (
                  <div className="balance-warning">No tracked paid leave is available. You can still apply using <strong>Loss of Pay</strong>.</div>
                ) : (
                  <div className="balance-note">If your requested days exceed the available paid balance, select <strong>Loss of Pay</strong>.</div>
                )}
              </>
            ) : (
              <div className="balance-warning">Leave balance could not be loaded. You can still submit a request, but the server will validate the balance.</div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="success-message"><span className="success-icon">✓</span>{successMessage}</div>
        )}

        {errors.submit && (
          <div className="error-message">
            <span className="error-icon">⚠</span>{errors.submit}
            {(formData.leaveType === "casual" || formData.leaveType === "sick") && duration > 0 && (
              <button type="button" className="lop-inline-button" onClick={() => {
                setFormData((prev) => ({ ...prev, leaveType: "unpaid" }));
                setErrors((prev) => ({ ...prev, submit: undefined }));
              }}>
                Apply as Loss of Pay
              </button>
            )}
          </div>
        )}

        <form className="leave-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Leave Type <span className="required">*</span></label>
            <select name="leaveType" value={formData.leaveType} onChange={handleInputChange}>
              {LEAVE_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {value === "unpaid" ? "Loss of Pay (Unpaid Leave)" : label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>From Date <span className="required">*</span></label>
              <input type="date" name="fromDate" value={formData.fromDate} onChange={handleInputChange} className={errors.fromDate ? "input-error" : ""} />
              {errors.fromDate && <span className="error-text">{errors.fromDate}</span>}
            </div>
            <div className="form-group">
              <label>To Date <span className="required">*</span></label>
              <input type="date" name="toDate" value={formData.toDate} onChange={handleInputChange} className={errors.toDate ? "input-error" : ""} />
              {errors.toDate && <span className="error-text">{errors.toDate}</span>}
            </div>
          </div>

          {formData.fromDate && formData.toDate && (
            <div className="duration-info">
              <span className="duration-label">Duration:</span>
              <span className="duration-value">{duration} day{duration !== 1 ? "s" : ""}</span>
            </div>
          )}

          {errors.dateRange && (
            <div className="error-message error-inline"><span className="error-icon">⚠</span>{errors.dateRange}</div>
          )}

          <div className="form-group">
            <label>Reason <span className="required">*</span></label>
            <textarea name="reason" placeholder="Enter reason for leave" rows="4" value={formData.reason} onChange={handleInputChange} className={errors.reason ? "input-error" : ""} />
            {errors.reason && <span className="error-text">{errors.reason}</span>}
          </div>

          <div className="approval-info">
            <p className="info-title">Approval Routing:</p>
            <div className="approver-info">
              <div className="approver-item">
                <span className="approver-role">Direct Reporting Manager</span>
                <span className="approver-name">Approval is routed to your assigned manager</span>
              </div>
            </div>
          </div>

          <div className="form-buttons">
            <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>

        <div className="form-footer">
          <p><strong>Note:</strong> Your request is stored against your authenticated employee profile. Your direct reporting manager approves or rejects it. HR retains administrative oversight.</p>
        </div>
      </div>
    </div>
  );
}

export default ApplyLeave;
