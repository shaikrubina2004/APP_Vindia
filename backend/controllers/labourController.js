// backend/controllers/labourController.js

const pool = require("../config/db");

/* =========================================================
   CREATE WORKER
========================================================= */

exports.createWorker = async (req, res) => {
  try {
    const body = req.body;

    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({
        error: "User not authenticated",
      });
    }

    if (
      !body.full_name ||
      !body.phone ||
      !body.trade ||
      !body.id_number
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    /* Duplicate ID check */
    const exists = await pool.query(
      `SELECT 1
       FROM workers
       WHERE id_number = $1
       AND is_deleted IS NOT TRUE`,
      [body.id_number]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({
        error: "Worker already exists",
      });
    }

    /* Files */
    const photo =
      req.files?.photo?.[0]?.filename || null;

    const id_doc =
      req.files?.id_doc?.[0]?.filename || null;

    const photo_url = photo
      ? `http://localhost:5000/uploads/${photo}`
      : null;

    const id_doc_url = id_doc
      ? `http://localhost:5000/uploads/${id_doc}`
      : null;

    const result = await pool.query(
      `INSERT INTO workers (
        full_name,
        phone,
        trade,
        contractor_name,
        contractor_phone,
        id_number,
        emergency_contact_name,
        emergency_contact_phone,
        date_of_birth,
        gender,
        blood_group,
        nationality,
        address,
        daily_wage,
        project_id,
        medical_conditions,
        allergies,
        photo_url,
        id_doc_url,
        created_by
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20
      )
      RETURNING *`,
      [
        body.full_name,
        body.phone,
        body.trade,
        body.contractor_name,
        body.contractor_phone || null,
        body.id_number,
        body.emergency_contact_name,
        body.emergency_contact_phone,
        body.date_of_birth || null,
        body.gender || null,
        body.blood_group || null,
        body.nationality || null,
        body.address || null,
        body.daily_wage || null,
        body.project_id || null,
        body.medical_conditions || null,
        body.allergies || null,
        photo_url,
        id_doc_url,
        createdBy,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE WORKER ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

/* =========================================================
   UPDATE WORKER
========================================================= */

exports.updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    /* Find existing worker */
    const existing = await pool.query(
      `SELECT *
       FROM workers
       WHERE id = $1
       AND is_deleted IS NOT TRUE`,
      [id]
    );

    if (!existing.rows.length) {
      return res.status(404).json({
        error: "Worker not found",
      });
    }

    const old = existing.rows[0];

    /* Files */
    const photo =
      req.files?.photo?.[0]?.filename;

    const id_doc =
      req.files?.id_doc?.[0]?.filename;

    const photo_url = photo
      ? `http://localhost:5000/uploads/${photo}`
      : old.photo_url;

    const id_doc_url = id_doc
      ? `http://localhost:5000/uploads/${id_doc}`
      : old.id_doc_url;

    /* Duplicate ID check */
    const duplicate = await pool.query(
      `SELECT 1
       FROM workers
       WHERE id_number = $1
       AND id != $2
       AND is_deleted IS NOT TRUE`,
      [body.id_number, id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(400).json({
        error: "ID already exists",
      });
    }

    const result = await pool.query(
      `UPDATE workers
       SET
        full_name = $1,
        phone = $2,
        trade = $3,
        contractor_name = $4,
        contractor_phone = $5,
        id_number = $6,
        emergency_contact_name = $7,
        emergency_contact_phone = $8,
        date_of_birth = $9,
        gender = $10,
        blood_group = $11,
        nationality = $12,
        address = $13,
        daily_wage = $14,
        project_id = $15,
        medical_conditions = $16,
        allergies = $17,
        photo_url = $18,
        id_doc_url = $19,
        updated_at = NOW()
       WHERE id = $20
       AND is_deleted IS NOT TRUE
       RETURNING *`,
      [
        body.full_name,
        body.phone,
        body.trade,
        body.contractor_name,
        body.contractor_phone || null,
        body.id_number,
        body.emergency_contact_name,
        body.emergency_contact_phone,
        body.date_of_birth || null,
        body.gender || null,
        body.blood_group || null,
        body.nationality || null,
        body.address || null,
        body.daily_wage || null,
        body.project_id || null,
        body.medical_conditions || null,
        body.allergies || null,
        photo_url,
        id_doc_url,
        id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Worker not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE WORKER ERROR:", err);

    return res.status(500).json({
      error: "Update failed",
    });
  }
};

/* =========================================================
   GET WORKERS
========================================================= */

exports.getWorkers = async (req, res) => {
  try {
    let projectId = null;

    /*
      Project Manager:
      only their assigned project.

      Site Engineer:
      optional project filter for now because the JWT
      does not currently contain project_id.
    */
    if (req.user?.role === "project_manager") {
      projectId = req.user.project_id || null;
    } else if (req.query.project_id) {
      projectId = req.query.project_id;
    }

    const result = await pool.query(
      `SELECT *
       FROM workers
       WHERE is_deleted IS NOT TRUE
       AND (
         $1::int IS NULL
         OR project_id = $1
       )
       ORDER BY created_at DESC`,
      [projectId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET WORKERS ERROR:", err);

    return res.status(500).json({
      error: "Fetch failed",
    });
  }
};

/* =========================================================
   UPDATE STATUS
========================================================= */

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "active",
      "inactive",
      "suspended",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid worker status",
      });
    }

    const result = await pool.query(
      `UPDATE workers
       SET
        status = $1,
        updated_at = NOW()
       WHERE id = $2
       AND is_deleted IS NOT TRUE
       RETURNING *`,
      [status, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Worker not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);

    return res.status(500).json({
      error: "Update failed",
    });
  }
};

/* =========================================================
   DELETE WORKER
========================================================= */

exports.deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE workers
       SET
        is_deleted = TRUE,
        updated_at = NOW()
       WHERE id = $1
       AND is_deleted IS NOT TRUE
       RETURNING id`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Worker not found",
      });
    }

    return res.json({
      success: true,
      message: "Worker removed successfully",
    });
  } catch (err) {
    console.error("DELETE WORKER ERROR:", err);

    return res.status(500).json({
      error: "Delete failed",
    });
  }
};