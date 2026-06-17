// backend/controllers/travelExpenseController.js
const pool = require("../config/db");

// ── HR roles that bypass PM and go directly to CEO ───────────────────────────
const HR_ROLES = [
  "hr_manager",
  "hr",
  "human_resources",
  "hr_executive",
  "hr_officer",
];

const isHRRole = (role = "") =>
  HR_ROLES.includes(role.toLowerCase().replace(/\s+/g, "_"));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate request_no like TR-2026-0042 */
async function generateRequestNo() {
  const year = new Date().getFullYear();
  const res = await pool.query(
    `SELECT COUNT(*) FROM travel_expense_requests
     WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year]
  );
  const seq = parseInt(res.rows[0].count, 10) + 1;
  return `TR-${year}-${String(seq).padStart(4, "0")}`;
}

// ── POST /api/travel-expenses ─────────────────────────────────────────────────
// Employee submits a new request
exports.createRequest = async (req, res) => {
  const {
    user_id,
    employee_name,
    designation,
    department,
    trip_title,
    origin,
    destination,
    travel_from_date,
    travel_to_date,
    purpose,
    notes,
    budget_type,
    project_id,
    payment_mode,
    receipts,        // array: [{ expense_type, file_name, file_url, file_size_kb }]
    route_to_ceo,    // boolean — set by frontend when submitter is HR
  } = req.body;

  // Required field validation
  if (
    !user_id ||
    !employee_name ||
    !designation ||
    !department ||
    !trip_title ||
    !destination ||
    !travel_from_date ||
    !travel_to_date ||
    !purpose ||
    !budget_type ||
    !payment_mode
  ) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  if (budget_type === "project" && !project_id) {
    return res
      .status(400)
      .json({ message: "project_id is required for project budget type" });
  }

  // Self-paid must include receipts
  if (payment_mode === "self" && (!Array.isArray(receipts) || receipts.length === 0)) {
    return res
      .status(400)
      .json({ message: "At least one receipt is required for self-paid requests" });
  }

  // Determine approval routing:
  // - HR staff → routed to CEO (pm_status auto-approved, final approval by CEO)
  // - Everyone else → goes to PM first, then HR
  const isHR = route_to_ceo === true || isHRRole(designation);
  console.log(`[TravelExpense] createRequest | designation="${designation}" | isHR=${isHR} | initialPmStatus=${isHR ? "Approved" : "Pending"}`);

  // For HR requests: pm_status = 'Approved' so it skips PM entirely;
  // a separate 'ceo_status' field tracks CEO approval (stored in review_note
  // pathway for now — or extend the table to add ceo_status if needed).
  const initialPmStatus = isHR ? "Approved" : "Pending";
  const initialStatus = "Pending";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const request_no = await generateRequestNo();

    const insertResult = await client.query(
      `INSERT INTO travel_expense_requests (
        request_no, user_id, employee_name, designation, department,
        trip_title, origin, destination, travel_from_date, travel_to_date,
        purpose, notes, budget_type, project_id, payment_mode,
        pm_status, status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      ) RETURNING *`,
      [
        request_no,
        user_id,
        employee_name,
        designation,
        department,
        trip_title || null,
        origin || null,
        destination,
        travel_from_date,
        travel_to_date,
        purpose,
        notes || null,
        budget_type,
        project_id || null,
        payment_mode,
        initialPmStatus,
        initialStatus,
      ]
    );

    const newRequest = insertResult.rows[0];

    // Insert receipts (only present for self-paid)
    if (Array.isArray(receipts) && receipts.length > 0) {
      for (const r of receipts) {
        await client.query(
          `INSERT INTO travel_expense_receipts
             (request_id, expense_type, file_name, file_url, file_size_kb)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            newRequest.id,
            r.expense_type || "general",
            r.file_name,
            r.file_url,
            r.file_size_kb || null,
          ]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      ...newRequest,
      routed_to_ceo: isHR,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createRequest error:", err);
    res.status(500).json({ error: "Failed to submit travel expense request", detail: err.message });
  } finally {
    client.release();
  }
};

// ── GET /api/travel-expenses ──────────────────────────────────────────────────
// HR: all requests. Employee: own requests via ?user_id=
// PM: ?role=project_manager  — sees only pm_status=Pending (non-HR)
// HR: ?role=hr_manager       — sees pm_status=Approved (ready for HR review)
// CEO: ?role=ceo             — sees all HR-submitted requests pending final approval
exports.getRequests = async (req, res) => {
  const { user_id, status, role } = req.query;

  let query = `
    SELECT ter.*,
           p.name AS project_name
    FROM travel_expense_requests ter
    LEFT JOIN projects p ON p.id = ter.project_id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) {
    params.push(user_id);
    query += ` AND ter.user_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    query += ` AND ter.status = $${params.length}`;
  }

  if (role === "project_manager") {
    // PM sees non-HR requests that haven't been PM-reviewed yet
    query += ` AND ter.pm_status = 'Pending' AND ter.status = 'Pending'`;
  } else if (role === "hr_manager") {
    // HR sees non-HR requests that PM has approved
    query += ` AND ter.pm_status = 'Approved' AND ter.status = 'Pending'
               AND ter.designation NOT IN (${HR_ROLES.map((_, i) => `$${params.length + i + 1}`).join(",")})`;
    params.push(...HR_ROLES);
  } else if (role === "ceo") {
    // CEO action queue: HR-submitted requests pending final decision
    query += ` AND ter.pm_status = 'Approved' AND ter.status = 'Pending'
               AND ter.designation IN (${HR_ROLES.map((_, i) => `$${params.length + i + 1}`).join(",")})`;
    params.push(...HR_ROLES);
  } else if (role === "ceo_all") {
    // CEO "All Requests" tab: all HR-submitted requests regardless of status
    query += ` AND ter.designation IN (${HR_ROLES.map((_, i) => `$${params.length + i + 1}`).join(",")})`;
    params.push(...HR_ROLES);
  }

  query += " ORDER BY ter.created_at DESC";

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
};

