const pool = require("../config/db");
const XLSX = require("xlsx");
const path = require("path");
const fs   = require("fs");
const { notifyNewLead, notifyFollowUp } = require("./bdaNotificationsController");

/* ══════════════════════════════════════
   DASHBOARD SUMMARY
══════════════════════════════════════ */
exports.getDashboardSummary = async (req, res) => {
  try {
    const [total, todayNew, converted, interested, todayFU, pendingFU, todayConverted] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM leads WHERE deleted_by_admin = false"),
      pool.query("SELECT COUNT(*) FROM leads WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AND deleted_by_admin = false"),
      pool.query("SELECT COUNT(*) FROM leads WHERE LOWER(status) = 'converted' AND deleted_by_admin = false"),
      pool.query("SELECT COUNT(*) FROM leads WHERE LOWER(status) = 'interested' AND deleted_by_admin = false"),
      pool.query("SELECT COUNT(*) FROM followups WHERE DATE(next_followup) = CURRENT_DATE"),
      pool.query("SELECT COUNT(*) FROM followups WHERE DATE(next_followup) < CURRENT_DATE"),
      // ✅ NEW: count leads converted today using converted_at in IST
      pool.query(
        "SELECT COUNT(*) FROM leads WHERE converted_at IS NOT NULL AND DATE(converted_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AND deleted_by_admin = false"
      ),
    ]);

    res.json({
      totalLeads:       parseInt(total.rows[0].count),
      todayLeads:       parseInt(todayNew.rows[0].count),
      converted:        parseInt(converted.rows[0].count),
      interested:       parseInt(interested.rows[0].count),
      todayFollowUps:   parseInt(todayFU.rows[0].count),
      pendingFollowUps: parseInt(pendingFU.rows[0].count),
      todayConverted:   parseInt(todayConverted.rows[0].count), // ✅ NEW field
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
    let sql = "SELECT * FROM leads WHERE deleted_by_admin = false";
    if (role === "bda1" || role === "bda2") {
      sql += ` AND (assigned_to = '${email}' OR assigned_to IS NULL) AND status != 'JUNK_REQUESTED'`;
    }
    sql += " ORDER BY created_at DESC";
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
    const { rows } = await pool.query("SELECT * FROM leads WHERE id = $1", [req.params.id]);
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

  if (!name || !phone)
    return res.status(400).json({ success: false, message: "Name and phone are required" });

  try {
    // If lead is created with status "Converted" directly, set converted_at too
    const isConverted = (status || "").toLowerCase() === "converted";

    const { rows } = await pool.query(
      `INSERT INTO leads (
        name,phone,whatsapp,email,city,source,status,call_status,
        building_type,floors,measurement,sqft,budget,assigned_to,
        quotation_sent,project_start,snooze_until,description,
        date_and_time,search_category,area,designs_sent,
        converted_at,deleted_by_admin
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
        $23,false
      ) RETURNING id`,
      [
        name, phone, whatsapp || phone, email || null,
        city || null, source || "Manual", status || "New",
        call_status || null, building_type || null, floors || null,
        measurement || null, sqft || null, budget || null,
        assigned_to || null, quotation_sent || false,
        project_start || null, snooze_until || null,
        description || null, date_and_time || null,
        search_category || null, area || null,
        parseInt(designs_sent) || 0,
        isConverted ? new Date() : null, // ✅ set converted_at if created as converted
      ]
    );

    const newLeadId = rows[0].id;

    notifyNewLead({
      leadId: newLeadId,
      name,
      source: source || "Manual",
      phone,
    }).catch(err => console.error("Notify new lead error:", err.message));

    res.json({ success: true, leadId: newLeadId });
  } catch (err) {
    console.error("Create lead error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create lead" });
  }
};

