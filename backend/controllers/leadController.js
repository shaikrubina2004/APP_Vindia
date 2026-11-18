const pool = require("../config/db");
const XLSX = require("xlsx");
const path = require("path");
const fs   = require("fs");
const {
  notifyNewLead, notifyFollowUp, notifyImport,
  notifyLeadAssigned, clearPoolAlerts, notifyMany,
} = require("./bdaNotificationsController");
const {
  ESCALATION_HOURS, UNASSIGNED_SQL, ASSIGNED_TO_ME_SQL, CLOSED_STATUSES,
  getBdaUsers, getCeoUsers, getUserById, findBdaByEmail, findBdaByName,
} = require("../utils/leadAssignment");

/* SQL fragment: the lead is NOT waiting for the CEO to approve a delete.
   Also covers the old name JUNK_REQUESTED, and a lead with no status at all. */
const NOT_DELETE_REQUESTED = (alias = "") => {
  const c = alias ? `${alias}.status` : "status";
  return `UPPER(COALESCE(${c}, '')) NOT IN ('DELETE_REQUESTED', 'JUNK_REQUESTED')`;
};

/* ══════════════════════════════════════
   DASHBOARD SUMMARY
══════════════════════════════════════ */
exports.getDashboardSummary = async (req, res) => {
  try {
    const { role, name, email } = req.query;
    const isBda = role === "bda";

    // Leads: a BDA sees their own leads + the unassigned pool
    const leadFilter = isBda
      ? `AND (${ASSIGNED_TO_ME_SQL("$1", "$2")} OR ${UNASSIGNED_SQL()}) AND ${NOT_DELETE_REQUESTED()}`
      : "";
    const leadVals = isBda ? [name || "", email || ""] : [];

    const [total, todayNew, converted, interested, todayConverted] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM leads WHERE deleted_by_admin = false ${leadFilter}`,
        leadVals
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads
         WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
           AND deleted_by_admin = false ${leadFilter}`,
        leadVals
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads
         WHERE LOWER(status) = 'converted' AND deleted_by_admin = false ${leadFilter}`,
        leadVals
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads
         WHERE LOWER(status) = 'interested' AND deleted_by_admin = false ${leadFilter}`,
        leadVals
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads
         WHERE converted_at IS NOT NULL
           AND DATE(converted_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
           AND deleted_by_admin = false ${leadFilter}`,
        leadVals
      ),
    ]);

    // Follow-ups: ONLY leads assigned to this BDA (unassigned pool excluded)
    const fuFilter = isBda
      ? `AND ${ASSIGNED_TO_ME_SQL("$1", "$2", "l")}`
      : `AND NOT ${UNASSIGNED_SQL("l")}`;

    const [todayFU, pendingFU] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM followups f
         JOIN leads l ON f.lead_id = l.id
         WHERE DATE(f.next_followup) = CURRENT_DATE
           AND l.deleted_by_admin = false ${fuFilter}`,
        leadVals
      ),
      pool.query(
        `SELECT COUNT(*) FROM followups f
         JOIN leads l ON f.lead_id = l.id
         WHERE DATE(f.next_followup) < CURRENT_DATE
           AND l.deleted_by_admin = false ${fuFilter}`,
        leadVals
      ),
    ]);

    res.json({
      totalLeads:       parseInt(total.rows[0].count),
      todayLeads:       parseInt(todayNew.rows[0].count),
      converted:        parseInt(converted.rows[0].count),
      interested:       parseInt(interested.rows[0].count),
      todayFollowUps:   parseInt(todayFU.rows[0].count),
      pendingFollowUps: parseInt(pendingFU.rows[0].count),
      todayConverted:   parseInt(todayConverted.rows[0].count),
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
    const { role, name, email, assigned_only } = req.query;
    const assignedOnly = assigned_only === "1" || assigned_only === "true";

    let sql = `SELECT l.*,
                 (SELECT COUNT(*) FROM followups f WHERE f.lead_id = l.id)::int AS followup_count
               FROM leads l
               WHERE l.deleted_by_admin = false`;
    const vals = [];

    if (role === "bda") {
      vals.push(name || "", email || "");
      const me = ASSIGNED_TO_ME_SQL(`$${vals.length - 1}`, `$${vals.length}`, "l");
      sql += assignedOnly
        // Follow-up page: only the leads that are mine
        ? ` AND ${me} AND ${NOT_DELETE_REQUESTED("l")}`
        // Leads page: mine + the unassigned pool (so I can pick things up)
        : ` AND (${me} OR ${UNASSIGNED_SQL("l")}) AND ${NOT_DELETE_REQUESTED("l")}`;
    } else if (assignedOnly) {
      // CEO on the follow-up page: every lead that has an owner
      sql += ` AND NOT ${UNASSIGNED_SQL("l")}`;
    }

    sql += " ORDER BY l.created_at DESC";
    const { rows } = await pool.query(sql, vals);
    res.json({ leads: rows, escalationHours: ESCALATION_HOURS });
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

    // Only a real BDA can own a lead. Anything else (CEO name, typo, blank)
    // drops the lead into the unassigned pool and notifies every BDA.
    const owner = assigned_to ? await findBdaByName(assigned_to) : null;

    const { rows } = await pool.query(
      `INSERT INTO leads (
        name,phone,whatsapp,email,city,source,status,call_status,
        building_type,floors,measurement,sqft,budget,assigned_to,
        quotation_sent,project_start,snooze_until,description,
        date_and_time,search_category,area,designs_sent,
        converted_at,deleted_by_admin,
        assigned_email,assigned_by,assigned_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
        $23,false,
        $24,$25,$26
      ) RETURNING id`,
      [
        name, phone, whatsapp || phone, email || null,
        city || null, source || "Manual", status || "New",
        call_status || null, building_type || null, floors || null,
        measurement || null, sqft || null, budget || null,
        owner ? owner.name : null, quotation_sent || false,
        project_start || null, snooze_until || null,
        description || null, date_and_time || null,
        search_category || null, area || null,
        parseInt(designs_sent) || 0,
        isConverted ? new Date() : null, // set converted_at if created as converted
        owner ? owner.email : null,
        owner ? owner.name  : null,       // created & owned by the same person
        owner ? new Date()  : null,
      ]
    );

    const newLeadId = rows[0].id;

    // Unassigned → alert every BDA + CEO (pool). Already owned → no broadcast.
    if (!owner) {
      notifyNewLead({
        leadId: newLeadId,
        name,
        source: source || "Manual",
        phone,
      }).catch(err => console.error("Notify new lead error:", err.message));
    }

    res.json({ success: true, leadId: newLeadId });
  } catch (err) {
    console.error("Create lead error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create lead" });
  }
};

