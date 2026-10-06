// FILE PATH: backend/routes/rfiRoutes.js

const express = require("express");
const router  = express.Router();
const pool    = require("../config/db");
const multer  = require("multer");
const path    = require("path");
const protect = require("../middleware/authMiddleware");
const createSENotification = require("../utils/createSENotification");
const { insertThreeDNotification } = require("../controllers/threeDNotificationsController");
const { insertNotification: insertDigitalMarketingNotification } = require("../controllers/digitalMarketingNotificationsController");

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename:    (_req,  file, cb) =>
    cb(null, `rfi-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Role label map ────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  structural_engineer:  "Structural Engineer",
  mep_engineer:         "MEP Engineer",
  architect:            "Architect",
  project_coordinator:  "Project Coordinator",
  quantity_surveyor:    "Quantity Surveyor",
  site_engineer:        "Site Engineer",
  project_manager:      "Project Manager",
  planning_engineer:    "Planning Engineer",
  qc_engineer:          "QC Engineer",
  safety_officer:       "Safety Officer",
  hr_manager:           "HR Manager",
  "3d_visualizer":      "3D Visualizer",
  digital_marketing:    "Digital Marketing",
};

// ── Notify whoever an RFI is actually assigned to ───────────────────────────
// Previously this only ever notified the Structural Engineer, regardless of
// assigned_to_role — every other role's RFI assignments were silently
// dropped. This routes to each role's own bell, the same way
// IncidentController.notifyByRole does for incidents/tasks.
const normRole = (s) => (s || "").toLowerCase().replace(/[\s_-]/g, "");

async function getUserIdsByNormalizedRole(normalizedTarget) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, r.name, r.code FROM users u JOIN roles r ON r.id = u.role_id`
    );
    return rows
      .filter((r) => normRole(r.code) === normalizedTarget || normRole(r.name) === normalizedTarget)
      .map((r) => r.id);
  } catch (err) {
    console.error("getUserIdsByNormalizedRole error:", err.message);
    return [];
  }
}

async function notifyRFIRecipients(assignedToRole, assignedToUserId, { title, description, severity = "info" }) {
  const role = normRole(assignedToRole);
  try {
    if (role === "structuralengineer") {
      await createSENotification({ type: "rfi", severity, title, description });
      return;
    }

    if (role === "3dvisualizer") {
      // `code`/`name` columns aren't consistently formatted (underscore vs
      // space vs hyphen) across roles, so match by normalized name/code
      // rather than assuming the exact DB code string.
      const targets = assignedToUserId ? [assignedToUserId] : await getUserIdsByNormalizedRole("3dvisualizer");
      for (const uid of targets) {
        await insertThreeDNotification(uid, "rfi", title, description, "/3d-visualizer/rfi", severity, null);
      }
      return;
    }

    if (role === "digitalmarketing") {
      await insertDigitalMarketingNotification(assignedToUserId ?? null, "rfi", title, description, "/digital-marketing/rfi", severity, null);
      return;
    }

    // Shared notifications table is the generic fallback for PM, QS, SE,
    // Architect, Coordinator and other internal RFI recipients. When the
    // notification schema is role-based, the assigned user id is still
    // persisted on the RFI itself for exact access control.
    if (assignedToRole) {
      await pool.query(
        `INSERT INTO notifications (role, type, severity, message, description)
         VALUES ($1,'rfi',$2,$3,$4)`,
        [assignedToRole, severity, title, description]
      );
    }
  } catch (err) {
    console.error("notifyRFIRecipients error:", err.message);
  }
}