/* ══════════════════════════════════════
   UPDATE LEAD
   ✅ Auto-sets converted_at when status
      changes to "Converted", clears it
      when status changes away.
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
  const values     = [];
  let n = 1;

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      setClauses.push(`${f} = $${n++}`);
      values.push(req.body[f]);
    }
  });

  // ✅ Handle converted_at automatically based on status change
  if (req.body.status !== undefined) {
    const isConverted = req.body.status.toLowerCase() === "converted";
    if (isConverted) {
      // Only set converted_at if not already set (first time converting)
      setClauses.push(`converted_at = COALESCE(converted_at, NOW())`);
    } else {
      // Status changed away from Converted — clear converted_at
      setClauses.push(`converted_at = NULL`);
    }
  }

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
   ADD FOLLOW UP
══════════════════════════════════════ */
exports.addFollowUp = async (req, res) => {
  const { leadId } = req.params;
  const { note, status, nextFollowUp } = req.body;
  if (!note) return res.status(400).json({ error: "Note required" });

  try {
    await pool.query(
      "INSERT INTO followups (lead_id, note, status, next_followup) VALUES ($1, $2, $3, $4)",
      [leadId, note, status || null, nextFollowUp || null]
    );

    const updateFields = [];
    const updateVals   = [];
    let n = 1;

    if (status) {
      updateFields.push(`status = $${n++}`);
      updateVals.push(status);

      // ✅ Also handle converted_at if status set via follow-up
      const isConverted = status.toLowerCase() === "converted";
      if (isConverted) {
        updateFields.push(`converted_at = COALESCE(converted_at, NOW())`);
      } else {
        updateFields.push(`converted_at = NULL`);
      }
    }

    updateFields.push(`snooze_until = $${n++}`);
    updateVals.push(nextFollowUp || null);

    if (updateFields.length) {
      updateVals.push(leadId);
      await pool.query(
        `UPDATE leads SET ${updateFields.join(", ")} WHERE id = $${n}`,
        updateVals
      );
    }

    if (nextFollowUp) {
      const { rows } = await pool.query(
        "SELECT name, phone, assigned_to FROM leads WHERE id = $1",
        [leadId]
      );
      if (rows.length) {
        const userRes = await pool.query(
          `SELECT email FROM users
           WHERE REGEXP_REPLACE(LOWER(TRIM(name)), '\\s+', ' ', 'g') =
                 REGEXP_REPLACE(LOWER(TRIM($1)), '\\s+', ' ', 'g')
           LIMIT 1`,
          [rows[0].assigned_to]
        );
        const assignedEmail = userRes.rows[0]?.email || null;

        notifyFollowUp({
          leadId,
          name:        rows[0].name,
          phone:       rows[0].phone,
          nextFollowUp,
          assignedTo:  assignedEmail,
        }).catch(err => console.error("Notify followup error:", err.message));
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Add followup error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   GET FOLLOW UPS
══════════════════════════════════════ */
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
   IMPORT EXCEL (generic)
══════════════════════════════════════ */
exports.importLeadsFromExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) return res.status(400).json({ error: "Excel file is empty" });

    let inserted = 0;
    for (const r of rows) {
      const keys = Object.keys(r).reduce((acc, k) => { acc[k.toLowerCase().trim()] = r[k]; return acc; }, {});
      const name  = keys["name"];
      const phone = String(keys["phone"] || "").trim();
      if (!name || !phone) continue;

      const isConverted = (keys["status"] || "").toLowerCase() === "converted";

      await pool.query(
        `INSERT INTO leads (name,phone,whatsapp,email,city,source,status,call_status,
          building_type,floors,measurement,sqft,budget,assigned_to,
          quotation_sent,description,search_category,area,designs_sent,
          converted_at,deleted_by_admin)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,false)
         ON CONFLICT DO NOTHING`,
        [
          String(name).trim(), phone, phone,
          keys["email"] || null, keys["city"] || null,
          keys["source"] || "Excel", keys["status"] || "New",
          keys["call_status"] || null, keys["building_type"] || null,
          keys["floors"] || null, keys["measurement"] || null,
          keys["sqft"] || null, keys["budget"] || null,
          keys["assigned_to"] || null,
          keys["quotation_sent"] || false,
          keys["description"] || null,
          keys["search_category"] || null,
          keys["area"] || null,
          parseInt(keys["designs_sent"]) || 0,
          isConverted ? new Date() : null, // ✅
        ]
      );
      inserted++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, affectedRows: inserted });
  } catch (err) {
    console.error("Excel import error:", err.message);
    res.status(500).json({ error: "Import failed: " + err.message });
  }
};