/* ══════════════════════════════════════
   UPDATE LEAD
   • converted_at follows the status
   • Photo set / Design set (1-10): each number can be sent only once
   • Descriptions are append-only
   • Next call date (snooze_until), preferred call slot / time
══════════════════════════════════════ */
exports.updateLead = async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  const fields = [
    "email","city","source","status","call_status","building_type",
    "floors","measurement","sqft","budget",
    "quotation_sent","project_start",
    "date_and_time","search_category","area","designs_sent",
  ];

  const setClauses = [];
  const values     = [];
  let n = 1;

  fields.forEach(f => {
    if (body[f] !== undefined) {
      setClauses.push(`${f} = $${n++}`);
      values.push(body[f]);
    }
  });

  // name / phone: only when a non-empty value is sent
  ["name", "phone"].forEach(f => {
    const v = typeof body[f] === "string" ? body[f].trim() : "";
    if (v) { setClauses.push(`${f} = $${n++}`); values.push(v); }
  });

  // Lead type: Hot / Warm / Cold (empty clears it)
  if (body.lead_type !== undefined) {
    const v = String(body.lead_type || "").trim();
    if (v && !["Hot", "Warm", "Cold"].includes(v))
      return res.status(400).json({ error: "Lead type must be Hot, Warm or Cold" });
    setClauses.push(`lead_type = $${n++}`);
    values.push(v || null);
  }

  // Preferred call type (free text from a dropdown; empty clears it)
  if (body.preferred_call_type !== undefined) {
    setClauses.push(`preferred_call_type = $${n++}`);
    values.push(String(body.preferred_call_type || "").trim() || null);
  }

  // Next call date (= the follow-up date). Saving it is what puts the lead on
  // the Follow Up page (Today / Overdue / Upcoming). Empty clears it.
  if (body.snooze_until !== undefined) {
    setClauses.push(`snooze_until = $${n++}`);
    values.push(body.snooze_until ? body.snooze_until : null);
  }

  // Preferred call time slot, e.g. "9 AM – 11 AM" (label only)
  if (body.preferred_call_slot !== undefined) {
    setClauses.push(`preferred_call_slot = $${n++}`);
    values.push(String(body.preferred_call_slot || "").trim() || null);
  }

  // Preferred call time — the moment the popup fires (next call date + slot start).
  // Changing it re-arms the popup reminder.
  if (body.preferred_call_time !== undefined) {
    let when = null;
    if (body.preferred_call_time) {
      const d = new Date(body.preferred_call_time);
      if (isNaN(d.getTime()))
        return res.status(400).json({ error: "Preferred call time is not a valid date" });
      when = d.toISOString();
    }
    setClauses.push(`preferred_call_time = $${n++}`);
    values.push(when);
    setClauses.push(`preferred_call_ack = NULL`);
  }

  // converted_at follows the status
  if (body.status !== undefined) {
    const isConverted = String(body.status || "").toLowerCase() === "converted";
    setClauses.push(isConverted
      ? `converted_at = COALESCE(converted_at, NOW())`
      : `converted_at = NULL`);
  }

  // ── Photo set + Design set (each number can be sent only once) ──
  const SET_DEFS = [
    { key: "photo_set",  column: "photo_sets_sent",  label: "Photo Set"  },
    { key: "design_set", column: "design_sets_sent", label: "Design Set" },
  ];
  const sending = [];
  for (const def of SET_DEFS) {
    const raw = body[def.key];
    if (raw === undefined || raw === null || raw === "") continue;
    const num = parseInt(raw, 10);
    if (!Number.isInteger(num) || num < 1 || num > 10)
      return res.status(400).json({ error: `${def.label} must be a number from 1 to 10` });
    setClauses.push(`${def.column} = array_append(COALESCE(${def.column}, '{}'), $${n++}::int)`);
    values.push(num);
    sending.push({ ...def, num });
  }

  // ── New descriptions (append-only) ──
  const fresh = (Array.isArray(body.new_descriptions) ? body.new_descriptions : [])
    .map(t => String(t || "").trim().slice(0, 2000))
    .filter(Boolean);
  if (fresh.length) {
    const by = String(body.edited_by || "").trim() || null;
    const at = new Date().toISOString();
    setClauses.push(`description_notes = COALESCE(description_notes, '[]'::jsonb) || $${n++}::jsonb`);
    values.push(JSON.stringify(fresh.map(text => ({ text, by, at }))));
  }

  if (!setClauses.length) return res.status(400).json({ error: "No fields to update" });

  let where = `id = $${n++}`;
  values.push(id);
  for (const s of sending) {
    where += ` AND NOT ($${n++}::int = ANY(COALESCE(${s.column}, '{}')))`;
    values.push(s.num);
  }

  try {
    const result = await pool.query(
      `UPDATE leads SET ${setClauses.join(", ")} WHERE ${where}`,
      values
    );

    if (result.rowCount === 0) {
      const cur = await pool.query(
        "SELECT photo_sets_sent, design_sets_sent FROM leads WHERE id = $1", [id]);
      if (!cur.rows.length) return res.status(404).json({ error: "Lead not found" });

      const clash = sending.find(s => (cur.rows[0][s.column] || []).includes(s.num));
      return res.status(409).json({
        error: clash
          ? `${clash.label} ${clash.num} was already sent to this customer. Pick a different one.`
          : "Update failed",
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Update lead error:", err.message);
    // while developing, show the real reason in the red box; never in production
    const detail = process.env.NODE_ENV === "production" ? "" : `: ${err.message}`;
    res.status(500).json({ error: "Update failed" + detail });
  }
};

/* ══════════════════════════════════════
   ADD FOLLOW UP
   Notification is only ever sent to the
   lead's actually-assigned BDA. If the
   lead has no assigned_to, or the name
   doesn't match any user, no notification
   is sent — it no longer silently falls
   back to broadcasting to every BDA.
══════════════════════════════════════ */
exports.addFollowUp = async (req, res) => {
  const { leadId } = req.params;
  const { note, status, nextFollowUp, bda_email } = req.body;
  if (!note) return res.status(400).json({ error: "Note required" });
  const doneBy = bda_email ? String(bda_email).trim().toLowerCase() : null;

  try {
    const own = await pool.query(
      `SELECT ${UNASSIGNED_SQL()} AS unassigned FROM leads WHERE id = $1`,
      [leadId]
    );
    if (!own.rows.length) return res.status(404).json({ error: "Lead not found" });
    if (own.rows[0].unassigned)
      return res.status(409).json({ error: "Assign this lead to a BDA before adding a follow-up" });

    // done_by = the BDA who saved this follow-up (used by the Daily Update numbers).
    // If the column hasn't been added yet (error 42703) fall back to the old insert.
    try {
      await pool.query(
        "INSERT INTO followups (lead_id, note, status, next_followup, done_by) VALUES ($1, $2, $3, $4, $5)",
        [leadId, note, status || null, nextFollowUp || null, doneBy]
      );
    } catch (e) {
      if (e.code !== "42703") throw e;
      await pool.query(
        "INSERT INTO followups (lead_id, note, status, next_followup) VALUES ($1, $2, $3, $4)",
        [leadId, note, status || null, nextFollowUp || null]
      );
    }

    const updateFields = [];
    const updateVals   = [];
    let n = 1;

    if (status) {
      updateFields.push(`status = $${n++}`);
      updateVals.push(status);

      // Also handle converted_at if status set via follow-up
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
        "SELECT name, phone, assigned_to, assigned_email FROM leads WHERE id = $1",
        [leadId]
      );

      // Only attempt to notify if the lead actually has someone assigned
      if (rows.length && rows[0].assigned_to) {
        const userRes = rows[0].assigned_email ? { rows: [{ email: rows[0].assigned_email }] } : await pool.query(
          `SELECT email FROM users
           WHERE REGEXP_REPLACE(LOWER(TRIM(name)), '\\s+', ' ', 'g') =
                 REGEXP_REPLACE(LOWER(TRIM($1)), '\\s+', ' ', 'g')
           LIMIT 1`,
          [rows[0].assigned_to]
        );
        const assignedEmail = userRes.rows[0]?.email || null;

        // Only send if we found a real matching user — never fall back to broadcast
        if (assignedEmail) {
          notifyFollowUp({
            leadId,
            name:        rows[0].name,
            phone:       rows[0].phone,
            nextFollowUp,
            assignedTo:  assignedEmail,
          }).catch(err => console.error("Notify followup error:", err.message));
        } else {
          console.warn(`No matching user found for assigned_to="${rows[0].assigned_to}" on lead ${leadId} — follow-up notification skipped`);
        }
      }
      // If the lead has no assigned_to at all, we intentionally skip notifying anyone.
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

    const bdaList = await getBdaUsers();
    const normName = (x) => String(x || "").trim().replace(/\s+/g, " ").toLowerCase();

    let inserted = 0;
    for (const r of rows) {
      const keys = Object.keys(r).reduce((acc, k) => { acc[k.toLowerCase().trim()] = r[k]; return acc; }, {});
      const name  = keys["name"];
      const phone = String(keys["phone"] || "").trim();
      if (!name || !phone) continue;

      const isConverted = String(keys["status"] || "").toLowerCase() === "converted";
      const owner = keys["assigned_to"]
        ? bdaList.find(u => normName(u.name) === normName(keys["assigned_to"])) || null
        : null;

      await pool.query(
        `INSERT INTO leads (name,phone,whatsapp,email,city,source,status,call_status,
          building_type,floors,measurement,sqft,budget,assigned_to,
          quotation_sent,description,search_category,area,designs_sent,
          converted_at,deleted_by_admin,assigned_email,assigned_by,assigned_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,false,$21,$22,$23)
         ON CONFLICT DO NOTHING`,
        [
          String(name).trim(), phone, phone,
          keys["email"] || null, keys["city"] || null,
          keys["source"] || "Excel", keys["status"] || "New",
          keys["call_status"] || null, keys["building_type"] || null,
          keys["floors"] || null, keys["measurement"] || null,
          keys["sqft"] || null, keys["budget"] || null,
          owner ? owner.name : null,
          keys["quotation_sent"] || false,
          keys["description"] || null,
          keys["search_category"] || null,
          keys["area"] || null,
          parseInt(keys["designs_sent"]) || 0,
          isConverted ? new Date() : null,
          owner ? owner.email : null,
          owner ? "Import"    : null,
          owner ? new Date()  : null,
        ]
      );
      inserted++;
    }

    fs.unlinkSync(req.file.path);
    notifyImport({ count: inserted, source: "Excel" })
      .catch(err => console.error("Notify import error:", err.message));
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
      notifyImport({ count: inserted, source: "JustDial" })
        .catch(err => console.error("Notify import error:", err.message));
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
      notifyImport({ count: inserted, source: "JustDial" })
        .catch(err => console.error("Notify import error:", err.message));
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
   DELETE REQUESTS  (BDA asks -> CEO approves or rejects)
   request-junk      BDA: status = DELETE_REQUESTED, CEO notified
   permanent-delete  CEO: approve — the lead is deleted
   reject-delete     CEO: refuse — the lead returns to the BDA
══════════════════════════════════════ */
exports.requestJunk = async (req, res) => {
  try {
    const by = String((req.body && req.body.requested_by) || "").trim() || null;

    const { rows } = await pool.query(
      `UPDATE leads
          SET status_before_delete = CASE
                WHEN UPPER(COALESCE(status, '')) IN ('DELETE_REQUESTED', 'JUNK_REQUESTED')
                  THEN status_before_delete
                ELSE status END,
              status              = 'DELETE_REQUESTED',
              junk_requested_at   = NOW(),
              delete_requested_by = $2
        WHERE id = $1 AND deleted_by_admin = false
    RETURNING id, name, phone`,
      [req.params.id, by]
    );
    if (!rows.length) return res.status(404).json({ error: "Lead not found" });

    // Tell the CEO(s) there is something to approve
    const lead = rows[0];
    getCeoUsers()
      .then(ceos => notifyMany(ceos.map(u => u.email), {
        type:        "delete_requested",
        title:       `Delete request: ${lead.name}`,
        description: `${by || "A BDA"} asked to delete ${lead.name} (${lead.phone || "No phone"}). Open Leads to approve or reject.`,
        severity:    "warn",
        lead_id:     lead.id,
      }))
      .catch(e => console.error("Notify delete request error:", e.message));

    res.json({ success: true });
  } catch (err) {
    console.error("Request delete error:", err.message);
    res.status(500).json({ error: "Failed to send the delete request" });
  }
};

/* CEO rejected the request: the lead returns to the BDA with its old status */
exports.rejectDelete = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE leads
          SET status               = COALESCE(NULLIF(status_before_delete, ''), 'New'),
              status_before_delete = NULL,
              junk_requested_at    = NULL,
              delete_requested_by  = NULL
        WHERE id = $1
          AND UPPER(COALESCE(status, '')) IN ('DELETE_REQUESTED', 'JUNK_REQUESTED')
    RETURNING id`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(409).json({ error: "This lead has no pending delete request" });
    res.json({ success: true });
  } catch (err) {
    console.error("Reject delete error:", err.message);
    res.status(500).json({ error: "Failed to reject the request" });
  }
};

exports.reassignLead = async (req, res) => {
  try {
    const owner = req.body.assigned_to ? await findBdaByName(req.body.assigned_to) : null;
    await pool.query(
      `UPDATE leads
          SET assigned_to=$1, assigned_email=$2, assigned_by='Admin',
              assigned_at=CASE WHEN $1::text IS NULL THEN NULL ELSE NOW() END,
              status='New', junk_requested_at=NULL,
              status_before_delete=NULL, delete_requested_by=NULL
        WHERE id=$3`,
      [owner ? owner.name : null, owner ? owner.email : null, req.params.id]
    );
    if (owner) {
      const { rows } = await pool.query("SELECT name, phone FROM leads WHERE id=$1", [req.params.id]);
      if (rows.length)
        notifyLeadAssigned({
          leadId: req.params.id, name: rows[0].name, phone: rows[0].phone,
          assigneeEmail: owner.email, assignedByName: "Admin",
        }).catch(() => {});
    }
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
    const { role, name, email } = req.query;
    const isBda  = role === "bda";
    const filter = isBda
      ? `AND ${ASSIGNED_TO_ME_SQL("$1", "$2", "l")}`
      : `AND NOT ${UNASSIGNED_SQL("l")}`;
    const vals   = isBda ? [name || "", email || ""] : [];

    const { rows } = await pool.query(
      `SELECT f.*, l.name, l.phone, l.city, l.status, l.source, l.assigned_to
       FROM followups f
       JOIN leads l ON f.lead_id = l.id
       WHERE DATE(f.next_followup) = CURRENT_DATE
         AND l.deleted_by_admin = false ${filter}
       ORDER BY f.created_at DESC`,
      vals
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
    const { role, name, email } = req.query;
    const isBda  = role === "bda";
    const filter = isBda
      ? `AND ${ASSIGNED_TO_ME_SQL("$1", "$2", "l")}`
      : `AND NOT ${UNASSIGNED_SQL("l")}`;
    const vals   = isBda ? [name || "", email || ""] : [];

    const { rows } = await pool.query(
      `SELECT f.*, l.name, l.phone, l.city, l.status, l.source, l.assigned_to
       FROM followups f
       JOIN leads l ON f.lead_id = l.id
       WHERE DATE(f.next_followup) < CURRENT_DATE
         AND l.deleted_by_admin = false ${filter}
       ORDER BY f.next_followup ASC`,
      vals
    );
    res.json({ pendingFollowUps: rows });
  } catch (err) {
    console.error("Pending followups error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ══════════════════════════════════════
   ASSIGNEES (dropdown for the Assign modal)
   GET /api/leads/assignees
   Only BDAs — the CEO is never a valid target.
══════════════════════════════════════ */
exports.getAssignees = async (req, res) => {
  try {
    const users = await getBdaUsers();
    res.json({ assignees: users.map(u => ({ id: u.id, name: u.name, email: u.email })) });
  } catch (err) {
    console.error("Get assignees error:", err.message);
    res.status(500).json({ error: "Failed to load BDAs" });
  }
};

/* ══════════════════════════════════════
   ASSIGN / REASSIGN A LEAD
   PUT /api/leads/:id/assign   { assignee_email }
   (requires a valid login token — identity comes from the JWT,
    never from the request body)

   Rules
   • target must be an active BDA  → nobody can assign the CEO
   • CEO  → may assign / reassign any lead to any BDA
   • BDA  → may assign an UNASSIGNED lead (to self or another BDA);
            may NOT reassign a lead that already has an owner —
            only the CEO can reassign
══════════════════════════════════════ */
exports.assignLead = async (req, res) => {
  const { id } = req.params;
  const { assignee_email } = req.body || {};

  try {
    const actor = await getUserById(req.user.id);
    if (!actor) return res.status(401).json({ error: "User not found" });

    const isCEO = actor.role_code === "ceo";
    const isBDA = !isCEO && (await findBdaByEmail(actor.email)) !== null;
    if (!isCEO && !isBDA)
      return res.status(403).json({ error: "Only the CEO or a BDA can assign leads" });

    if (!assignee_email)
      return res.status(400).json({ error: "Choose a BDA to assign this lead to" });

    const target = await findBdaByEmail(assignee_email);
    if (!target)
      return res.status(400).json({ error: "Leads can only be assigned to a BDA" });

    // One atomic UPDATE: the WHERE clause enforces the ownership rule, so two
    // BDAs clicking Assign at the same moment cannot both win.
    const params = [target.name, target.email, actor.name, id];
    let where = `id = $4 AND deleted_by_admin = false`;
    if (!isCEO) {
      where += ` AND ${UNASSIGNED_SQL()}`;   // BDAs: unassigned leads only
    }

    const { rows } = await pool.query(
      `UPDATE leads
          SET last_assignee  = CASE WHEN ${UNASSIGNED_SQL()} THEN last_assignee ELSE assigned_to END,
              assigned_to    = $1,
              assigned_email = $2,
              assigned_by    = $3,
              assigned_at    = NOW(),
              escalated_at   = NULL
        WHERE ${where}
    RETURNING id, name, phone, assigned_to, assigned_email, assigned_by, assigned_at`,
      params
    );

    if (!rows.length) {
      const exists = await pool.query(
        "SELECT assigned_to FROM leads WHERE id=$1 AND deleted_by_admin=false", [id]);
      if (!exists.rows.length) return res.status(404).json({ error: "Lead not found" });
      return res.status(409).json({
        error: `This lead is already assigned to ${exists.rows[0].assigned_to}. Only the CEO can reassign it.`,
      });
    }

    const lead = rows[0];

    // Tell the new owner (unless they assigned it to themselves)
    if ((target.email || "").toLowerCase() !== (actor.email || "").toLowerCase()) {
      notifyLeadAssigned({
        leadId: lead.id, name: lead.name, phone: lead.phone,
        assigneeEmail: target.email, assignedByName: actor.name,
      }).catch(e => console.error("Notify assigned error:", e.message));
    }
    // Clear the "new / escalated lead" alerts for everyone else
    clearPoolAlerts(lead.id, target.email)
      .catch(e => console.error("Clear alerts error:", e.message));

    res.json({ success: true, lead });
  } catch (err) {
    console.error("Assign lead error:", err.message);
    res.status(500).json({ error: "Failed to assign lead" });
  }
};

/* ══════════════════════════════════════════════════════════════════
   DAILY UPDATE NUMBERS  (filled in automatically, nobody types them)
   GET /api/leads/daily-summary        (login required)

   Everything is for the LOGGED-IN BDA (taken from the login token, so nobody
   can ask for another BDA's numbers) and for TODAY in India time.

     leads_total            leads that became the BDA's own today
                            (Assign to me, assigned by the CEO, or added by them)
     leads_qualified        leads the BDA marked "Interested" in a follow-up today
     leads_converted        leads of the BDA that became Converted today
     leads_deleted          delete requests the BDA sent today
     followups_done         follow-ups the BDA saved today
     followups_due_tomorrow open leads of the BDA whose next call date is tomorrow
     followups_overdue      open leads of the BDA whose next call date has passed
══════════════════════════════════════════════════════════════════ */
exports.getDailySummary = async (req, res) => {
  try {
    const actor = await getUserById(req.user.id);
    if (!actor) return res.status(401).json({ error: "User not found" });
    const name  = actor.name || "";
    const email = (actor.email || "").toLowerCase();

    // "today" in India, and a timezone-safe way to turn any timestamp into an IST date
    const TODAY = `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`;
    const istDay = (col) => `(${col}::timestamptz AT TIME ZONE 'Asia/Kolkata')::date`;

    const mine = ASSIGNED_TO_ME_SQL("$1", "$2", "l");
    const num  = async (sql, params) => parseInt((await pool.query(sql, params)).rows[0].n, 10) || 0;
    const me   = [name, email];

    // follow-ups saved by this BDA. Older rows have no done_by, so they count
    // for the lead's current owner. (If done_by doesn't exist yet: owner only.)
    const followupCount = async (extraWhere, distinctLeads) => {
      const select = distinctLeads ? "COUNT(DISTINCT f.lead_id)" : "COUNT(*)";
      const build  = (who) => `
        SELECT ${select} AS n
          FROM followups f JOIN leads l ON l.id = f.lead_id
         WHERE ${istDay("f.created_at")} = ${TODAY}
           ${extraWhere}
           AND ${who}`;
      try {
        return await num(build(`(LOWER(f.done_by) = LOWER($2) OR (f.done_by IS NULL AND ${mine}))`), me);
      } catch (e) {
        if (e.code !== "42703") throw e;
        return await num(build(mine), me);
      }
    };

    const openLead = `l.deleted_by_admin = false
                      AND ${NOT_DELETE_REQUESTED("l")}
                      AND LOWER(COALESCE(l.status, '')) <> ALL($3)`;

    const [
      leads_total, leads_converted, leads_deleted,
      leads_qualified, followups_done,
      followups_due_tomorrow, followups_overdue,
    ] = await Promise.all([
      num(`SELECT COUNT(*) AS n FROM leads l
            WHERE ${mine} AND l.assigned_at IS NOT NULL
              AND ${istDay("l.assigned_at")} = ${TODAY}`, me),
      num(`SELECT COUNT(*) AS n FROM leads l
            WHERE ${mine} AND l.deleted_by_admin = false AND l.converted_at IS NOT NULL
              AND ${istDay("l.converted_at")} = ${TODAY}`, me),
      num(`SELECT COUNT(*) AS n FROM leads l
            WHERE l.junk_requested_at IS NOT NULL
              AND ${istDay("l.junk_requested_at")} = ${TODAY}
              AND LOWER(TRIM(COALESCE(l.delete_requested_by, ''))) = LOWER(TRIM($1))`, [name]),
      followupCount(`AND LOWER(COALESCE(f.status, '')) IN ('interested', 'intrested')`, true),
      followupCount("", false),
      num(`SELECT COUNT(*) AS n FROM leads l
            WHERE ${mine} AND ${openLead}
              AND l.snooze_until IS NOT NULL AND DATE(l.snooze_until) = ${TODAY} + 1`,
          [...me, CLOSED_STATUSES]),
      num(`SELECT COUNT(*) AS n FROM leads l
            WHERE ${mine} AND ${openLead}
              AND l.snooze_until IS NOT NULL AND DATE(l.snooze_until) < ${TODAY}`,
          [...me, CLOSED_STATUSES]),
    ]);

    res.json({
      success: true,
      summary: {
        leads_total, leads_qualified, leads_converted, leads_deleted,
        followups_done, followups_due_tomorrow, followups_overdue,
      },
    });
  } catch (err) {
    console.error("Daily summary error:", err.message);
    res.status(500).json({ error: "Failed to calculate today's numbers" });
  }
};

/* ══════════════════════════════════════════════════════════════════
   POP-UP REMINDERS  (shown by PreferredTimeReminder.jsx)
     "preferred" — the lead's Preferred Call Time slot has started
     "snooze"    — the BDA pressed Snooze on the Follow Up page
══════════════════════════════════════════════════════════════════ */
const REMINDER_COLUMNS = `l.id, l.name, l.phone, l.city, l.status, l.lead_type,
  l.preferred_call_type, l.preferred_call_time, l.preferred_call_slot,
  l.description, l.description_notes`;

/* Everything of THIS BDA's that should pop up right now.
   Snoozed reminders come first (the BDA asked for them explicitly). */
exports.getDueReminders = async (req, res) => {
  try {
    const { name, email } = req.query;
    if (!name && !email) return res.json({ reminders: [] });
    const params = [name || "", email || "", CLOSED_STATUSES];
    const mine   = ASSIGNED_TO_ME_SQL("$1", "$2", "l");

    const [snoozed, preferred] = await Promise.all([
      pool.query(
        `SELECT ${REMINDER_COLUMNS}, 'snooze' AS reminder_kind
           FROM leads l
          WHERE l.deleted_by_admin = false
            AND ${mine}
            AND l.snooze_remind_at IS NOT NULL
            AND l.snooze_remind_at <= NOW()
            AND LOWER(COALESCE(l.status, '')) <> ALL($3)
          ORDER BY l.snooze_remind_at ASC
          LIMIT 10`, params),
      // looks back 3 days so a reminder isn't lost if the BDA wasn't logged in then
      pool.query(
        `SELECT ${REMINDER_COLUMNS}, 'preferred' AS reminder_kind
           FROM leads l
          WHERE l.deleted_by_admin = false
            AND ${mine}
            AND l.preferred_call_time IS NOT NULL
            AND l.preferred_call_time <= NOW()
            AND l.preferred_call_time >  NOW() - INTERVAL '3 days'
            AND (l.preferred_call_ack IS NULL OR l.preferred_call_ack < l.preferred_call_time)
            AND LOWER(COALESCE(l.status, '')) <> ALL($3)
          ORDER BY l.preferred_call_time ASC
          LIMIT 10`, params),
    ]);

    res.json({ reminders: [...snoozed.rows, ...preferred.rows] });
  } catch (err) {
    console.error("Due reminders error:", err.message);
    res.status(500).json({ error: "Failed to load reminders" });
  }
};

/* BDA pressed "Got it". body.kind = "snooze" clears the snooze;
   anything else marks the preferred-time pop-up as seen. */
exports.ackPreferredTime = async (req, res) => {
  try {
    if ((req.body && req.body.kind) === "snooze") {
      await pool.query("UPDATE leads SET snooze_remind_at = NULL WHERE id = $1", [req.params.id]);
    } else {
      await pool.query("UPDATE leads SET preferred_call_ack = NOW() WHERE id = $1", [req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Ack reminder error:", err.message);
    res.status(500).json({ error: "Failed to dismiss reminder" });
  }
};

/* Snooze button: pop up again in 1 or 2 hours.
   PUT /api/leads/:id/snooze-reminder   { minutes: 60 | 120 } */
exports.snoozeReminder = async (req, res) => {
  try {
    const minutes = Number(req.body && req.body.minutes);
    if (![60, 120].includes(minutes))
      return res.status(400).json({ error: "Snooze must be 1 or 2 hours" });

    const { rows } = await pool.query(
      `UPDATE leads
          SET snooze_remind_at = NOW() + ($2::int * INTERVAL '1 minute')
        WHERE id = $1 AND deleted_by_admin = false
    RETURNING snooze_remind_at`,
      [req.params.id, minutes]
    );
    if (!rows.length) return res.status(404).json({ error: "Lead not found" });
    res.json({ success: true, remindAt: rows[0].snooze_remind_at });
  } catch (err) {
    console.error("Snooze reminder error:", err.message);
    res.status(500).json({ error: "Failed to set the reminder" });
  }
};