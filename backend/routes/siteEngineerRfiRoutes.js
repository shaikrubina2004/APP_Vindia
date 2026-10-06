const express = require("express");
const multer = require("multer");
const path = require("path");
const pool = require("../config/db");
const auth = require("../middleware/authMiddleware");

const router = express.Router();
router.use(auth);
router.use(auth.requireRole("site_engineer", "project_manager", "ceo"));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => cb(null, `rfi-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function roleOf(req) {
  return String(req.user?.role || "").trim().toLowerCase();
}

async function getRequesterEmployee(userId) {
  const result = await pool.query(
    `SELECT id, name, email FROM employees WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getAccessibleProjects(req) {
  const role = roleOf(req);
  if (role === "ceo") {
    const result = await pool.query(`SELECT id, name, manager_id FROM projects WHERE status IS DISTINCT FROM 'Archived' ORDER BY name`);
    return result.rows;
  }

  if (role === "site_engineer") {
    const result = await pool.query(
      `SELECT id, name, manager_id
         FROM projects
        WHERE site_engineer_id = $1
          AND status IS DISTINCT FROM 'Archived'
        ORDER BY name`,
      [req.user.id]
    );
    return result.rows;
  }

  if (role === "project_manager") {
    const employee = await getRequesterEmployee(req.user.id);
    if (!employee) return [];
    const result = await pool.query(
      `SELECT id, name, manager_id
         FROM projects
        WHERE manager_id = $1
          AND status IS DISTINCT FROM 'Archived'
        ORDER BY name`,
      [employee.id]
    );
    return result.rows;
  }

  return [];
}

async function resolveProject(req, value) {
  const projects = await getAccessibleProjects(req);
  if (!projects.length) return null;
  if (value !== undefined && value !== null && String(value).trim() !== "") {
    const raw = String(value).trim();
    const byId = projects.find((p) => String(p.id) === raw);
    if (byId) return byId;
    const byName = projects.find((p) => p.name.toLowerCase() === raw.toLowerCase());
    if (byName) return byName;
    return null;
  }
  return projects.length === 1 ? projects[0] : projects[0];
}

async function getScopedRfi(req, id) {
  const projects = await getAccessibleProjects(req);
  const projectNames = projects.map((p) => p.name);
  if (!projectNames.length) return null;

  const result = await pool.query(
    `SELECT *
       FROM rfis
      WHERE id = $1
        AND project_name = ANY($2::text[])
      LIMIT 1`,
    [id, projectNames]
  );
  return result.rows[0] || null;
}

async function getProjectManager(projectId) {
  const result = await pool.query(
    `SELECT e.user_id, u.name, u.role
       FROM projects p
       JOIN employees e ON e.id = p.manager_id
       LEFT JOIN users u ON u.id = e.user_id
      WHERE p.id = $1
      LIMIT 1`,
    [projectId]
  );
  return result.rows[0] || null;
}

async function resolveAssignee(req, project, assignedTo) {
  if (assignedTo) {
    const result = await pool.query(
      `SELECT id, name, role FROM users WHERE id = $1 LIMIT 1`,
      [Number(assignedTo)]
    );
    if (!result.rows.length) return null;
    const target = result.rows[0];
    if (String(target.role || "").toLowerCase() === "client") return null;
    return { userId: target.id, role: String(target.role || "").trim().toLowerCase(), name: target.name || target.role || "User" };
  }

  const manager = await getProjectManager(project.id);
  if (!manager?.user_id) return null;
  return {
    userId: manager.user_id,
    role: "project_manager",
    name: manager.name || "Project Manager",
  };
}

// GET all RFIs raised/visible within the authenticated SE/PM project scope.
router.get("/", async (req, res) => {
  try {
    const projects = await getAccessibleProjects(req);
    if (!projects.length) return res.json([]);
    const result = await pool.query(
      `SELECT
         r.*, r.subject AS title,
         r.created_at AS "createdAt"
       FROM rfis r
      WHERE r.project_name = ANY($1::text[])
      ORDER BY r.created_at DESC`,
      [projects.map((p) => p.name)]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("SE RFI list:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET single RFI within the authenticated project scope.
router.get("/:id", async (req, res) => {
  try {
    const rfi = await getScopedRfi(req, req.params.id);
    if (!rfi) return res.status(404).json({ error: "RFI not found" });
    return res.json({ ...rfi, title: rfi.subject, createdAt: rfi.created_at });
  } catch (err) {
    console.error("SE RFI get:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// CREATE RFI. Uses the canonical rfis/rfi_responses workflow.
router.post("/", upload.array("attachments", 10), async (req, res) => {
  try {
    const project = await resolveProject(req, req.body?.projectId ?? req.body?.project);
    if (!project) {
      return res.status(400).json({ error: "A project assigned to your account is required." });
    }

    const subject = String(req.body?.title || req.body?.subject || "").trim();
    const description = String(req.body?.description || "").trim();
    const priority = String(req.body?.priority || "medium").trim().toLowerCase();
    if (!subject) return res.status(400).json({ error: "Title/subject is required" });
    if (!description) return res.status(400).json({ error: "Description is required" });
    if (!["low", "medium", "high", "critical"].includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    const assignee = await resolveAssignee(req, project, req.body?.assignedTo);
    if (!assignee) {
      return res.status(400).json({ error: "Unable to resolve an internal RFI recipient for this project." });
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM rfis WHERE project_name = $1`,
      [project.name]
    );
    const seq = Number.parseInt(countResult.rows[0]?.count || "0", 10) + 1;
    const rfiCode = `RFI-${String(seq).padStart(3, "0")}`;

    const userName = req.user?.name || "Site Engineer";
    const result = await pool.query(
      `INSERT INTO rfis
        (rfi_code, subject, description, priority, status,
         raised_by_role, raised_by_name, raised_by_id,
         assigned_to_role, assigned_to_user_id,
         project_name, drawing_ref, grid_ref, zone,
         response_required_by, created_at, updated_at)
       VALUES
        ($1,$2,$3,$4,'open',
         $5,$6,$7,
         $8,$9,
         $10,$11,$12,$13,
         $14,NOW(),NOW())
       RETURNING *`,
      [
        rfiCode,
        subject,
        description,
        priority,
        roleOf(req),
        userName,
        req.user.id,
        assignee.role,
        assignee.userId,
        project.name,
        req.body?.drawing_ref || null,
        req.body?.grid_ref || null,
        req.body?.zone || null,
        req.body?.response_required_by?.trim() || null,
      ]
    );

    if (Array.isArray(req.files) && req.files.length) {
      for (const file of req.files) {
        await pool.query(
          `INSERT INTO rfi_responses
            (rfi_id, responder_role, responder_name, responder_id, message, file_url, file_name, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
          [result.rows[0].id, roleOf(req), userName, req.user.id, "[File attached with RFI]", `/uploads/${file.filename}`, file.originalname]
        );
      }
    }

    return res.status(201).json({
      ...result.rows[0],
      title: result.rows[0].subject,
      createdAt: result.rows[0].created_at,
    });
  } catch (err) {
    console.error("SE RFI create:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const rfi = await getScopedRfi(req, req.params.id);
    if (!rfi) return res.status(404).json({ error: "RFI not found" });
    const status = String(req.body?.status || "").toLowerCase();
    if (!["open", "responded", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const result = await pool.query(
      `UPDATE rfis SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    return res.json({ ...result.rows[0], title: result.rows[0].subject, createdAt: result.rows[0].created_at });
  } catch (err) {
    console.error("SE RFI status:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.put("/:id/answer", async (req, res) => {
  try {
    const rfi = await getScopedRfi(req, req.params.id);
    if (!rfi) return res.status(404).json({ error: "RFI not found" });
    const response = String(req.body?.response || "").trim();
    if (!response) return res.status(400).json({ error: "Response is required" });

    await pool.query(
      `INSERT INTO rfi_responses
        (rfi_id, responder_role, responder_name, responder_id, message, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [req.params.id, roleOf(req), req.user?.name || roleOf(req), req.user.id, response]
    );

    const result = await pool.query(
      `UPDATE rfis SET status = 'responded', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    return res.json({ ...result.rows[0], title: result.rows[0].subject, createdAt: result.rows[0].created_at });
  } catch (err) {
    console.error("SE RFI answer:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const rfi = await getScopedRfi(req, req.params.id);
    if (!rfi) return res.status(404).json({ error: "RFI not found" });
    const role = roleOf(req);
    if (role !== "ceo" && Number(rfi.raised_by_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: "Only the RFI creator or CEO can delete this RFI." });
    }
    await pool.query("DELETE FROM rfis WHERE id = $1", [req.params.id]);
    return res.json({ success: true, message: "RFI deleted" });
  } catch (err) {
    console.error("SE RFI delete:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