// ── GET /api/travel-expenses/:id ─────────────────────────────────────────────
exports.getRequestById = async (req, res) => {
  const { id } = req.params;
  try {
    const reqResult = await pool.query(
      `SELECT ter.*, p.name AS project_name,
              COALESCE(ter.manual_expenses, '[]'::jsonb) AS manual_expenses
       FROM travel_expense_requests ter
       LEFT JOIN projects p ON p.id = ter.project_id
       WHERE ter.id = $1`,
      [id]
    );
    if (!reqResult.rows.length)
      return res.status(404).json({ message: "Not found" });

    const receipts = await pool.query(
      `SELECT * FROM travel_expense_receipts WHERE request_id = $1 ORDER BY uploaded_at`,
      [id]
    );

    res.json({ ...reqResult.rows[0], receipts: receipts.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch request" });
  }
};

// ── PUT /api/travel-expenses/:id/pm-status ────────────────────────────────────
// Project Manager approves / rejects (non-HR requests only)
exports.pmUpdateStatus = async (req, res) => {
  const { id } = req.params;
  const { pm_status, pm_reviewed_by, pm_review_note } = req.body;

  if (!["Approved", "Rejected"].includes(pm_status)) {
    return res.status(400).json({ message: "Invalid pm_status" });
  }

  try {
    const mainStatus = pm_status === "Rejected" ? "Rejected" : "Pending";

    const result = await pool.query(
      `UPDATE travel_expense_requests
       SET pm_status=$1, pm_reviewed_by=$2, pm_review_note=$3,
           pm_reviewed_at=NOW(), status=$4
       WHERE id=$5 RETURNING *`,
      [pm_status, pm_reviewed_by || null, pm_review_note || null, mainStatus, id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update PM status" });
  }
};

// ── GET /api/travel-expenses/:id/manual-expenses ─────────────────────────────
// Returns the manual_expenses JSONB array stored on the request row
exports.getManualExpenses = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT COALESCE(manual_expenses, '[]'::jsonb) AS manual_expenses
       FROM travel_expense_requests WHERE id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0].manual_expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch manual expenses" });
  }
};

// ── PUT /api/travel-expenses/:id/manual-expenses ─────────────────────────────
// HR / CEO saves all expense rows at once — stored as JSONB on the request row
exports.saveManualExpenses = async (req, res) => {
  const { id } = req.params;
  const { expenses } = req.body; // [{ category, type, description, amount }]

  if (!Array.isArray(expenses)) {
    return res.status(400).json({ message: "expenses array required" });
  }

  const valid = expenses.filter((e) => parseFloat(e.amount) > 0);

  try {
    const result = await pool.query(
      `UPDATE travel_expense_requests
       SET manual_expenses = $1::jsonb, updated_at = NOW()
       WHERE id = $2
       RETURNING manual_expenses`,
      [JSON.stringify(valid), id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    res.json(result.rows[0].manual_expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save manual expenses" });
  }
};

// ── PUT /api/travel-expenses/:id/status ───────────────────────────────────────
// HR approves/rejects regular (non-HR-submitted) requests after PM approval.
// CEO approves/rejects HR-submitted requests.
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reviewed_by, review_note, reviewer_role } = req.body;

  if (!["Approved", "Rejected", "Cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const check = await pool.query(
      `SELECT pm_status, designation FROM travel_expense_requests WHERE id=$1`,
      [id]
    );
    if (!check.rows.length) return res.status(404).json({ message: "Not found" });

    const row = check.rows[0];
    const submitterIsHR = isHRRole(row.designation);

    // Guard: HR-submitted requests must be reviewed by CEO only
    if (submitterIsHR && reviewer_role !== "ceo") {
      return res.status(403).json({
        message: "Only the CEO can approve or reject HR travel requests",
      });
    }

    // Guard: Regular requests must have PM approval before HR acts
    if (!submitterIsHR && row.pm_status !== "Approved") {
      return res.status(403).json({
        message: "Project Manager must approve first",
      });
    }

    const result = await pool.query(
      `UPDATE travel_expense_requests
       SET status=$1, reviewed_by=$2, review_note=$3, reviewed_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, reviewed_by || null, review_note || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
};