/* ══════════════════════════════════════
   IMPORT JUSTDIAL (xlsx or pdf)
══════════════════════════════════════ */
exports.importJustDialPDF = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const fileExt = path.extname(req.file.originalname).toLowerCase();

  try {
    if (fileExt === ".xlsx" || fileExt === ".xls") {
      const workbook = XLSX.readFile(req.file.path);
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      const rows     = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) return res.status(400).json({ message: "Empty file" });

      let inserted = 0;
      for (const r of rows) {
        const keys = Object.keys(r).reduce((acc, k) => { acc[k.toLowerCase().trim()] = r[k]; return acc; }, {});

        const name  = keys["customer name"] || keys["user name"] || keys["name"];
        const phone = String(keys["user number"] || keys["mobile no"] || keys["mobile"] || keys["phone"] || "").trim();
        if (!name || !phone) continue;

        let formattedDate = null;
        const rawDate = keys["date and time"] || keys["date & time"] || keys["date_and_time"];
        if (rawDate) {
          const cleaned = String(rawDate).replace(",", "").trim();
          const [datePart, timePart] = cleaned.split(" ");
          if (datePart && timePart) {
            const [day, month, year] = datePart.split("/");
            if (day && month && year) formattedDate = `${year}-${month}-${day} ${timePart}:00`;
          }
        }

        await pool.query(
          `INSERT INTO leads (name,phone,whatsapp,email,city,source,status,
            date_and_time,search_category,area,deleted_by_admin)
           VALUES ($1,$2,$3,$4,$5,'JustDial','New',$6,$7,$8,false)
           ON CONFLICT DO NOTHING`,
          [
            String(name).trim(), phone, phone,
            keys["user email"] || keys["email"] || null,
            keys["city"] || null,
            formattedDate,
            keys["search category"] || null,
            keys["area"] || null,
          ]
        );
        inserted++;
      }

      fs.unlinkSync(req.file.path);
      return res.json({ success: true, affectedRows: inserted });
    }

    else if (fileExt === ".pdf") {
      const pdfParse   = require("pdf-parse");
      const dataBuffer = fs.readFileSync(req.file.path);
      const data       = await pdfParse(dataBuffer);
      const lines      = data.text.split("\n").filter(l => l.trim());

      let inserted = 0;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (!parts[0] || !parts[1]) continue;
        await pool.query(
          `INSERT INTO leads (name,phone,whatsapp,source,status,deleted_by_admin)
           VALUES ($1,$2,$3,'JustDial','New',false) ON CONFLICT DO NOTHING`,
          [parts[0], parts[1], parts[1]]
        );
        inserted++;
      }

      fs.unlinkSync(req.file.path);
      return res.json({ success: true, affectedRows: inserted });
    }

    res.status(400).json({ message: "Unsupported file type" });
  } catch (err) {
    console.error("JustDial import error:", err.message);
    res.status(500).json({ error: "Import failed: " + err.message });
  }
};

/* ══════════════════════════════════════
   EXPORT TO EXCEL
══════════════════════════════════════ */
exports.exportLeadsToExcel = async (req, res) => {
  try {
    const { status, assigned_to } = req.query;
    let sql = "SELECT * FROM leads WHERE deleted_by_admin = false";
    const vals = [];
    if (status)      { sql += ` AND status = $${vals.length+1}`;      vals.push(status); }
    if (assigned_to) { sql += ` AND assigned_to = $${vals.length+1}`; vals.push(assigned_to); }

    const { rows } = await pool.query(sql, vals);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");

    const filePath = path.join(__dirname, "../leads_export.xlsx");
    XLSX.writeFile(wb, filePath);
    res.download(filePath, "leads.xlsx", () => {
      try { fs.unlinkSync(filePath); } catch(_) {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   JUNK / DELETE / REASSIGN
══════════════════════════════════════ */
exports.requestJunk = async (req, res) => {
  try {
    await pool.query(
      "UPDATE leads SET status='JUNK_REQUESTED', junk_requested_at=NOW() WHERE id=$1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.reassignLead = async (req, res) => {
  try {
    await pool.query(
      "UPDATE leads SET assigned_to=$1, status='New', junk_requested_at=NULL WHERE id=$2",
      [req.body.assigned_to, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.permanentDeleteLead = async (req, res) => {
  try {
    await pool.query("UPDATE leads SET deleted_by_admin=true WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ══════════════════════════════════════
   TODAY'S FOLLOW-UPS
══════════════════════════════════════ */
exports.getTodaysFollowUps = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, l.name, l.phone, l.city, l.status, l.source, l.assigned_to
       FROM followups f
       JOIN leads l ON f.lead_id = l.id
       WHERE DATE(f.next_followup) = CURRENT_DATE
         AND l.deleted_by_admin = false
       ORDER BY f.created_at DESC`
    );
    res.json({ todayFollowUps: rows });
  } catch (err) {
    console.error("Today followups error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   PENDING / OVERDUE FOLLOW-UPS
══════════════════════════════════════ */
exports.getPendingFollowUps = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, l.name, l.phone, l.city, l.status, l.source, l.assigned_to
       FROM followups f
       JOIN leads l ON f.lead_id = l.id
       WHERE DATE(f.next_followup) < CURRENT_DATE
         AND l.deleted_by_admin = false
       ORDER BY f.next_followup ASC`
    );
    res.json({ pendingFollowUps: rows });
  } catch (err) {
    console.error("Pending followups error:", err.message);
    res.status(500).json({ error: err.message });
  }
};