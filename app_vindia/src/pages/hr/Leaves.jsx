import { API } from "../../services/authService";
import React, { useState, useEffect, useMemo } from "react";
import "./Leaves.css";

const EMPTY_BALANCE = {
  accruedCL: 0,
  accruedSL: 0,
  usedCL: 0,
  usedSL: 0,
  balanceCL: 0,
  balanceSL: 0,
  totalAccrued: 0,
  total: 0,
  monthsWorked: 0,
  clCarryForward: 0,
};

const APPROVED_VALUES = [
  "approved",
  "approve",
  "accepted",
  "accept",
  "confirmed",
];

const REJECTED_VALUES = [
  "rejected",
  "reject",
  "declined",
  "decline",
  "denied",
  "deny",
];

const PENDING_VALUES = [
  "pending",
  "requested",
  "awaiting approval",
  "open",
];

const normalizeStatus = (status = "") => {
  const value = String(status).trim().toLowerCase();

  if (APPROVED_VALUES.includes(value)) return "Approved";
  if (REJECTED_VALUES.includes(value)) return "Rejected";
  if (PENDING_VALUES.includes(value)) return "Pending";

  // Log anything unrecognized so we can add the exact
  // backend value to the lists above instead of silently
  // mismatching it in the stat counts/filters.
  if (value) {
    console.warn(
      `normalizeStatus: unrecognized status "${status}" — add it to the appropriate list`
    );
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getDateOnly = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );
};

const getDaysInRange = (fromDate, toDate) => {
  if (!fromDate || !toDate || fromDate > toDate) {
    return 0;
  }

  return (
    Math.round(
      (toDate.getTime() - fromDate.getTime()) /
        86400000
    ) + 1
  );
};

const getOverlappingDays = (
  leaveFrom,
  leaveTo,
  periodFrom,
  periodTo
) => {
  const effectiveFrom =
    leaveFrom > periodFrom
      ? leaveFrom
      : periodFrom;

  const effectiveTo =
    leaveTo < periodTo ? leaveTo : periodTo;

  return getDaysInRange(
    effectiveFrom,
    effectiveTo
  );
};

function calcLeaveBalance(
  joinDate,
  approvedLeaves = []
) {
  const today = new Date();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  if (!joinDate) {
    return EMPTY_BALANCE;
  }

  const joiningDate = getDateOnly(joinDate);

  if (!joiningDate) {
    return EMPTY_BALANCE;
  }

  const joinYear = joiningDate.getFullYear();
  const joinMonth = joiningDate.getMonth() + 1;

  if (
    joinYear > currentYear ||
    (joinYear === currentYear &&
      joinMonth > currentMonth)
  ) {
    return EMPTY_BALANCE;
  }

  const accrualStartMonth =
    joinYear < currentYear ? 1 : joinMonth;

  const monthsWorked = Math.max(
    0,
    currentMonth - accrualStartMonth + 1
  );

  // Casual Leave carries forward.
  const accruedCL = Math.min(
    parseFloat(monthsWorked.toFixed(1)),
    12
  );

  // Sick Leave is available only for the current month.
  const accruedSL = 1.5;

  const currentYearStart = new Date(
    currentYear,
    0,
    1
  );

  const currentYearEnd = new Date(
    currentYear,
    11,
    31
  );

  const currentMonthStart = new Date(
    currentYear,
    currentMonth - 1,
    1
  );

  const currentMonthEnd = new Date(
    currentYear,
    currentMonth,
    0
  );

  let usedCL = 0;
  let usedSL = 0;

  approvedLeaves.forEach((leave) => {
    const status = normalizeStatus(
      leave.status ||
        leave.leave_status ||
        leave.approval_status
    );

    if (status !== "Approved") {
      return;
    }

    const leaveFrom = getDateOnly(leave.from_date);
    const leaveTo = getDateOnly(leave.to_date);

    if (!leaveFrom || !leaveTo) {
      return;
    }

    const leaveType = (
      leave.type ||
      leave.reason ||
      ""
    ).toLowerCase();

    if (leaveType.includes("sick")) {
      // SL only counts inside the current month.
      usedSL += getOverlappingDays(
        leaveFrom,
        leaveTo,
        currentMonthStart,
        currentMonthEnd
      );
    } else {
      // CL counts for the full current year.
      usedCL += getOverlappingDays(
        leaveFrom,
        leaveTo,
        currentYearStart,
        currentYearEnd
      );
    }
  });

  const balanceCL = Math.max(
    0,
    parseFloat(
      (accruedCL - usedCL).toFixed(1)
    )
  );

  const balanceSL = Math.max(
    0,
    parseFloat(
      (accruedSL - usedSL).toFixed(1)
    )
  );

  const totalAccrued = parseFloat(
    (accruedCL + accruedSL).toFixed(1)
  );

  const total = parseFloat(
    (balanceCL + balanceSL).toFixed(1)
  );

  return {
    accruedCL,
    accruedSL,
    usedCL,
    usedSL,
    balanceCL,
    balanceSL,
    totalAccrued,
    total,
    monthsWorked,
    clCarryForward: balanceCL,
  };
}

