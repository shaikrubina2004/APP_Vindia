// backend/controllers/travelExpenseController.js
const pool = require("../config/db");

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    destination,
    travel_from_date,
    travel_to_date,
    purpose,
    notes,
    budget_type,
    project_id,
    payment_mode,
    travel_amount,
    food_amount,
    accommodation_amount,
    other_amount,
    receipts, // array: [{ expense_type, file_name, file_url, file_size_kb }]
  } = req.body;

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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const request_no = await generateRequestNo();

    const insertResult = await client.query(
      `INSERT INTO travel_expense_requests (
        request_no, user_id, employee_name, designation, department,
        trip_title, destination, travel_from_date, travel_to_date,
        purpose, notes, budget_type, project_id, payment_mode,
        travel_amount, food_amount, accommodation_amount, other_amount
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      ) RETURNING *`,
      [
        request_no,
        user_id,
        employee_name,
        designation,
        department,
        trip_title,
        destination,
        travel_from_date,
        travel_to_date,
        purpose,
        notes || null,
        budget_type,
        project_id || null,
        payment_mode,
        travel_amount || 0,
        food_amount || 0,
        accommodation_amount || 0,
        other_amount || 0,
      ]
    );

    const newRequest = insertResult.rows[0];

    // Insert receipts if any
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
    res.status(201).json(newRequest);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createRequest error:", err);
    res.status(500).json({ error: "Failed to submit travel expense request" });
  } finally {
    client.release();
  }
};

// ── GET /api/travel-expenses ──────────────────────────────────────────────────
// HR: all requests. Employee: own requests via ?user_id=
exports.getRequests = async (req, res) => {
  const { user_id, status } = req.query;

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
      `SELECT ter.*, p.name AS project_name
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

// ── PUT /api/travel-expenses/:id/status ──────────────────────────────────────
// HR approves / rejects
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reviewed_by, review_note } = req.body;

  if (!["Approved", "Rejected", "Cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const result = await pool.query(
      `UPDATE travel_expense_requests
       SET status=$1, reviewed_by=$2, review_note=$3, reviewed_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, reviewed_by || null, review_note || null, id]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
};