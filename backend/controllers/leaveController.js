const pool = require("../config/db");

const LEAVE_TYPES = new Set([
  "casual",
  "sick",
  "earned",
  "maternity",
  "paternity",
  "unpaid",
  "comp_off",
]);

const LABELS = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  earned: "Earned Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  unpaid: "Unpaid Leave",
  comp_off: "Comp Off",
  other: "Leave",
};

const labelForType = (value) => LABELS[value] || value || "Leave";

function normalizeLeaveType(value, fallbackReason = "") {
  const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (LEAVE_TYPES.has(raw)) return raw;

  const reason = String(fallbackReason || "").trim().toLowerCase();
  if (reason.includes("sick")) return "sick";
  if (reason.includes("casual")) return "casual";
  if (reason.includes("earned") || reason.includes("annual")) return "earned";
  if (reason.includes("maternity")) return "maternity";
  if (reason.includes("paternity")) return "paternity";
  if (reason.includes("unpaid") || reason.includes("loss of pay")) return "unpaid";
  if (reason.includes("comp off") || reason.includes("comp-off")) return "comp_off";
  return "other";
}

async function hasColumn(tableName, columnName) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
     ) AS present`,
    [tableName, columnName]
  );
  return Boolean(result.rows[0]?.present);
}

async function getEmployeeForUser(userId) {
  const result = await pool.query(
    `SELECT id, user_id, name, email, designation, department, manager_id
       FROM employees
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

function roleOf(req) {
  return String(req.user?.role || "").trim().toLowerCase();
}

const LEAVE_MANAGER_ROLES = new Set([
  "project_manager",
  "operations_manager",
  "finance_manager",
  "hr_manager",
  "ceo",
]);

function isLeaveManager(req) {
  return LEAVE_MANAGER_ROLES.has(roleOf(req));
}

async function canApproveLeave(req, leave) {
  if (!isLeaveManager(req)) return false;
  // CEO is the only global override. HR Manager must also follow the
  // direct-report relationship; HR visibility is handled separately.
  if (roleOf(req) === "ceo") return true;

  const reviewer = await getEmployeeForUser(req.user.id);
  if (!reviewer) return false;

  return Number(leave.manager_id) === Number(reviewer.id);
}

async function canManagerAccessEmployee(req, employeeId) {
  const role = roleOf(req);
  if (role === "ceo" || role === "hr_manager") return true;
  if (!LEAVE_MANAGER_ROLES.has(role)) return false;

  const reviewer = await getEmployeeForUser(req.user.id);
  if (!reviewer) return false;

  const result = await pool.query(
    `SELECT 1 FROM employees WHERE id = $1 AND manager_id = $2 LIMIT 1`,
    [employeeId, reviewer.id]
  );

  return result.rows.length > 0;
}

function shapeLeave(row, fallbackReason = "") {
  const leaveType = normalizeLeaveType(row.leave_type, fallbackReason || row.reason);
  return {
    ...row,
    leave_type: row.leave_type || leaveType,
    leave_type_label: labelForType(leaveType),
  };
}