function StatCard({
  label,
  value,
  sub,
  tone = "navy",
}) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__label">
        {label}
      </span>

      <span className="stat-card__value">
        {value}
      </span>

      <span className="stat-card__sub">
        {sub}
      </span>
    </div>
  );
}

function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [empDetails, setEmpDetails] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("success");
  const [filterStatus, setFilterStatus] =
    useState("all");
  const [searchQuery, setSearchQuery] =
    useState("");
  const [loading, setLoading] = useState(true);

  const today = new Date();

  const showMessage = (
    text,
    type = "success"
  ) => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const fetchLeaves = async () => {
    setLoading(true);

    try {
      const response = await API.get("/leaves");

      /*
        Supports these backend response formats:

        [
          { id: 1, status: "Rejected" }
        ]

        {
          leaves: [
            { id: 1, status: "Rejected" }
          ]
        }

        {
          data: [
            { id: 1, status: "Rejected" }
          ]
        }
      */
      let leaveData = [];

      if (Array.isArray(response.data)) {
        leaveData = response.data;
      } else if (Array.isArray(response.data?.leaves)) {
        leaveData = response.data.leaves;
      } else if (Array.isArray(response.data?.data)) {
        leaveData = response.data.data;
      }

      console.log("Leave API response:", response.data);
      console.log("Leave records:", leaveData);

      const formattedLeaves = leaveData.map((leave) => {
        const rawStatus =
          leave.status ||
          leave.leave_status ||
          leave.approval_status ||
          "";

        return {
          id: leave.id,
          employee_id: leave.employee_id,

          name:
            leave.name ||
            leave.employee_name ||
            `Employee ${leave.employee_id}`,

          type:
            leave.reason ||
            leave.type ||
            "Leave",

          from_date: leave.from_date,
          to_date: leave.to_date,

          status: normalizeStatus(rawStatus),

          days:
            Math.round(
              (new Date(leave.to_date) -
                new Date(leave.from_date)) /
                86400000
            ) + 1,
        };
      });

      setLeaves(formattedLeaves);
    } catch (error) {
      console.error("fetchLeaves:", error);

      setLeaves([]);

      showMessage(
        "Failed to load leave requests",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchSummary = async (employeeId) => {
    try {
      const response = await API.get(
        `/leaves/summary/${employeeId}`
      );

      const approvedLeaves = (
        response.data?.leaves || []
      )
        .map((leave) => ({
          ...leave,
          status: normalizeStatus(
            leave.status ||
              leave.leave_status ||
              leave.approval_status
          ),
        }))
        .filter(
          (leave) => leave.status === "Approved"
        );

      let joinDate = empDetails[employeeId];

      if (!joinDate) {
        try {
          const employeeResponse = await API.get(
            `/employees/${employeeId}`
          );

          joinDate =
            employeeResponse.data?.join_date ||
            null;

          setEmpDetails((previous) => ({
            ...previous,
            [employeeId]: joinDate,
          }));
        } catch (error) {
          console.error(
            "Failed to load employee details:",
            error
          );

          joinDate = null;
        }
      }

      const balance = calcLeaveBalance(
        joinDate,
        approvedLeaves
      );

      setSummaries((previous) => ({
        ...previous,
        [employeeId]: {
          ...response.data,
          balance,
        },
      }));
    } catch (error) {
      console.error("fetchSummary:", error);
    }
  };

  const handleAction = async (id, newStatus) => {
    try {
      await API.put(`/leaves/${id}/status`, {
        status: newStatus,
      });

      showMessage(
        `Leave ${newStatus.toLowerCase()} successfully`,
        "success"
      );

      const selectedLeave = leaves.find(
        (leave) => leave.id === id
      );

      await fetchLeaves();

      if (
        selectedLeave &&
        expandedId === selectedLeave.employee_id
      ) {
        await fetchSummary(
          selectedLeave.employee_id
        );
      }
    } catch (error) {
      console.error("handleAction:", error);

      showMessage(
        "Failed to update leave status",
        "error"
      );
    }
  };

  const toggleSummary = (employeeId) => {
    if (expandedId === employeeId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(employeeId);

    if (!summaries[employeeId]) {
      fetchSummary(employeeId);
    }
  };

  const filtered = useMemo(() => {
    return leaves
      .filter((leave) => {
        const status = String(
          leave.status || ""
        ).toLowerCase();

        if (
          filterStatus !== "all" &&
          status !== filterStatus
        ) {
          return false;
        }

        if (searchQuery.trim()) {
          const query = searchQuery
            .trim()
            .toLowerCase();

          if (
            !leave.name
              ?.toLowerCase()
              .includes(query)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (first, second) =>
          new Date(first.from_date) -
          new Date(second.from_date)
      );
  }, [
    leaves,
    filterStatus,
    searchQuery,
  ]);

  /*
    Show every request that covers today:
    - Approved
    - Rejected
    - Pending

    Only approved requests count in the On Leave Today
    statistic.
  */
  const todayLeaveRequests = leaves.filter(
    (leave) => {
      const fromDate = getDateOnly(leave.from_date);
      const toDate = getDateOnly(leave.to_date);
      const currentDate = getDateOnly(today);

      if (!fromDate || !toDate || !currentDate) {
        return false;
      }

      const status = normalizeStatus(
        leave.status
      );

      return (
        currentDate >= fromDate &&
        currentDate <= toDate &&
        ["Approved", "Rejected", "Pending"].includes(
          status
        )
      );
    }
  );

  const todayLeaves = todayLeaveRequests.filter(
    (leave) =>
      normalizeStatus(leave.status) === "Approved"
  );

  /*
    These counts include all leave requests,
    not only today's requests.
  */
  const pending = leaves.filter(
    (leave) =>
      normalizeStatus(leave.status) === "Pending"
  ).length;

  const approved = leaves.filter(
    (leave) =>
      normalizeStatus(leave.status) === "Approved"
  ).length;

  const rejected = leaves.filter(
    (leave) =>
      normalizeStatus(leave.status) === "Rejected"
  ).length;

  return (
    <div className="leave-page">
      <div className="leave-shell">
        {message && (
          <div
            className={`toast ${
              messageType === "error"
                ? "toast--error"
                : ""
            }`}
          >
            {message}
          </div>
        )}

        <div className="hero">
          <div>
            <h1 className="eyebrow">
              Leave Management
            </h1>
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
          <StatCard
            label="Pending"
            value={pending}
            sub="Awaiting approval"
            tone="navy"
          />

          <StatCard
            label="Approved"
            value={approved}
            sub="Completed requests"
            tone="blue"
          />

          <StatCard
            label="Rejected"
            value={rejected}
            sub="Not accepted"
            tone="sky"
          />

          <StatCard
            label="On Leave Today"
            value={todayLeaves.length}
            sub="Approved leave only"
            tone="mist"
          />
        </div>

        {todayLeaveRequests.length > 0 && (
          <div className="card">
            <div className="section-head">
              <h2>Today's Leave Requests</h2>

              <span className="section-meta">
                {todayLeaveRequests.length} request
                {todayLeaveRequests.length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>

            <div className="pill-grid">
              {todayLeaveRequests.map((leave) => {
                const statusClass = String(
                  leave.status || ""
                ).toLowerCase();

                return (
                  <div
                    key={leave.id}
                    className={`today-pill today-pill--${statusClass}`}
                  >
                    <div className="today-pill__top">
                      <strong>{leave.name}</strong>

                      <span
                        className={`tag tag--${statusClass}`}
                      >
                        {leave.status}
                      </span>
                    </div>

                    <div className="today-pill__sub">
                      {leave.type}
                    </div>

                    <div className="today-pill__sub">
                      {leave.days} day
                      {leave.days !== 1
                        ? "s"
                        : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card">
          <div className="toolbar">
            <div>
              <h2>Leave Requests</h2>

              <p>
                Search, filter, and process leave
                applications.
              </p>
            </div>

            <div className="toolbar-right">
              <input
                className="search-box"
                type="text"
                placeholder="Search employee"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
              />

              <select
                className="status-filter"
                value={filterStatus}
                onChange={(event) =>
                  setFilterStatus(event.target.value)
                }
              >
                <option value="all">
                  All Status
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="rejected">
                  Rejected
                </option>
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
                    <td
                      colSpan="8"
                      className="empty-cell"
                    >
                      Loading leave requests…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="empty-cell"
                    >
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((leave) => {
                    const isExpanded =
                      expandedId ===
                      leave.employee_id;

                    const summary =
                      summaries[leave.employee_id];

                    const statusClass = String(
                      leave.status || ""
                    ).toLowerCase();

                    const leaveTypeClass = (
                      leave.type || ""
                    )
                      .toLowerCase()
                      .includes("sick")
                      ? "sl"
                      : "cl";

                    return (
                      <React.Fragment
                        key={leave.id}
                      >
                        <tr
                          className={
                            isExpanded
                              ? "row-expanded"
                              : ""
                          }
                        >
                          <td className="emp">
                            {leave.name}
                          </td>

                          <td>
                            <span
                              className={`leave-type-badge leave-type-badge--${leaveTypeClass}`}
                            >
                              {leave.type}
                            </span>
                          </td>

                          <td>
                            {new Date(
                              leave.from_date
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </td>

                          <td>
                            {new Date(
                              leave.to_date
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </td>

                          <td className="days-col">
                            {leave.days}d
                          </td>

                          <td>
                            <span
                              className={`tag tag--${statusClass}`}
                            >
                              {leave.status}
                            </span>
                          </td>

                          <td>
                            {statusClass ===
                            "pending" ? (
                              <div className="action-btns">
                                <button
                                  className="btn-approve"
                                  onClick={() =>
                                    handleAction(
                                      leave.id,
                                      "Approved"
                                    )
                                  }
                                >
                                  Approve
                                </button>

                                <button
                                  className="btn-reject"
                                  onClick={() =>
                                    handleAction(
                                      leave.id,
                                      "Rejected"
                                    )
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="muted">
                                —
                              </span>
                            )}
                          </td>

                          <td>
                            <button
                              className="view"
                              onClick={() =>
                                toggleSummary(
                                  leave.employee_id
                                )
                              }
                            >
                              {isExpanded
                                ? "Hide"
                                : "View"}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="summary-row">
                            <td colSpan="8">
                              {!summary ? (
                                <div className="summary-loading">
                                  Loading balance…
                                </div>
                              ) : (
                                <div className="summary">
                                  <div className="summary-head">
                                    <div>
                                      <h3>
                                        {leave.name}
                                      </h3>

                                      <p>
                                        {
                                          new Date().getFullYear()
                                        }{" "}
                                        •{" "}
                                        {summary.balance
                                          ?.monthsWorked ||
                                          0}{" "}
                                        months accrued
                                      </p>
                                    </div>

                                    <div className="summary-chip">
                                      {summary.balance
                                        ?.total ?? 0}{" "}
                                      total balance
                                    </div>
                                  </div>

                                  <div className="balance-cards">
                                    <div className="balance-card">
                                      <span className="bc-label">
                                        Casual Leave
                                      </span>

                                      <span className="bc-big">
                                        {summary.balance
                                          ?.balanceCL ?? 0}
                                      </span>

                                      <span className="bc-sub">
                                        {summary.balance
                                          ?.usedCL ?? 0}{" "}
                                        used of{" "}
                                        {summary.balance
                                          ?.accruedCL ?? 0}
                                        {" "}• Carry forward
                                        enabled
                                      </span>
                                    </div>

                                    <div className="balance-card">
                                      <span className="bc-label">
                                        Sick Leave
                                      </span>

                                      <span className="bc-big">
                                        {summary.balance
                                          ?.balanceSL ?? 0}
                                      </span>

                                      <span className="bc-sub">
                                        {summary.balance
                                          ?.usedSL ?? 0}{" "}
                                        used of{" "}
                                        {summary.balance
                                          ?.accruedSL ?? 0}
                                        {" "}• Current month
                                        only
                                      </span>
                                    </div>

                                    <div className="balance-card balance-card--accent">
                                      <span className="bc-label">
                                        Total Balance
                                      </span>

                                      <span className="bc-big">
                                        {summary.balance
                                          ?.total ?? 0}
                                      </span>

                                      <span className="bc-sub">
                                        CL carries forward • SL
                                        resets monthly
                                      </span>
                                    </div>
                                  </div>

                                  {(() => {
                                    const usedCL =
                                      summary.balance
                                        ?.usedCL || 0;

                                    const accruedCL =
                                      summary.balance
                                        ?.accruedCL || 0;

                                    const usedSL =
                                      summary.balance
                                        ?.usedSL || 0;

                                    const accruedSL =
                                      summary.balance
                                        ?.accruedSL || 0;

                                    const clLOP = Math.max(
                                      0,
                                      parseFloat(
                                        (
                                          usedCL -
                                          accruedCL
                                        ).toFixed(1)
                                      )
                                    );

                                    const slLOP = Math.max(
                                      0,
                                      parseFloat(
                                        (
                                          usedSL -
                                          accruedSL
                                        ).toFixed(1)
                                      )
                                    );

                                    const lop = parseFloat(
                                      (
                                        clLOP + slLOP
                                      ).toFixed(1)
                                    );

                                    return lop > 0 ? (
                                      <div className="status-note status-note--warn">
                                        <strong>
                                          {lop} LOP day
                                          {lop !== 1
                                            ? "s"
                                            : ""}
                                        </strong>{" "}
                                        generated because
                                        leave usage exceeded
                                        the available balance.
                                      </div>
                                    ) : (
                                      <div className="status-note status-note--ok">
                                        Balance sufficient. No
                                        Loss of Pay.
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