import { API } from "../../services/authService";
import React, { useState, useEffect, useMemo } from "react";
import "./Leaves.css";

function calcLeaveBalance(joinDate, approvedLeaves = []) {
  const today = new Date();
  const curY = today.getFullYear();
  const curM = today.getMonth() + 1;

  if (!joinDate) {
    return {
      accruedCL: 0,
      accruedSL: 0,
      usedCL: 0,
      usedSL: 0,
      balanceCL: 0,
      balanceSL: 0,
      totalAccrued: 0,
      total: 0,
      monthsWorked: 0,
    };
  }

  const jd = new Date(joinDate);
  const joinY = jd.getFullYear();
  const joinM = jd.getMonth() + 1;

  if (joinY > curY || (joinY === curY && joinM > curM)) {
    return {
      accruedCL: 0,
      accruedSL: 0,
      usedCL: 0,
      usedSL: 0,
      balanceCL: 0,
      balanceSL: 0,
      totalAccrued: 0,
      total: 0,
      monthsWorked: 0,
    };
  }

  const accrualStart = joinY < curY ? 1 : joinM;
  const monthsWorked = Math.max(0, curM - accrualStart + 1);

  const accruedCL = Math.min(parseFloat((monthsWorked * 1.0).toFixed(1)), 12);
  const accruedSL = Math.min(parseFloat((monthsWorked * 0.5).toFixed(1)), 6);

  let usedCL = 0;
  let usedSL = 0;

  approvedLeaves.forEach((l) => {
    const from = new Date(l.from_date);
    if (from.getFullYear() !== curY) return;

    const to = new Date(l.to_date);
    const days = Math.round((to - from) / 86400000) + 1;
    const type = (l.type || l.reason || "").toLowerCase();

    if (type.includes("sick")) usedSL += days;
    else usedCL += days;
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

function StatCard({ label, value, sub, tone = "navy" }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__sub">{sub}</span>
    </div>
  );
}

function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [empDetails, setEmpDetails] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const today = new Date();

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await API.get("/leaves");
      const formatted = res.data.map((l) => ({
        id: l.id,
        employee_id: l.employee_id,
        name: l.name,
        type: l.reason,
        from_date: l.from_date,
        to_date: l.to_date,
        status: l.status,
        days: Math.round((new Date(l.to_date) - new Date(l.from_date)) / 86400000) + 1,
      }));
      setLeaves(formatted);
    } catch (err) {
      console.error("fetchLeaves:", err);
      showMessage("Failed to load leave requests", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchSummary = async (employeeId) => {
    try {
      const res = await API.get(`/leaves/summary/${employeeId}`);
      const approvedLeaves = res.data.leaves || [];

      let joinDate = empDetails[employeeId];
      if (!joinDate) {
        try {
          const empRes = await API.get(`/employees/${employeeId}`);
          joinDate = empRes.data.join_date || null;
          setEmpDetails((prev) => ({ ...prev, [employeeId]: joinDate }));
        } catch {
          joinDate = null;
        }
      }

      const balance = calcLeaveBalance(joinDate, approvedLeaves);
      setSummaries((prev) => ({
        ...prev,
        [employeeId]: { ...res.data, balance },
      }));
    } catch (err) {
      console.error("fetchSummary:", err);
    }
  };

  const handleAction = async (id, newStatus) => {
    try {
      await API.put(`/leaves/${id}/status`, { status: newStatus });
      showMessage(`Leave ${newStatus.toLowerCase()} successfully`, "success");
      await fetchLeaves();

      const leaf = leaves.find((l) => l.id === id);
      if (leaf) {
        if (expandedId === leaf.employee_id) {
          fetchSummary(leaf.employee_id);
        }
      }
    } catch (err) {
      console.error("handleAction:", err);
      showMessage("Failed to update leave status", "error");
    }
  };

  const toggleSummary = (employeeId) => {
    if (expandedId === employeeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(employeeId);
    if (!summaries[employeeId]) fetchSummary(employeeId);
  };

  const filtered = useMemo(() => {
    return leaves
      .filter((l) => {
        if (filterStatus !== "all" && l.status.toLowerCase() !== filterStatus) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!l.name?.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.from_date) - new Date(b.from_date));
  }, [leaves, filterStatus, searchQuery]);

  const todayLeaves = leaves.filter((l) => {
    const from = new Date(l.from_date);
    const to = new Date(l.to_date);
    return today >= from && today <= to;
  });

  const pending = leaves.filter((l) => l.status === "Pending").length;
  const approved = leaves.filter((l) => l.status === "Approved").length;
  const rejected = leaves.filter((l) => l.status === "Rejected").length;

  return (
    <div className="leave-page">
      <div className="leave-shell">
        {message && (
          <div className={`toast ${messageType === "error" ? "toast--error" : ""}`}>
            {message}
          </div>
        )}

        <div className="hero">
          <div>
            <h1 className="eyebrow">Leave Management</h1>
            
            
          </div>

          <div className="hero-date">
            {today.toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        <div className="stats-row">
          <StatCard label="Pending" value={pending} sub="Awaiting approval" tone="navy" />
          <StatCard label="Approved" value={approved} sub="Completed requests" tone="blue" />
          <StatCard label="Rejected" value={rejected} sub="Not accepted" tone="sky" />
          <StatCard label="On Leave Today" value={todayLeaves.length} sub="Active now" tone="mist" />
        </div>

        {todayLeaves.length > 0 && (
          <div className="card">
            <div className="section-head">
              <h2>On Leave Today</h2>
              <span className="section-meta">{todayLeaves.length} employee(s)</span>
            </div>

            <div className="pill-grid">
              {todayLeaves.map((l) => (
                <div key={l.id} className={`today-pill today-pill--${l.status.toLowerCase()}`}>
                  <div className="today-pill__top">
                    <strong>{l.name}</strong>
                    <span className={`tag tag--${l.status.toLowerCase()}`}>{l.status}</span>
                  </div>
                  <div className="today-pill__sub">{l.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="toolbar">
            <div>
              <h2>Leave Requests</h2>
              <p>Search, filter, and process leave applications.</p>
            </div>

            <div className="toolbar-right">
              <input
                className="search-box"
                type="text"
                placeholder="Search employee"
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

          <div className="table-wrap">
            <table className="leave-table">
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
                {loading ? (
                  <tr>
                    <td colSpan="8" className="empty-cell">Loading leave requests…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-cell">No leave requests found.</td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const isExpanded = expandedId === l.employee_id;
                    const summary = summaries[l.employee_id];

                    return (
                      <React.Fragment key={l.id}>
                        <tr className={isExpanded ? "row-expanded" : ""}>
                          <td className="emp">{l.name}</td>
                          <td>
                            <span className={`leave-type-badge leave-type-badge--${(l.type || "").toLowerCase().includes("sick") ? "sl" : "cl"}`}>
                              {l.type}
                            </span>
                          </td>
                          <td>{new Date(l.from_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td>{new Date(l.to_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td className="days-col">{l.days}d</td>
                          <td>
                            <span className={`tag tag--${l.status.toLowerCase()}`}>
                              {l.status}
                            </span>
                          </td>
                          <td>
                            {l.status === "Pending" ? (
                              <div className="action-btns">
                                <button className="btn-approve" onClick={() => handleAction(l.id, "Approved")}>
                                  Approve
                                </button>
                                <button className="btn-reject" onClick={() => handleAction(l.id, "Rejected")}>
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            <button className="view" onClick={() => toggleSummary(l.employee_id)}>
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="summary-row">
                            <td colSpan="8">
                              {!summary ? (
                                <div className="summary-loading">Loading balance…</div>
                              ) : (
                                <div className="summary">
                                  <div className="summary-head">
                                    <div>
                                      <h3>{l.name}</h3>
                                      <p>
                                        {new Date().getFullYear()} • {summary.balance?.monthsWorked || 0} months accrued
                                      </p>
                                    </div>
                                    <div className="summary-chip">
                                      {summary.balance?.total ?? 0} total balance
                                    </div>
                                  </div>

                                  <div className="balance-cards">
                                    <div className="balance-card">
                                      <span className="bc-label">Casual Leave</span>
                                      <span className="bc-big">{summary.balance?.balanceCL ?? 0}</span>
                                      <span className="bc-sub">
                                        {summary.balance?.usedCL ?? 0} used of {summary.balance?.accruedCL ?? 0}
                                      </span>
                                    </div>

                                    <div className="balance-card">
                                      <span className="bc-label">Sick Leave</span>
                                      <span className="bc-big">{summary.balance?.balanceSL ?? 0}</span>
                                      <span className="bc-sub">
                                        {summary.balance?.usedSL ?? 0} used of {summary.balance?.accruedSL ?? 0}
                                      </span>
                                    </div>

                                    <div className="balance-card balance-card--accent">
                                      <span className="bc-label">Total Balance</span>
                                      <span className="bc-big">{summary.balance?.total ?? 0}</span>
                                      <span className="bc-sub">
                                        {summary.balance?.totalAccrued ?? 0} accrued this year
                                      </span>
                                    </div>
                                  </div>

                                  {(() => {
                                    const totalUsed = (summary.balance?.usedCL || 0) + (summary.balance?.usedSL || 0);
                                    const totalAccrued = summary.balance?.totalAccrued || 0;
                                    const lop = Math.max(0, parseFloat((totalUsed - totalAccrued).toFixed(1)));
                                    return lop > 0 ? (
                                      <div className="status-note status-note--warn">
                                        <strong>{lop} LOP day{lop !== 1 ? "s" : ""}</strong> generated because leave usage exceeded accrual.
                                      </div>
                                    ) : (
                                      <div className="status-note status-note--ok">
                                        Balance sufficient. No Loss of Pay.
                                      </div>
                                    );
                                  })()}
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
    </div>
  );
}

export default Leaves;