/** Employee applies for leave. The request body never controls employee_id. */
exports.applyLeave = async (req, res) => {
  const { leaveType, fromDate, toDate, reason } = req.body || {};

  if (!leaveType || !fromDate || !toDate || !String(reason || "").trim()) {
    return res.status(400).json({ message: "Leave type, dates and reason are required." });
  }

  const normalizedType = normalizeLeaveType(leaveType, reason);
  if (!LEAVE_TYPES.has(normalizedType)) {
    return res.status(400).json({ message: "Invalid leave type." });
  }

  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ message: "Invalid leave dates." });
  }
  if (start > end) {
    return res.status(400).json({ message: "fromDate cannot be after toDate." });
  }

  try {
    const employee = await getEmployeeForUser(req.user.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile is not linked to this user account." });
    }

    const overlap = await pool.query(
      `SELECT id
         FROM leaves
        WHERE employee_id = $1
          AND LOWER(COALESCE(status, '')) IN ('pending', 'approved')
          AND from_date <= $3
          AND to_date >= $2
        LIMIT 1`,
      [employee.id, fromDate, toDate]
    );

    if (overlap.rows.length) {
      return res.status(409).json({ message: "You already have a pending or approved leave overlapping these dates." });
    }

    const leaveTypeExists = await hasColumn("leaves", "leave_type");
    let result;

    if (leaveTypeExists) {
      result = await pool.query(
        `INSERT INTO leaves (employee_id, leave_type, from_date, to_date, reason, status)
         VALUES ($1, $2, $3, $4, $5, 'Pending')
         RETURNING *`,
        [employee.id, normalizedType, fromDate, toDate, String(reason).trim()]
      );
    } else {
      // Backward-compatible with the original leaves schema. Once the
      // leave_timesheet_integration.sql migration is applied this path is
      // no longer used, but leave submission keeps working before migration.
      result = await pool.query(
        `INSERT INTO leaves (employee_id, from_date, to_date, reason, status)
         VALUES ($1, $2, $3, $4, 'Pending')
         RETURNING *`,
        [employee.id, fromDate, toDate, String(reason).trim()]
      );
    }

    const row = result.rows[0];
    return res.status(201).json({
      ...shapeLeave(row, normalizedType),
      employee_name: employee.name,
      employee_email: employee.email,
    });
  } catch (err) {
    console.error("applyLeave:", err);
    return res.status(500).json({
      error: "Failed to apply leave",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee profile is not linked to this user account." });
    }

    const result = await pool.query(
      `SELECT l.*, e.name AS employee_name, e.email AS employee_email
         FROM leaves l
         JOIN employees e ON e.id = l.employee_id
        WHERE l.employee_id = $1
        ORDER BY l.from_date DESC, l.created_at DESC`,
      [employee.id]
    );

    res.json(result.rows.map((row) => shapeLeave(row)));
  } catch (err) {
    console.error("getMyLeaves:", err);
    res.status(500).json({ error: "Failed to fetch your leaves" });
  }
};

