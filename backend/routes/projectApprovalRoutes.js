// Project approvals & clearances (BBMP sanction, Fire NOC, OC...).
// The project team maintains these records; the client sees the ones marked visible
// on their Approvals page and is notified when one is added or its status changes.
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { ensureClientTables } = require("../utils/clientTables");
const { notifyProjectClient } = require("../utils/clientNotifications");

router.use(protect, protect.requireRole("ceo", "project_manager", "project_coordinator"));

const STATUSES = ["approved", "pending", "upcoming", "rejected"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const fail = (res, status, message) => res.status(status).json({ message });
const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// CEO: any project. PM: projects they manage. Coordinator: projects they coordinate.
async function canManage(req, projectId) {
  if (req.user.role === "ceo") return true;
  const r =
    req.user.role === "project_coordinator"
      ? await pool.query(`SELECT 1 FROM projects WHERE id = $1 AND coordinator_id = $2`, [projectId, req.user.id])
      : await pool.query(
          `SELECT 1 FROM projects p JOIN employees e ON e.id = p.manager_id WHERE p.id = $1 AND e.user_id = $2`,
          [projectId, req.user.id]
        );
  return r.rowCount > 0;
}

function clean(body, partial = false) {
  const out = {};
  const str = (k, max) => {
    if (body[k] === undefined) return;
    const v = String(body[k] ?? "").trim();
    if (v.length > max) throw new Error(`${k} must be ${max} characters or fewer`);
    out[k] = v || null;
  };
  str("title", 255); str("category", 60); str("issued_by", 255); str("reference_no", 120);
  str("validity_note", 120); str("description", 4000); str("document_url", 2000);
  if (out.title === null || (!partial && !out.title)) throw new Error("title is required");
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw new Error(`status must be one of: ${STATUSES.join(", ")}`);
    out.status = body.status;
  }
  for (const k of ["issued_date", "valid_until"]) {
    if (body[k] === undefined) continue;
    if (body[k] && !DATE_RE.test(String(body[k]))) throw new Error(`${k} must be YYYY-MM-DD`);
    out[k] = body[k] || null;
  }
  if (body.visible_to_client !== undefined) out.visible_to_client = body.visible_to_client === true || body.visible_to_client === "true";
  return out;
}

const D = (c) => `to_char(${c}::date,'YYYY-MM-DD') AS ${c}`;
const COLS = `id, project_id, title, category, issued_by, reference_no, status, ${D("issued_date")}, ${D("valid_until")}, validity_note, description, document_url, visible_to_client, created_at, updated_at`;

router.get("/project/:projectId", async (req, res) => {
  try {
    const projectId = toInt(req.params.projectId);
    if (!projectId) return fail(res, 400, "Invalid project id");
    if (!(await canManage(req, projectId))) return fail(res, 403, "You do not manage this project");
    await ensureClientTables();
    const r = await pool.query(`SELECT ${COLS} FROM project_approvals WHERE project_id = $1 ORDER BY id ASC`, [projectId]);
    res.json({ approvals: r.rows });
  } catch (err) {
    console.error("GET project-approvals:", err);
    fail(res, 500, "Failed to load approvals");
  }
});

router.post("/project/:projectId", async (req, res) => {
  try {
    const projectId = toInt(req.params.projectId);
    if (!projectId) return fail(res, 400, "Invalid project id");
    if (!(await canManage(req, projectId))) return fail(res, 403, "You do not manage this project");
    let f;
    try { f = clean(req.body); } catch (e) { return fail(res, 400, e.message); }
    await ensureClientTables();
    const r = await pool.query(
      `INSERT INTO project_approvals
         (project_id, title, category, issued_by, reference_no, status, issued_date, valid_until,
          validity_note, description, document_url, visible_to_client, created_by)
       VALUES ($1,$2,COALESCE($3,'statutory'),$4,$5,COALESCE($6,'pending'),$7,$8,$9,$10,$11,COALESCE($12,true),$13)
       RETURNING ${COLS}`,
      [projectId, f.title, f.category ?? null, f.issued_by ?? null, f.reference_no ?? null, f.status ?? null,
       f.issued_date ?? null, f.valid_until ?? null, f.validity_note ?? null, f.description ?? null,
       f.document_url ?? null, f.visible_to_client ?? null, req.user.id]
    );
    const row = r.rows[0];
    if (row.visible_to_client) {
      await notifyProjectClient(projectId, {
        type: "approval", title: `Approval added: ${row.title}`, description: `Status: ${row.status}`,
        link: "/client/approvals", referenceId: row.id,
      });
    }
    res.status(201).json({ approval: row });
  } catch (err) {
    console.error("POST project-approvals:", err);
    fail(res, 500, "Failed to create approval");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return fail(res, 400, "Invalid id");
    await ensureClientTables();
    const cur = await pool.query(`SELECT ${COLS} FROM project_approvals WHERE id = $1`, [id]);
    const before = cur.rows[0];
    if (!before) return fail(res, 404, "Approval not found");
    if (!(await canManage(req, before.project_id))) return fail(res, 403, "You do not manage this project");
    let f;
    try { f = clean(req.body, true); } catch (e) { return fail(res, 400, e.message); }
    const keys = Object.keys(f);
    if (!keys.length) return fail(res, 400, "Nothing to update");
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).concat("updated_at = NOW()");
    const r = await pool.query(
      `UPDATE project_approvals SET ${sets.join(", ")} WHERE id = $${keys.length + 1} RETURNING ${COLS}`,
      [...keys.map((k) => f[k]), id]
    );
    const row = r.rows[0];
    if (row.visible_to_client && (before.status !== row.status || !before.visible_to_client)) {
      await notifyProjectClient(row.project_id, {
        type: "approval", title: `Approval ${row.status}: ${row.title}`, description: row.reference_no ? `Ref ${row.reference_no}` : null,
        link: "/client/approvals", referenceId: row.id,
      });
    }
    res.json({ approval: row });
  } catch (err) {
    console.error("PUT project-approvals:", err);
    fail(res, 500, "Failed to update approval");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return fail(res, 400, "Invalid id");
    await ensureClientTables();
    const cur = await pool.query(`SELECT project_id FROM project_approvals WHERE id = $1`, [id]);
    if (!cur.rows[0]) return fail(res, 404, "Approval not found");
    if (!(await canManage(req, cur.rows[0].project_id))) return fail(res, 403, "You do not manage this project");
    await pool.query(`DELETE FROM project_approvals WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE project-approvals:", err);
    fail(res, 500, "Failed to delete approval");
  }
});

module.exports = router;
