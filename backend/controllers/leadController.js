const pool = require("../config/db");
const XLSX = require("xlsx");
const path = require("path");
const fs   = require("fs");

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
      totalLeads:       parseInt(total.rows[0].count),
      todayLeads:       parseInt(todayNew.rows[0].count),
      converted:        parseInt(converted.rows[0].count),
      interested:       parseInt(interested.rows[0].count),
      todayFollowUps:   parseInt(todayFU.rows[0].count),
      pendingFollowUps: parseInt(pendingFU.rows[0].count),
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
    const { rows } = await pool.query(
      `INSERT INTO leads (
        name,phone,whatsapp,email,city,source,status,call_status,
        building_type,floors,measurement,sqft,budget,assigned_to,
        quotation_sent,project_start,snooze_until,description,
        date_and_time,search_category,area,designs_sent,deleted_by_admin
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,false
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
      ]
    );
    res.json({ success: true, leadId: rows[0].id });
  } catch (err) {
    console.error("Create lead error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create lead" });
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
    await pool.query(`UPDATE leads SET ${setClauses.join(", ")} WHERE id = $${n}`, values);
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
      "INSERT INTO followups (lead_id,note,status,next_followup) VALUES ($1,$2,$3,$4)",
      [leadId, note, status || null, nextFollowUp || null]
    );
    if (status) await pool.query("UPDATE leads SET status=$1 WHERE id=$2", [status, leadId]);
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

      await pool.query(
        `INSERT INTO leads (name,phone,whatsapp,email,city,source,status,call_status,
          building_type,floors,measurement,sqft,budget,assigned_to,
          quotation_sent,description,search_category,area,designs_sent,deleted_by_admin)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,false)
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
        ]
      );
      inserted++;
    }

    // clean up uploaded file
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
    /* ── XLSX ── */
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

        /* format date */
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

    /* ── PDF ── */
    else if (fileExt === ".pdf") {
      const pdfParse  = require("pdf-parse");
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
   TODAY / PENDING FOLLOW UPS
══════════════════════════════════════ */
exports.getTodaysFollowUps = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, l.name, l.phone FROM followups f
       JOIN leads l ON f.lead_id = l.id
       WHERE DATE(f.next_followup) = CURRENT_DATE`
    );
    res.json({ todayFollowUps: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getPendingFollowUps = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, l.name, l.phone FROM followups f
       JOIN leads l ON f.lead_id = l.id
       WHERE DATE(f.next_followup) < CURRENT_DATE`
    );
    res.json({ pendingFollowUps: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ── GET TODAY'S FOLLOW-UPS ── */
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
 
/* ── GET PENDING / OVERDUE FOLLOW-UPS ── */
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
