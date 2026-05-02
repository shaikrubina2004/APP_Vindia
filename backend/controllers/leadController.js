const pool = require("../config/db");

/* ══════════════════════════════════════
   DASHBOARD SUMMARY
══════════════════════════════════════ */
exports.getDashboardSummary = async (req, res) => {
  try {
    const [total, todayNew, converted, interested, todayFU, pendingFU] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM leads WHERE deleted_by_admin = false"),
      pool.query("SELECT COUNT(*) FROM leads WHERE DATE(created_at) = CURRENT_DATE AND deleted_by_admin = false"),
      pool.query("SELECT COUNT(*) FROM leads WHERE LOWER(status) = 'converted' AND deleted_by_admin = false"),
      pool.query("SELECT COUNT(*) FROM leads WHERE LOWER(status) = 'interested' AND deleted_by_admin = false"),
      pool.query("SELECT COUNT(*) FROM followups WHERE DATE(next_followup) = CURRENT_DATE"),
      pool.query("SELECT COUNT(*) FROM followups WHERE DATE(next_followup) < CURRENT_DATE"),
    ]);

    res.json({
      totalLeads:      parseInt(total.rows[0].count),
      todayLeads:      parseInt(todayNew.rows[0].count),
      converted:       parseInt(converted.rows[0].count),
      interested:      parseInt(interested.rows[0].count),
      todayFollowUps:  parseInt(todayFU.rows[0].count),
      pendingFollowUps:parseInt(pendingFU.rows[0].count),
    });
  } catch (err) {
    console.error("Dashboard summary error:", err.message);
    res.status(500).json({ error: "Failed to load summary" });
  }
};

/* ══════════════════════════════════════
   GET ALL LEADS
══════════════════════════════════════ */
exports.getAllLeads = async (req, res) => {
  try {
    const { role, email } = req.query;

    let sql = `SELECT * FROM leads WHERE deleted_by_admin = false`;

    if (role === "bda1" || role === "bda2") {
      sql += ` AND (assigned_to = '${email}' OR assigned_to IS NULL)
               AND status != 'JUNK_REQUESTED'`;
    }

    sql += ` ORDER BY created_at DESC`;

    const { rows } = await pool.query(sql);
    res.json({ leads: rows });
  } catch (err) {
    console.error("Get leads error:", err.message);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
};

/* ══════════════════════════════════════
   GET LEAD BY ID
══════════════════════════════════════ */
exports.getLeadById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM leads WHERE id = $1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Lead not found" });
    res.json({ lead: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   CREATE LEAD
══════════════════════════════════════ */
exports.createLead = async (req, res) => {
  const {
    name, phone, whatsapp, email, city, source, status,
    call_status, building_type, floors, measurement, sqft,
    budget, assigned_to, quotation_sent, project_start,
    snooze_until, description, date_and_time, search_category,
    area, designs_sent,
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO leads (
        name, phone, whatsapp, email, city, source, status,
        call_status, building_type, floors, measurement, sqft,
        budget, assigned_to, quotation_sent, project_start,
        snooze_until, description, date_and_time, search_category,
        area, designs_sent, deleted_by_admin
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,false
      ) RETURNING id`,
      [
        name, phone, whatsapp || phone, email || null,
        city || null, source || "manual", status || "New",
        call_status || null, building_type || null, floors || null,
        measurement || null, sqft || null, budget || null,
        assigned_to || null, quotation_sent || null,
        project_start || null, snooze_until || null,
        description || null, date_and_time || null,
        search_category || null, area || null, designs_sent || 0,
      ]
    );
    res.json({ success: true, leadId: rows[0].id });
  } catch (err) {
    console.error("Create lead error:", err.message);
    res.status(500).json({ error: "Failed to create lead" });
  }
};

/* ══════════════════════════════════════
   UPDATE LEAD
══════════════════════════════════════ */
exports.updateLead = async (req, res) => {
  const { id } = req.params;
  const fields = [
    "email","city","source","status","call_status","building_type",
    "floors","measurement","sqft","budget","assigned_to",
    "quotation_sent","project_start","snooze_until","description",
    "date_and_time","search_category","area","designs_sent",
  ];

  const setClauses = [];
  const values = [];
  let n = 1;

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      setClauses.push(`${f} = $${n++}`);
      values.push(req.body[f]);
    }
  });

  if (!setClauses.length) return res.status(400).json({ error: "No fields to update" });
  values.push(id);

  try {
    await pool.query(
      `UPDATE leads SET ${setClauses.join(", ")} WHERE id = $${n}`,
      values
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Update lead error:", err.message);
    res.status(500).json({ error: "Update failed" });
  }
};

/* ══════════════════════════════════════
   FOLLOW UPS
══════════════════════════════════════ */
exports.addFollowUp = async (req, res) => {
  const { leadId } = req.params;
  const { note, status, nextFollowUp } = req.body;

  if (!note) return res.status(400).json({ error: "Note required" });

  try {
    await pool.query(
      `INSERT INTO followups (lead_id, note, status, next_followup) VALUES ($1,$2,$3,$4)`,
      [leadId, note, status || null, nextFollowUp || null]
    );

    if (status) {
      await pool.query("UPDATE leads SET status=$1 WHERE id=$2", [status, leadId]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Add followup error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getFollowUps = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM followups WHERE lead_id=$1 ORDER BY created_at DESC",
      [req.params.leadId]
    );
    res.json({ followUps: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   JUNK / DELETE
══════════════════════════════════════ */
exports.requestJunk = async (req, res) => {
  try {
    await pool.query(
      `UPDATE leads SET status='JUNK_REQUESTED', junk_requested_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.permanentDeleteLead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE leads SET deleted_by_admin=true WHERE id=$1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};