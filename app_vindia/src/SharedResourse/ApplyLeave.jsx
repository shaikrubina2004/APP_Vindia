import React, { useState, useContext } from "react";
import "./ApplyLeave.css";

/* ================= AUTH CONTEXT ================= */
const AuthContext = React.createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
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

/* ================= MAIN COMPONENT ================= */
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

  const HOURS_PER_DAY = 9;
  const HALF_DAY_HOURS = 4.5;

  const [isHalfDay, setIsHalfDay] = useState(false);

  /* ================= HELPERS ================= */

  const getAvailableBalance = () => {
    if (!user) return 0;
    return user.leaveBalance[formData.leaveType] || 0;
  };

  const calculateDuration = (from, to) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const duration = calculateDuration(formData.fromDate, formData.toDate);

  const leaveHours = isHalfDay
    ? HALF_DAY_HOURS
    : duration * HOURS_PER_DAY;

  const availableBalance = getAvailableBalance();

  /* ================= VALIDATION ================= */

  const validateLeaveBalance = () => {
    if (formData.leaveType === "unpaid") return true;

    if (duration > availableBalance) {
      setErrors({
        leaveBalance: `Insufficient balance. Available: ${availableBalance}, Required: ${duration}`,
      });
      return false;
    }
    return true;
  };

  /* ================= HANDLERS ================= */

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData({ ...formData, [name]: value });

    // Reset half-day if date changes
    if (name === "fromDate" || name === "toDate") {
      setIsHalfDay(false);
    }

    // Clear error
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};

    if (!formData.fromDate) newErrors.fromDate = "From Date is required";
    if (!formData.toDate) newErrors.toDate = "To Date is required";
    if (!formData.reason.trim()) newErrors.reason = "Reason is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (new Date(formData.fromDate) > new Date(formData.toDate)) {
      setErrors({ dateRange: "From Date must be before To Date" });
      return;
    }

    /* ✅ Sunday validation */
    let d = new Date(formData.fromDate);
    const end = new Date(formData.toDate);

    while (d <= end) {
      if (d.getDay() === 0) {
        setErrors({ fromDate: "Sunday is week off" });
        return;
      }
      d.setDate(d.getDate() + 1);
    }

    /* ✅ Half day validation */
    if (isHalfDay && duration > 1) {
      setErrors({ fromDate: "Half day only for 1 day" });
      return;
    }

    if (!validateLeaveBalance()) return;

    /* ================= DATA ================= */

    const leaveData = {
      employeeId: user.id,
      employeeName: user.name,
      employeeEmail: user.email,

      leaveType: formData.leaveType,
      fromDate: formData.fromDate,
      toDate: formData.toDate,

      duration,
      leaveHours,
      isHalfDay,

      reason: formData.reason,

      reportingManager: user.reportingManager,
      reportingManagerName: user.reportingManagerName,

      status: "pending",
      appliedOn: new Date().toISOString().split("T")[0],
    };

    /* ✅ Save */
    const existing = JSON.parse(localStorage.getItem("leaves")) || [];
    localStorage.setItem("leaves", JSON.stringify([...existing, leaveData]));

    setLoading(true);

    try {
      if (onLeaveSubmitted) {
        await onLeaveSubmitted(leaveData);
      }

      setSuccessMessage("Leave submitted successfully");

      setFormData({
        leaveType: "casual",
        fromDate: "",
        toDate: "",
        reason: "",
      });

      setIsHalfDay(false);

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrors({ submit: "Submission failed" });
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
    setIsHalfDay(false);
  };

  /* ================= UI ================= */

  if (!user) return <p>Login required</p>;

  return (
    <div className="apply-leave-page">
      <div className="leave-form-container">

        <h2>Apply Leave</h2>

        {successMessage && <div className="success-message">{successMessage}</div>}
        {errors.submit && <div className="error-message">{errors.submit}</div>}

        <form onSubmit={handleSubmit} className="leave-form">

          {/* TYPE */}
          <div className="form-group">
            <label>Leave Type *</label>
            <select name="leaveType" value={formData.leaveType} onChange={handleInputChange}>
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="earned">Earned</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* DATES */}
          <div className="form-row">
            <div className="form-group">
              <label>From Date *</label>
              <input type="date" name="fromDate" value={formData.fromDate} onChange={handleInputChange}/>
              {errors.fromDate && <span className="error-text">{errors.fromDate}</span>}
            </div>

            <div className="form-group">
              <label>To Date *</label>
              <input type="date" name="toDate" value={formData.toDate} onChange={handleInputChange}/>
            </div>
          </div>

          {/* HALF DAY */}
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={isHalfDay}
                disabled={duration > 1}
                onChange={(e) => setIsHalfDay(e.target.checked)}
              />
              Half Day
            </label>
          </div>

          {/* DURATION */}
          {duration > 0 && (
            <div className="duration-info">
              {duration} day(s) ({leaveHours} hrs)
            </div>
          )}

          {/* REASON */}
          <div className="form-group">
            <label>Reason *</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
            />
          </div>

          {/* BUTTONS */}
          <div className="form-buttons">
            <button type="button" onClick={handleCancel} className="btn-cancel">
              Cancel
            </button>

            <button
              type="submit"
              className="btn-submit"
              disabled={loading || duration > availableBalance}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export { AuthContext, useAuth };
export default ApplyLeave;