exports.getLeavesByEmployee = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid employee ID" });

  try {
    const requester = await getEmployeeForUser(req.user.id);
    if (!requester) return res.status(404).json({ error: "Employee profile not found" });

    if (Number(requester.id) !== id) {
      const allowed = await canManagerAccessEmployee(req, id);
      if (!allowed) {
        return res.status(403).json({ error: "You can only view your own leave records or those of your direct reports." });
      }
    }

    const result = await pool.query(
      `SELECT * FROM leaves WHERE employee_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    res.json(result.rows.map((row) => shapeLeave(row)));
  } catch (err) {
    console.error("getLeavesByEmployee:", err);
    res.status(500).json({ error: "Failed to fetch employee leaves" });
  }
};

exports.getAllLeaves = async (req, res) => {
  const { status } = req.query;

  try {
    const role = roleOf(req);
    const reviewer = await getEmployeeForUser(req.user.id);

    let query = `
      SELECT
        l.*,
        e.name,
        e.email,
        e.designation,
        e.department,
        e.manager_id,
        CASE
          WHEN $2 = 'ceo' THEN TRUE
          WHEN $3::text IS NOT NULL AND e.manager_id = $3 THEN TRUE
          WHEN $2 = 'project_manager'
            AND e.manager_id IS NULL
            AND EXISTS (
              SELECT 1
                FROM projects p_scope
               WHERE p_scope.site_engineer_id = e.user_id
                 AND p_scope.manager_id = $3
            ) THEN TRUE
          ELSE FALSE
        END AS can_review
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
    `;
    const values = [role, role, reviewer?.id ?? null];

    if (status) {
      query += ` WHERE LOWER(l.status) = LOWER($1)`;
      values.push(status);
    }
    query += ` ORDER BY l.created_at DESC`;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows.map((row) => shapeLeave(row)));
  } catch (err) {
    console.error("getAllLeaves:", err);
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

exports.getTeamLeaves = async (req, res) => {
  const { status } = req.query;

  try {
    const role = roleOf(req);
    let query = `
      SELECT
        l.*,
        e.name,
        e.email,
        e.designation,
        e.department,
        e.manager_id,
        m.name AS manager_name
      FROM leaves l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN employees m ON m.id = e.manager_id
    `;
    const values = [];

    if (role === "ceo") {
      if (status) {
        query += ` WHERE LOWER(l.status) = LOWER($1)`;
        values.push(status);
      }
    } else {
      const manager = await getEmployeeForUser(req.user.id);
      if (!manager) {
        return res.status(404).json({ error: "Manager employee profile is not linked to this user account." });
      }

      // Every manager role, including HR Manager, sees only employees who
      // actually report to them. Project Manager retains the existing
      // Site Engineer compatibility fallback when manager_id is NULL.
      query += ` WHERE (
        e.manager_id = $1
        OR (
          e.manager_id IS NULL
          AND $2 = 'project_manager'
          AND EXISTS (
            SELECT 1
              FROM projects p_scope
             WHERE p_scope.site_engineer_id = e.user_id
               AND p_scope.manager_id = $1
          )
        )
      )`;
      values.push(manager.id, role);

      if (status) {
        query += ` AND LOWER(l.status) = LOWER($3)`;
        values.push(status);
      }
    }

    query += ` ORDER BY l.created_at DESC, l.id DESC`;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows.map((row) => shapeLeave(row)));
  } catch (err) {
    console.error("getTeamLeaves:", err);
    res.status(500).json({ error: "Failed to fetch team leave requests" });
  }
};

exports.getLeaveSummary = async (req, res) => {
  try {
    let employeeId;
    if (req.params.id === "me") {
      const employee = await getEmployeeForUser(req.user.id);
      if (!employee) return res.status(404).json({ error: "Employee profile not found" });
      employeeId = employee.id;
    } else {
      employeeId = Number(req.params.id);
      if (!Number.isInteger(employeeId) || employeeId <= 0) return res.status(400).json({ error: "Invalid employee ID" });

      const requester = await getEmployeeForUser(req.user.id);
      if (!requester) return res.status(404).json({ error: "Employee profile not found" });
      if (Number(requester.id) !== employeeId) {
        const allowed = await canManagerAccessEmployee(req, employeeId);
        if (!allowed) {
          return res.status(403).json({ error: "You can only view your own leave summary or that of a direct report." });
        }
      }
    }

    const result = await pool.query(
      `SELECT * FROM leaves
        WHERE employee_id = $1
        ORDER BY from_date ASC`,
      [employeeId]
    );

    const approved = result.rows.filter((row) => String(row.status || "").toLowerCase() === "approved");
    const counts = approved.reduce((acc, row) => {
      const type = normalizeLeaveType(row.leave_type, row.reason);
      acc.approved_days_records += 1;
      if (type === "sick") acc.sick_records += 1;
      if (type === "casual") acc.casual_records += 1;
      return acc;
    }, { approved_days_records: 0, sick_records: 0, casual_records: 0 });

    res.json({
      ...counts,
      leaves: approved.map((row) => shapeLeave(row)),
    });
  } catch (err) {
    console.error("getLeaveSummary:", err);
    res.status(500).json({ error: "Summary failed" });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || "").trim();
  const comment = String(req.body?.comment || "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid leave ID" });
  }
  if (!["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const reviewer = await getEmployeeForUser(req.user.id);
    if (!reviewer) {
      return res.status(404).json({ error: "Reviewer employee profile not found." });
    }

    const leaveResult = await pool.query(
      `SELECT l.*, e.manager_id, e.name AS employee_name, e.email AS employee_email
         FROM leaves l
         JOIN employees e ON e.id = l.employee_id
        WHERE l.id = $1
        LIMIT 1`,
      [id]
    );

    const leave = leaveResult.rows[0];
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    const authorized = await canApproveLeave(req, leave);
    if (!authorized) {
      return res.status(403).json({
        error: "Only the employee's direct reporting manager can approve or reject this leave."
      });
    }

    const current = String(leave.status || "").toLowerCase();
    if (!['pending', 'requested', 'under review', 'under_review'].includes(current)) {
      return res.status(409).json({
        message: `Leave is already ${leave.status || "processed"}.`
      });
    }

    const hasReviewedBy = await hasColumn("leaves", "reviewed_by");
    const hasReviewedAt = await hasColumn("leaves", "reviewed_at");
    const hasReviewComment = await hasColumn("leaves", "review_comment");

    const sets = ["status = $1"];
    const values = [status];
    let next = 2;

    if (hasReviewedBy) {
      sets.push(`reviewed_by = $${next}`);
      values.push(reviewer.id);
      next += 1;
    }
    if (hasReviewedAt) {
      sets.push(`reviewed_at = NOW()`);
    }
    if (hasReviewComment) {
      sets.push(`review_comment = $${next}`);
      values.push(comment || null);
      next += 1;
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE leaves
          SET ${sets.join(", ")}
        WHERE id = $${next}
        RETURNING *`,
      values
    );

    return res.status(200).json({
      ...shapeLeave(result.rows[0]),
      reviewer_name: reviewer.name,
      reviewer_employee_id: reviewer.id,
    });
  } catch (err) {
    console.error("updateLeaveStatus:", err);
    return res.status(500).json({ error: "Failed to update leave status" });
  }
};