// ── KEY HELPER ────────────────────────────────────────────────────────────────
// Resolves a user's TRUE role code + name from DB using their user ID.
// This fixes the mismatch between JWT role value and DB role code/name.
async function resolveUserRole(userId, fallbackRole) {
  try {
    const { rows } = await pool.query(
      `SELECT r.code, r.name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [userId]
    );
    if (rows.length) {
      return {
        code: rows[0].code,   // e.g. "structural_engineer"
        name: rows[0].name,   // e.g. "Structural Engineer"
      };
    }
  } catch (_) {}
  // Fallback to whatever JWT gave us
  return { code: fallbackRole, name: fallbackRole };
}

async function getRfiProjectNames(req, roleCode) {
  const role = String(roleCode || req.user?.role || "").trim().toLowerCase();
  const userId = req.user?.id;
  if (!userId) return null;
  if (["client", "site_engineer", "architect", "project_coordinator"].includes(role)) {
    const column = {
      client: "client_user_id",
      site_engineer: "site_engineer_id",
      architect: "architect_id",
      project_coordinator: "coordinator_id",
    }[role];
    const result = await pool.query(
      `SELECT name FROM projects WHERE ${column} = $1 AND status IS DISTINCT FROM 'Archived'`,
      [userId]
    );
    return result.rows.map(r => r.name).filter(Boolean);
  }
  if (role === "project_manager") {
    const employee = await pool.query(`SELECT id FROM employees WHERE user_id = $1 LIMIT 1`, [userId]);
    if (!employee.rows.length) return [];
    const result = await pool.query(
      `SELECT p.name FROM projects p WHERE p.manager_id = $1 AND p.status IS DISTINCT FROM 'Archived'`,
      [employee.rows[0].id]
    );
    return result.rows.map(r => r.name).filter(Boolean);
  }
  return null;
}

// ── WHERE clause builder ──────────────────────────────────────────────────────
// Matches by BOTH code and name so any stored format works.
//   e.g. roleCode="structural_engineer", roleName="Structural Engineer"
//   matches rfis where raised_by_role OR assigned_to_role is either value.
function buildRoleWhere(view, { roleCodeParam, roleNameParam, userIdParam, projectNamesParam }) {
  const roleRaised = `(LOWER(r.raised_by_role) IN (LOWER(${roleCodeParam}), LOWER(${roleNameParam})))`;
  const roleAssigned = `(LOWER(r.assigned_to_role) IN (LOWER(${roleCodeParam}), LOWER(${roleNameParam})))`;
  const ownRaised = `r.raised_by_id = ${userIdParam}`;
  const ownAssigned = `r.assigned_to_user_id = ${userIdParam}`;
  const projectScope = projectNamesParam ? `r.project_name = ANY(${projectNamesParam}::text[])` : null;
  const raised = projectScope ? `(${ownRaised} OR (${roleRaised} AND ${projectScope}))` : `(${ownRaised} OR ${roleRaised})`;
  const assigned = projectScope ? `(${ownAssigned} OR (${roleAssigned} AND ${projectScope}))` : `(${ownAssigned} OR ${roleAssigned})`;

  if (view === "sent") return `WHERE ${raised}`;
  if (view === "received") return `WHERE ${assigned}`;
  return `WHERE ${raised} OR ${assigned}`;
}

// ── GET /api/rfis?view=all|sent|received ──────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    const view   = req.query.view || "all";

    // ✅ Always resolve from DB — no reliance on JWT role format
    const { code, name } = await resolveUserRole(userId, req.user?.role);
    const projectNames = await getRfiProjectNames(req, code);

    console.log(`GET /api/rfis | userId=${userId} | code=${code} | name=${name} | view=${view}`);

    const params = [userId, code, name];
    let projectParam = null;
    if (projectNames !== null) { params.push(projectNames); projectParam = `$${params.length}`; }
    const where = buildRoleWhere(view, {
      userIdParam: "$1", roleCodeParam: "$2", roleNameParam: "$3", projectNamesParam: projectParam,
    });

    const result = await pool.query(
      `SELECT r.*,
         (SELECT COUNT(*) FROM rfi_responses rp WHERE rp.rfi_id = r.id) AS response_count
       FROM rfis r
       ${where}
       ORDER BY r.created_at DESC`,
      params
    );

    console.log(`✅ ${result.rows.length} RFIs found`);
    return res.json({ success: true, rfis: result.rows });
  } catch (err) {
    console.error("GET /api/rfis error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/rfis/:id — full thread ──────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const userId  = req.user?.id;
    const { id }  = req.params;

    const { code, name } = await resolveUserRole(userId, req.user?.role);

    console.log(`GET /api/rfis/${id} | code=${code} | name=${name}`);

    const rfiRes = await pool.query(
      `SELECT * FROM rfis
       WHERE id = $1
         AND (
           raised_by_id = $2 OR assigned_to_user_id = $2 OR
           (LOWER(raised_by_role) IN (LOWER($3), LOWER($4)) AND ($5::text[] IS NULL OR project_name = ANY($5::text[]))) OR
           (LOWER(assigned_to_role) IN (LOWER($3), LOWER($4)) AND ($5::text[] IS NULL OR project_name = ANY($5::text[])))
         )`,
      [id, userId, code, name, await getRfiProjectNames(req, code)]
    );

    if (!rfiRes.rowCount)
      return res.status(404).json({ success: false, message: "Not found or access denied" });

    const responses = await pool.query(
      `SELECT * FROM rfi_responses WHERE rfi_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return res.json({ success: true, rfi: rfiRes.rows[0], responses: responses.rows });
  } catch (err) {
    console.error("GET /api/rfis/:id error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/rfis — create RFI ───────────────────────────────────────────────
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    const {
      subject,
      description,
      priority = "medium",
      assigned_to_role,
      assigned_to_user_id,
      project_name,
      drawing_ref,
      grid_ref,
      zone,
      response_required_by,
    } = req.body;

    const userId = req.user?.id;

    if (!subject || !assigned_to_role)
      return res.status(400).json({ success: false, message: "subject and assigned_to_role required" });

    // ✅ Always get raisedByRole from DB — never trust JWT format alone
    const { code: raisedByCode, name: raisedByName_role } = await resolveUserRole(userId, req.user?.role);
    const raisedByDisplayName = req.user?.name || ROLE_LABELS[raisedByCode] || raisedByCode;

    console.log(`POST /api/rfis | from=${raisedByCode} | to=${assigned_to_role} | subject=${subject}`);

    const responseDate =
      response_required_by?.trim() ? response_required_by : null;

    const result = await pool.query(
      `INSERT INTO rfis
         (subject, description, priority, status,
          raised_by_role, raised_by_name, raised_by_id,
          assigned_to_role, assigned_to_user_id,
          project_name, drawing_ref, grid_ref, zone,
          response_required_by, created_at, updated_at)
       VALUES ($1,$2,$3,'open',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
       RETURNING *`,
      [
        subject,
        description || "",
        priority,
        raisedByCode,           // ✅ always store role CODE
        raisedByDisplayName,
        userId,
        assigned_to_role,       // comes from frontend selectedRole.code
        assigned_to_user_id || null,
        project_name   || null,
        drawing_ref    || null,
        grid_ref       || null,
        zone           || null,
        responseDate,
      ]
    );

    const newRFI = result.rows[0];
    console.log(`✅ RFI created: ID=${newRFI.id}`);

    if (req.file) {
      await pool.query(
        `INSERT INTO rfi_responses
           (rfi_id, responder_role, responder_name, responder_id, message, file_url, file_name, created_at)
         VALUES ($1,$2,$3,$4,'[File attached with RFI]',$5,$6,NOW())`,
        [newRFI.id, raisedByCode, raisedByDisplayName, userId,
         `/uploads/${req.file.filename}`, req.file.originalname]
      );
    }

    if (assigned_to_role) {
      try {
        await notifyRFIRecipients(assigned_to_role, assigned_to_user_id, {
          title: `New RFI: ${subject}`,
          description: `${ROLE_LABELS[raisedByCode] || raisedByCode} raised an RFI to you: "${subject}"`,
          severity: ["critical", "high"].includes(priority) ? "critical" : "warn",
        });
      } catch (e) { console.error("Notify err:", e.message); }
    }

    return res.status(201).json({ success: true, rfi: newRFI });
  } catch (err) {
    console.error("POST /api/rfis error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/rfis/:id/respond ────────────────────────────────────────────────
router.post("/:id/respond", protect, upload.single("file"), async (req, res) => {
  try {
    const { id }      = req.params;
    const { message } = req.body;
    const userId      = req.user?.id;

    const { code, name } = await resolveUserRole(userId, req.user?.role);
    const displayName    = req.user?.name || ROLE_LABELS[code] || code;

    if (!message && !req.file)
      return res.status(400).json({ success: false, message: "Message or file required" });

    const rfiRes = await pool.query(
      `SELECT * FROM rfis
       WHERE id = $1
         AND (
           raised_by_id = $2 OR assigned_to_user_id = $2 OR
           (LOWER(raised_by_role) IN (LOWER($3), LOWER($4)) AND ($5::text[] IS NULL OR project_name = ANY($5::text[]))) OR
           (LOWER(assigned_to_role) IN (LOWER($3), LOWER($4)) AND ($5::text[] IS NULL OR project_name = ANY($5::text[])))
         )`,
      [id, userId, code, name, await getRfiProjectNames(req, code)]
    );

    if (!rfiRes.rowCount)
      return res.status(404).json({ success: false, message: "Not found or access denied" });

    const rfi      = rfiRes.rows[0];
    const fileUrl  = req.file ? `/uploads/${req.file.filename}` : null;
    const fileName = req.file ? req.file.originalname : null;

    const resp = await pool.query(
      `INSERT INTO rfi_responses
         (rfi_id, responder_role, responder_name, responder_id, message, file_url, file_name, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
      [id, code, displayName, userId, message || "[File attached]", fileUrl, fileName]
    );

    if (rfi.status === "open")
      await pool.query(`UPDATE rfis SET status='responded', updated_at=NOW() WHERE id=$1`, [id]);

    const otherRole = rfi.raised_by_role === code ? rfi.assigned_to_role : rfi.raised_by_role;
    const otherUserId = rfi.raised_by_role === code ? rfi.assigned_to_user_id : rfi.raised_by_id;
    if (otherRole && otherRole.toLowerCase() !== code?.toLowerCase()) {
      try {
        await notifyRFIRecipients(otherRole, otherUserId, {
          title: `RFI Response: ${rfi.subject}`,
          description: `${ROLE_LABELS[code] || code} responded to your RFI "${rfi.subject}"`,
          severity: "info",
        });
      } catch (e) { console.error("Notify err:", e.message); }
    }

    return res.json({ success: true, response: resp.rows[0] });
  } catch (err) {
    console.error("POST /api/rfis/:id/respond error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/rfis/:id/status ────────────────────────────────────────────────
router.patch("/:id/status", protect, async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;
    const userId     = req.user?.id;

    if (!["open","responded","closed"].includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });

    const { code, name } = await resolveUserRole(userId, req.user?.role);

    const result = await pool.query(
      `UPDATE rfis SET status=$1, updated_at=NOW()
       WHERE id=$2
         AND (
           raised_by_id = $3 OR assigned_to_user_id = $3 OR
           (LOWER(raised_by_role) IN (LOWER($4), LOWER($5)) AND ($6::text[] IS NULL OR project_name = ANY($6::text[]))) OR
           (LOWER(assigned_to_role) IN (LOWER($4), LOWER($5)) AND ($6::text[] IS NULL OR project_name = ANY($6::text[])))
         )
       RETURNING *`,
      [status, id, userId, code, name, await getRfiProjectNames(req, code)]
    );

    if (!result.rowCount)
      return res.status(404).json({ success: false, message: "Not found or access denied" });

    return res.json({ success: true, rfi: result.rows[0] });
  } catch (err) {
    console.error("PATCH /api/rfis/:id/status error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;