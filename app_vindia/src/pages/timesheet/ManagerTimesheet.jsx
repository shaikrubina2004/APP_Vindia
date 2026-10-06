import { useCallback, useEffect, useState } from "react";
import "../../styles/timesheet.css";
import API from "../../services/authService";
import { fetchTeamLeaves, updateLeaveStatus } from "../../services/leaveService";

const normalizeTimesheetStatus = (status = "") => {
  const value = String(status).trim().toLowerCase().replace(/\s+/g, "_");
  if (value === "pending") return "submitted";
  return value;
};

const displayLeaveType = (leave) =>
  leave.leave_type_label ||
  leave.leave_type ||
  leave.leaveType ||
  "Leave";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calculateLeaveDays = (fromDate, toDate) => {
  const start = new Date(`${String(fromDate).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(toDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  return Math.floor((end - start) / 86400000) + 1;
};

export default function ManagerTimesheet() {
  const [teamData, setTeamData] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [leaveError, setLeaveError] = useState("");

  const loadTeamTimesheets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/timesheets/team");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];

      const formatted = data.map((t) => {
        let workHours = Number(t.workHours || t.work_hours || 0) || 0;

        if (!workHours) {
          try {
            const rows = Array.isArray(t.rows) ? t.rows : [];
            workHours = rows.reduce(
              (sum, row) =>
                sum + Object.values(row.hours || {}).reduce((acc, value) => acc + Number(value || 0), 0),
              0,
            );
          } catch {
            workHours = 0;
          }
        }

        return {
          id: t.id,
          employeeId: t.employee_id,
          name: t.name,
          email: t.email,
          period: t.week || `${t.week_start || ""} – ${t.week_end || ""}`,
          leaveHours: Number(t.leaveHours ?? t.leave_hours ?? 0),
          workingDays: Number(t.working_days || 0),
          type: t.type || t.designation || "Employee",
          status: t.status || t.display_status || "Pending",
          rawStatus: normalizeTimesheetStatus(t.raw_status || t.status),
          workHours,
        };
      });

      setTeamData(formatted);
    } catch (err) {
      console.error("Fetch team timesheets error:", err);
      setError(err?.response?.data?.error || "Failed to load team timesheets.");
      setTeamData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLeaveRequests = useCallback(async () => {
    setLeaveLoading(true);
    setLeaveError("");
    try {
      // The backend scopes this endpoint to the authenticated manager's direct reports.
      // HR/CEO retain their administrative visibility.
      const response = await fetchTeamLeaves("pending");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setLeaveRequests(data);
    } catch (err) {
      console.error("Fetch team leave requests error:", err);
      setLeaveError(err?.response?.data?.error || "Failed to load team leave requests.");
      setLeaveRequests([]);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamTimesheets();
    loadLeaveRequests();
  }, [loadTeamTimesheets, loadLeaveRequests]);

  const getBreak = (days) => Number(days || 0) * 1;
  const getTotal = (work, leave) => Number(work || 0) + Number(leave || 0);
  const getRegular = (work, days) => Math.max(Number(work || 0) - getBreak(days), 0);
  const getOvertime = (work, days) => Math.max(Number(work || 0) - getRegular(work, days), 0);

  const updateTimesheetStatus = async (id, action, comment = "") => {
    try {
      setActionId(`timesheet-${id}-${action}`);
      await API.post(`/timesheets/${id}/${action}`, { comment });
      await loadTeamTimesheets();
    } catch (err) {
      console.error("Timesheet status update error:", err);
      setError(err?.response?.data?.error || "Failed to update timesheet status.");
    } finally {
      setActionId(null);
    }
  };

  const approveLeave = async (leaveId, status) => {
    let comment = "";

    if (status === "Rejected") {
      const result = window.prompt("Reason for rejecting this leave:", "");
      if (result === null) return;
      comment = result.trim();
    }

    try {
      setActionId(`leave-${leaveId}-${status}`);
      setLeaveError("");
      await updateLeaveStatus(leaveId, status, comment);
      await loadLeaveRequests();
    } catch (err) {
      console.error("Leave approval error:", err);
      setLeaveError(err?.response?.data?.error || err?.response?.data?.message || "Failed to update leave request.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="ts-team-view">
      <div className="ts-team-header">
        <div>
          <h2 className="ts-card-title">Team Timesheets</h2>
          <p className="ts-team-subtitle">
            Review timesheets and approve leave requests for your reporting team.
          </p>
        </div>
        <button
          type="button"
          className="ts-btn-refresh"
          onClick={() => {
            loadTeamTimesheets();
            loadLeaveRequests();
          }}
          title="Refresh team timesheets and leave requests"
        >
          ↻
        </button>
      </div>

      <div className="ts-card">
        {error && <div className="ts-inline-error">{error}</div>}

        <div className="ts-table-wrap">
          <table className="ts-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Timesheet Period</th>
                <th>Time Off</th>
                <th>Total Hours</th>
                <th>Type</th>
                <th>Regular</th>
                <th>Overtime</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="ts-empty-state">Loading team timesheets…</td>
                </tr>
              ) : teamData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="ts-empty-state">No timesheets submitted by your team yet.</td>
                </tr>
              ) : (
                teamData.map((t) => {
                  const total = getTotal(t.workHours, t.leaveHours);
                  const regular = getRegular(t.workHours, t.workingDays);
                  const overtime = getOvertime(t.workHours, t.workingDays);
                  const status = normalizeTimesheetStatus(t.rawStatus || t.status);
                  const isPending = ["submitted", "resubmitted"].includes(status);
                  const isReviewing = status === "under_review";
                  const isApproved = status === "approved";
                  const busy = actionId?.startsWith(`timesheet-${t.id}-`);

                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="ts-team-user-name">{t.name || "Unknown employee"}</div>
                        <div className="ts-team-user-email">{t.email || "—"}</div>
                      </td>
                      <td>{t.period}</td>
                      <td>{t.leaveHours} hrs</td>
                      <td><b>{total.toFixed(2)} hrs</b></td>
                      <td>{t.type}</td>
                      <td><b>{regular.toFixed(2)} hrs</b></td>
                      <td>{overtime.toFixed(2)} hrs</td>
                      <td>
                        <span className={`ts-status-badge ${isApproved ? "submitted" : status === "rejected" ? "not-submitted" : "not-submitted"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div className="ts-team-actions">
                          {(isPending || isReviewing) && (
                            <>
                              <button
                                type="button"
                                className="ts-btn-submit"
                                disabled={busy}
                                onClick={() => updateTimesheetStatus(t.id, "approve")}
                              >
                                Approve
                              </button>

                              {isPending && (
                                <button
                                  type="button"
                                  className="ts-btn-secondary"
                                  disabled={busy}
                                  onClick={() => updateTimesheetStatus(t.id, "review")}
                                >
                                  Review
                                </button>
                              )}

                              <button
                                type="button"
                                className="ts-btn-secondary"
                                disabled={busy}
                                onClick={() => {
                                  const comment = window.prompt(
                                    "Reason for requesting changes:",
                                    "Please update the timesheet.",
                                  );
                                  if (comment !== null) {
                                    updateTimesheetStatus(t.id, "request-changes", comment.trim());
                                  }
                                }}
                              >
                                Changes
                              </button>

                              <button
                                type="button"
                                className="ts-btn-secondary ts-btn-danger"
                                disabled={busy}
                                onClick={() => updateTimesheetStatus(t.id, "reject")}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              className="ts-btn-secondary"
                              disabled={busy}
                              onClick={() => updateTimesheetStatus(t.id, "reopen")}
                            >
                              Reopen
                            </button>
                          )}

                          {!isPending && !isReviewing && !isApproved && (
                            <span className="ts-team-waiting">Waiting for employee action</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="ts-card ts-leave-approval-card">
        <div className="ts-team-section-heading">
          <div>
            <h3 className="ts-team-section-title">Pending Leave Requests</h3>
            <p className="ts-team-subtitle">
              Approve or reject leave submitted by employees who report to you.
            </p>
          </div>
          <span className="ts-pending-count">{leaveRequests.length} pending</span>
        </div>

        {leaveError && <div className="ts-inline-error">{leaveError}</div>}

        <div className="ts-leave-list">
          {leaveLoading ? (
            <div className="ts-empty-state">Loading pending leave requests…</div>
          ) : leaveRequests.length === 0 ? (
            <div className="ts-empty-state">No pending leave requests from your team.</div>
          ) : (
            leaveRequests.map((leave) => {
              const days = calculateLeaveDays(leave.from_date, leave.to_date);
              const busyApprove = actionId === `leave-${leave.id}-Approved`;
              const busyReject = actionId === `leave-${leave.id}-Rejected`;

              return (
                <div className="ts-leave-request" key={`leave-${leave.id}`}>
                  <div className="ts-leave-request-main">
                    <div className="ts-team-user-name">{leave.name || leave.employee_name || "Unknown employee"}</div>
                    <div className="ts-team-user-email">{leave.email || leave.employee_email || "—"}</div>
                    <div className="ts-leave-meta">
                      <span className="ts-leave-type">{displayLeaveType(leave)}</span>
                      <span>{formatDate(leave.from_date)} → {formatDate(leave.to_date)}</span>
                      <span>{days} {days === 1 ? "day" : "days"}</span>
                    </div>
                    {leave.reason && <div className="ts-leave-reason">{leave.reason}</div>}
                  </div>

                  <div className="ts-leave-actions">
                    <button
                      type="button"
                      className="ts-btn-submit"
                      disabled={busyApprove || busyReject}
                      onClick={() => approveLeave(leave.id, "Approved")}
                    >
                      Approve Leave
                    </button>
                    <button
                      type="button"
                      className="ts-btn-secondary ts-btn-danger"
                      disabled={busyApprove || busyReject}
                      onClick={() => approveLeave(leave.id, "Rejected")}
                    >
                      Reject Leave
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
