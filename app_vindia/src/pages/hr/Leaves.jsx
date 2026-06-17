import { API } from "../../services/authService";
import React, { useState, useEffect } from "react";
import "./Leaves.css";

/* ══════════════════════════════════════════════════════════
   LEAVE BALANCE — calculated from join date
   ──────────────────────────────────────────────────────────
   RULES:
   • CL = 1.0 day/month  (max 12 per calendar year)
   • SL = 0.5 day/month  (max  6 per calendar year)
   • Accrual starts from the month the employee was added.
   • NO carry-forward across calendar years.
     Every January resets; accrual starts fresh.
   • Absent days AND approved-leave days both consume balance.
   • Any consumption beyond balance = LOP (salary deduction).
   ══════════════════════════════════════════════════════════ */
function calcLeaveBalance(joinDate, approvedLeaves = []) {
  const today = new Date();
  const curY  = today.getFullYear();
  const curM  = today.getMonth() + 1;

  if (!joinDate) return { accruedCL: 0, accruedSL: 0, usedCL: 0, usedSL: 0, balanceCL: 0, balanceSL: 0, total: 0 };

  const jd    = new Date(joinDate);
  const joinY = jd.getFullYear();
  const joinM = jd.getMonth() + 1;

  // Employee hasn't joined yet
  if (joinY > curY || (joinY === curY && joinM > curM)) {
    return { accruedCL: 0, accruedSL: 0, usedCL: 0, usedSL: 0, balanceCL: 0, balanceSL: 0, total: 0 };
  }

  // Accrual starts Jan if joined before this year, else from join month
  const accrualStart = joinY < curY ? 1 : joinM;
  const monthsWorked = Math.max(0, curM - accrualStart + 1);

  const accruedCL = Math.min(parseFloat((monthsWorked * 1.0).toFixed(1)), 12);
  const accruedSL = Math.min(parseFloat((monthsWorked * 0.5).toFixed(1)),  6);

  // Count approved leaves taken this calendar year
  let usedCL = 0;
  let usedSL = 0;

  approvedLeaves.forEach((l) => {
    const from = new Date(l.from_date);
    // Only count if the leave is within the current calendar year
    if (from.getFullYear() !== curY) return;

    const to   = new Date(l.to_date);
    const days = Math.round((to - from) / 86400000) + 1;
    const type = (l.type || l.reason || "").toLowerCase();

    if (type.includes("sick")) usedSL += days;
    else                        usedCL += days;
  });

  const balanceCL = Math.max(0, parseFloat((accruedCL - usedCL).toFixed(1)));
  const balanceSL = Math.max(0, parseFloat((accruedSL - usedSL).toFixed(1)));

  return {
    accruedCL,
    accruedSL,
    usedCL,
    usedSL,
    balanceCL,
    balanceSL,
    totalAccrued: parseFloat((accruedCL + accruedSL).toFixed(1)),
    total: parseFloat((balanceCL + balanceSL).toFixed(1)),
    monthsWorked,
  };
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
function Leaves() {
  const [leaves,          setLeaves]          = useState([]);
  const [expandedId,      setExpandedId]      = useState(null);
  const [summaries,       setSummaries]       = useState({});   // keyed by employee_id
  const [empDetails,      setEmpDetails]      = useState({});   // join_date per employee_id
  const [message,         setMessage]         = useState("");
  const [messageType,     setMessageType]     = useState("success"); // "success" | "error"
  const [filterStatus,    setFilterStatus]    = useState("all");
  const [searchQuery,     setSearchQuery]     = useState("");

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  /* ── Load all leaves ────────────────────────────────────── */
  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res       = await API.get("/leaves");
      const formatted = res.data.map((l) => ({
        id:          l.id,
        employee_id: l.employee_id,
        name:        l.name,
        type:        l.reason,
        from_date:   l.from_date,
        to_date:     l.to_date,
        status:      l.status,
        days:        Math.round(
          (new Date(l.to_date) - new Date(l.from_date)) / 86400000
        ) + 1,
      }));
      setLeaves(formatted);
    } catch (err) {
      console.error("fetchLeaves:", err);
    }
  };

  /* ── Approve / Reject ───────────────────────────────────── */
  const handleAction = async (id, newStatus) => {
    try {
      await API.put(`/leaves/${id}/status`, { status: newStatus });
      showMessage(`Leave ${newStatus} successfully`, "success");
      fetchLeaves();
      // Refresh summary for this employee if expanded
      const leaf = leaves.find((l) => l.id === id);
      if (leaf && expandedId === leaf.employee_id) {
        fetchSummary(leaf.employee_id);
      }
    } catch (err) {
      console.error("handleAction:", err);
      showMessage("Failed to update leave status", "error");
    }
  };

  /* ── Fetch summary for an employee ─────────────────────── */
  const fetchSummary = async (employeeId) => {
    try {
      // Fetch approved leaves for this employee from backend
      const res = await API.get(`/leaves/summary/${employeeId}`);

      // Backend returns: { total, sick, casual, leaves: [...] }
      // "leaves" contains the approved leave records for balance calc
      const approvedLeaves = res.data.leaves || [];

      // Also fetch join_date if we don't have it yet
      if (!empDetails[employeeId]) {
        try {
          const empRes = await API.get(`/employees/${employeeId}`);
          const joinDate = empRes.data.join_date || null;

          setEmpDetails((prev) => ({ ...prev, [employeeId]: joinDate }));

          const balance = calcLeaveBalance(joinDate, approvedLeaves);
          setSummaries((prev) => ({
            ...prev,
            [employeeId]: { ...res.data, balance },
          }));
        } catch {
          // Fallback: compute without join_date
          const balance = calcLeaveBalance(null, approvedLeaves);
          setSummaries((prev) => ({
            ...prev,
            [employeeId]: { ...res.data, balance },
          }));
        }
      } else {
        const joinDate = empDetails[employeeId];
        const balance  = calcLeaveBalance(joinDate, approvedLeaves);
        setSummaries((prev) => ({
          ...prev,
          [employeeId]: { ...res.data, balance },
        }));
      }
    } catch (err) {
      console.error("fetchSummary:", err);
    }
  };

  const toggleSummary = (employeeId) => {
    if (expandedId === employeeId) {
      setExpandedId(null);
    } else {
      setExpandedId(employeeId);
      if (!summaries[employeeId]) fetchSummary(employeeId);
    }
  };

  /* ── Message helper ─────────────────────────────────────── */
  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  /* ── Filter & search ────────────────────────────────────── */
  const todayDate  = new Date(today);
  const filtered   = leaves
    .filter((l) => {
      if (filterStatus !== "all" && l.status.toLowerCase() !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!l.name?.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.from_date) - new Date(b.from_date));

  // Today's active leaves (for the "Today" section)
  const todayLeaves = leaves.filter((l) => {
    const from = new Date(l.from_date);
    const to   = new Date(l.to_date);
    return todayDate >= from && todayDate <= to;
  });

  const pending = leaves.filter((l) => l.status === "Pending").length;

  return (
    <div className="leave-page">
      <div className="wrap">

        {/* ── Flash message ── */}
        {message && (
          <div className={`popup ${messageType === "error" ? "popup--error" : ""}`}>
            {message}
          </div>
        )}

        {/* ── Header ── */}
        <div className="header">
          <div>
            <h1>HR Leave Dashboard</h1>
            <p className="header-sub">
              {todayLeaves.length} on leave today · {pending} pending approval
            </p>
          </div>
          <span className="date">{new Date().toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
          })}</span>
        </div>

        {/* ── Today's snapshot ── */}
        {todayLeaves.length > 0 && (
          <div className="card today-card">
            <h2>On Leave Today</h2>
            <div className="today-pills">
              {todayLeaves.map((l) => (
                <div key={l.id} className={`today-pill today-pill--${l.status.toLowerCase()}`}>
                  <span className="today-name">{l.name}</span>
                  <span className="today-type">{l.type}</span>
                  <span className={`tag ${l.status.toLowerCase()}`}>{l.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Leave Request Table ── */}
        <div className="card">
          <div className="card-toolbar">
            <h2>Leave Requests</h2>
            <div className="toolbar-right">
              <input
                className="search-box"
                type="text"
                placeholder="Search employee…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
                <th>Action</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const isExpanded = expandedId === l.employee_id;
                  const summary    = summaries[l.employee_id];

                  return (
                    <React.Fragment key={l.id}>

                      {/* ── Main row ── */}
                      <tr className={isExpanded ? "row-expanded" : ""}>
                        <td className="emp">{l.name}</td>
                        <td>
                          <span className={`leave-type-badge leave-type-badge--${
                            (l.type || "").toLowerCase().includes("sick") ? "sl" : "cl"
                          }`}>
                            {l.type}
                          </span>
                        </td>

                        <td>
                          {new Date(l.from_date).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </td>

                        <td>
                          {new Date(l.to_date).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </td>

                        <td className="days-col">{l.days}d</td>

                        <td>
                          <span className={`tag ${l.status.toLowerCase()}`}>
                            {l.status}
                          </span>
                        </td>

                        <td>
                          {l.status === "Pending" && (
                            <div className="action-btns">
                              <button
                                className="btn-approve"
                                onClick={() => handleAction(l.id, "Approved")}
                              >
                                ✓ Approve
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => handleAction(l.id, "Rejected")}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                        </td>

                        <td>
                          <button
                            className="view"
                            onClick={() => toggleSummary(l.employee_id)}
                          >
                            {isExpanded ? "Hide ▲" : "View ▼"}
                          </button>
                        </td>
                      </tr>

                      {/* ── Expanded summary row ── */}
                      {isExpanded && (
                        <tr className="summary-row">
                          <td colSpan="8">
                            {!summary ? (
                              <div className="summary-loading">Loading balance…</div>
                            ) : (
                              <div className="summary">
                                <h3>
                                  Leave Balance — {l.name}
                                  <span className="summary-year">
                                    {" "}({new Date().getFullYear()} · {summary.balance?.monthsWorked || 0} months accrued · no cross-year carry-forward)
                                  </span>
                                </h3>

                                {/* Balance cards */}
                                <div className="balance-cards">
                                  <div className="balance-card balance-card--cl">
                                    <span className="bc-label">Casual Leave</span>
                                    <span className="bc-big">{summary.balance?.balanceCL ?? 0}</span>
                                    <span className="bc-sub">
                                      of {summary.balance?.accruedCL ?? 0} accrued · {summary.balance?.usedCL ?? 0} used
                                    </span>
                                  </div>

                                  <div className="balance-card balance-card--sl">
                                    <span className="bc-label">Sick Leave</span>
                                    <span className="bc-big">{summary.balance?.balanceSL ?? 0}</span>
                                    <span className="bc-sub">
                                      of {summary.balance?.accruedSL ?? 0} accrued · {summary.balance?.usedSL ?? 0} used
                                    </span>
                                  </div>

                                  <div className="balance-card balance-card--total">
                                    <span className="bc-label">Total Balance</span>
                                    <span className="bc-big">{summary.balance?.total ?? 0}</span>
                                    <span className="bc-sub">
                                      of {summary.balance?.totalAccrued ?? 0} accrued this year
                                    </span>
                                  </div>
                                </div>

                                {/* LOP warning */}
                                {(() => {
                                  const totalUsed = (summary.balance?.usedCL || 0) + (summary.balance?.usedSL || 0);
                                  const totalAccrued = summary.balance?.totalAccrued || 0;
                                  const lop = Math.max(0, parseFloat((totalUsed - totalAccrued).toFixed(1)));
                                  return lop > 0 ? (
                                    <div className="lop-warning">
                                      ⚠ <strong>{lop} LOP day{lop !== 1 ? "s" : ""}</strong> — leaves taken exceed accrued balance.
                                      Salary deduction applies.
                                    </div>
                                  ) : (
                                    <div className="lop-ok">
                                      ✓ Balance sufficient — no Loss of Pay.
                                    </div>
                                  );
                                })()}

                                {/* Policy reminder */}
                                <div className="policy-note">
                                  Policy: 1.0 CL + 0.5 SL per month worked · Resets every January · Absent days also consume balance
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}

                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Leaves;