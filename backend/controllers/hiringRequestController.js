// ===== FILE: APP_Vindia/backend/controllers/hiringRequestController.js =====
const HiringRequest = require("../models/hiringRequestModel");
const {
  notifyRole,
  insertNotification,
} = require("./operationsNotificationsController");

/* Roles allowed to RAISE a hiring request */
const MANAGER_ROLES = [
  "project_manager",
  "operations_manager",
  "finance_manager",
  "hr_manager",
  "bd_manager",
];

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];
const URGENCIES = ["low", "normal", "high"];

/* Frontend pages (used as notification links) */
const LINK_MINE = "/hiring-requests";
const LINK_FINANCE = "/finance-manager/hiring-requests";
const LINK_HR = "/hr/hiring-requests";

const isOwner = (req, row) => row.requested_by === req.user.id;

/* ── Validate + normalise the form body. Returns { error } or { data } ── */
const parseBody = (body) => {
  const position_title = String(body.position_title || "").trim();
  const justification = String(body.justification || "").trim();
  if (!position_title) return { error: "position_title is required" };
  if (!justification) return { error: "justification is required" };

  const vacancies = parseInt(body.vacancies ?? 1, 10);
  if (!Number.isInteger(vacancies) || vacancies < 1) {
    return { error: "vacancies must be a number of at least 1" };
  }

  const employment_type = body.employment_type || "full_time";
  if (!EMPLOYMENT_TYPES.includes(employment_type)) {
    return { error: `employment_type must be one of: ${EMPLOYMENT_TYPES.join(", ")}` };
  }

  const urgency = body.urgency || "normal";
  if (!URGENCIES.includes(urgency)) {
    return { error: `urgency must be one of: ${URGENCIES.join(", ")}` };
  }

  const toNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  const salary_min = toNum(body.salary_min);
  const salary_max = toNum(body.salary_max);
  if (
    (salary_min !== null && Number.isNaN(salary_min)) ||
    (salary_max !== null && Number.isNaN(salary_max))
  ) {
    return { error: "salary_min / salary_max must be numbers" };
  }
  if (salary_min !== null && salary_max !== null && salary_max < salary_min) {
    return { error: "salary_max cannot be less than salary_min" };
  }

  return {
    data: {
      position_title,
      department: body.department ? String(body.department).trim() : null,
      project_id: body.project_id ? Number(body.project_id) : null,
      vacancies,
      employment_type,
      justification,
      job_description: body.job_description ? String(body.job_description).trim() : null,
      salary_min,
      salary_max,
      urgency,
      expected_joining_date: body.expected_joining_date || null,
    },
  };
};

/* Where a new / resubmitted request starts.
   A Finance Manager's own request skips the Finance step (cannot approve own). */
const firstStatusFor = (role) => (role === "finance_manager" ? "pending_hr" : "pending_finance");

/* Tell the right approver that a request is waiting */
const notifyApprover = async (row, status, actor) => {
  const title = `Hiring request ${row.request_code || ""}`.trim();
  const desc = `${row.requester_name || "A manager"} requested ${row.vacancies} × ${row.position_title}`;
  if (status === "pending_finance") {
    await notifyRole(
      "finance_manager", "hiring", title, desc, LINK_FINANCE,
      "info", row.project_id, row.id, actor.id,
    );
  } else if (status === "pending_hr") {
    await notifyRole(
      "hr_manager", "hiring", title, desc, LINK_HR,
      "info", row.project_id, row.id, actor.id,
    );
  }
};

/* ─────────────────────────────  MANAGER  ───────────────────────────── */

exports.createRequest = async (req, res) => {
  try {
    const { data, error } = parseBody(req.body);
    if (error) return res.status(400).json({ error });

    const actor = { id: req.user.id, role: req.user.role };
    const status = firstStatusFor(actor.role);
    const action = status === "pending_hr" ? "submitted_skip_finance" : "submitted";

    const id = await HiringRequest.create(data, actor, status, action);
    const row = await HiringRequest.getById(id);

    notifyApprover(row, status, actor).catch((e) => console.error("hiring notify:", e.message));

    res.status(201).json(row);
  } catch (err) {
    console.error("CREATE HIRING REQUEST ERROR:", err.message);
    res.status(500).json({ error: "Failed to create hiring request" });
  }
};

exports.getMine = async (req, res) => {
  try {
    res.json(await HiringRequest.getMine(req.user.id));
  } catch (err) {
    console.error("GET MY HIRING REQUESTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch hiring requests" });
  }
};

exports.resubmit = async (req, res) => {
  try {
    const { data, error } = parseBody(req.body);
    if (error) return res.status(400).json({ error });

    const actor = { id: req.user.id, role: req.user.role };
    const status = firstStatusFor(actor.role);

    const id = await HiringRequest.resubmit(
      Number(req.params.id), data, actor, status, "resubmitted",
    );
    if (!id) {
      return res
        .status(409)
        .json({ error: "Only your own rejected requests can be edited and resubmitted" });
    }
    const row = await HiringRequest.getById(id);
    notifyApprover(row, status, actor).catch((e) => console.error("hiring notify:", e.message));
    res.json(row);
  } catch (err) {
    console.error("RESUBMIT HIRING REQUEST ERROR:", err.message);
    res.status(500).json({ error: "Failed to resubmit hiring request" });
  }
};

exports.cancel = async (req, res) => {
  try {
    const actor = { id: req.user.id, role: req.user.role };
    const id = await HiringRequest.cancel(Number(req.params.id), actor);
    if (!id) {
      return res
        .status(409)
        .json({ error: "Only your own pending or rejected requests can be cancelled" });
    }
    res.json(await HiringRequest.getById(id));
  } catch (err) {
    console.error("CANCEL HIRING REQUEST ERROR:", err.message);
    res.status(500).json({ error: "Failed to cancel hiring request" });
  }
};

/* ─────────────────────────────  DETAIL  ───────────────────────────── */

exports.getOne = async (req, res) => {
  try {
    const row = await HiringRequest.getById(Number(req.params.id));
    if (!row) return res.status(404).json({ error: "Hiring request not found" });

    const role = req.user.role;
    const allowed = isOwner(req, row) || ["finance_manager", "hr_manager", "ceo"].includes(role);
    if (!allowed) return res.status(403).json({ error: "Access denied" });

    const history = await HiringRequest.getHistory(row.id);
    res.json({ ...row, history });
  } catch (err) {
    console.error("GET HIRING REQUEST ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch hiring request" });
  }
};

/* ─────────────────────────────  FINANCE  ───────────────────────────── */

exports.getFinanceQueue = async (req, res) => {
  try {
    const rows = await HiringRequest.getFinanceQueue();
    res.json(
      rows.map((r) => ({
        ...r,
        can_decide:
          r.status === "pending_finance" &&
          r.requested_by !== req.user.id &&
          ["finance_manager", "ceo"].includes(req.user.role),
      })),
    );
  } catch (err) {
    console.error("GET FINANCE HIRING QUEUE ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch hiring requests" });
  }
};

exports.financeDecision = async (req, res) => {
  try {
    const { decision, remark } = req.body;
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
    }
    const approve = decision === "approve";
    if (!approve && !String(remark || "").trim()) {
      return res.status(400).json({ error: "A remark is required when rejecting" });
    }

    const existing = await HiringRequest.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: "Hiring request not found" });
    if (existing.requested_by === req.user.id) {
      return res.status(403).json({ error: "You cannot review your own request" });
    }

    const actor = { id: req.user.id, role: req.user.role };
    const id = await HiringRequest.financeDecision(existing.id, approve, remark, actor);
    if (!id) {
      return res.status(409).json({ error: "This request is no longer waiting for Finance" });
    }

    const row = await HiringRequest.getById(id);
    const title = `Hiring request ${row.request_code}`;

    if (approve) {
      insertNotification(
        row.requested_by, "hiring", title,
        `Finance approved "${row.position_title}". It is now with HR.`,
        LINK_MINE, "info", row.project_id, null, row.id,
      ).catch((e) => console.error(e.message));
      notifyRole(
        "hr_manager", "hiring", title,
        `Finance approved ${row.vacancies} × ${row.position_title} — waiting for HR`,
        LINK_HR, "info", row.project_id, row.id, actor.id,
      ).catch((e) => console.error(e.message));
    } else {
      insertNotification(
        row.requested_by, "hiring", title,
        `Finance rejected "${row.position_title}": ${remark}`,
        LINK_MINE, "warning", row.project_id, null, row.id,
      ).catch((e) => console.error(e.message));
    }

    res.json(row);
  } catch (err) {
    console.error("FINANCE HIRING DECISION ERROR:", err.message);
    res.status(500).json({ error: "Failed to record Finance decision" });
  }
};

/* ──────────────────────────────  HR  ────────────────────────────── */

/* An HR Manager cannot approve a request raised by an HR Manager — only the CEO can. */
const canHrDecide = (req, r) =>
  r.status === "pending_hr" &&
  r.requested_by !== req.user.id &&
  (req.user.role === "ceo" ||
    (req.user.role === "hr_manager" && r.requester_role !== "hr_manager"));

exports.getHrQueue = async (req, res) => {
  try {
    const rows = await HiringRequest.getHrQueue();
    res.json(rows.map((r) => ({ ...r, can_decide: canHrDecide(req, r) })));
  } catch (err) {
    console.error("GET HR HIRING QUEUE ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch hiring requests" });
  }
};

exports.hrDecision = async (req, res) => {
  try {
    const { decision, remark } = req.body;
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
    }
    const approve = decision === "approve";
    if (!approve && !String(remark || "").trim()) {
      return res.status(400).json({ error: "A remark is required when rejecting" });
    }

    const existing = await HiringRequest.getById(Number(req.params.id));
    if (!existing) return res.status(404).json({ error: "Hiring request not found" });
    if (!canHrDecide(req, existing)) {
      return res.status(403).json({
        error:
          existing.requested_by === req.user.id
            ? "You cannot review your own request"
            : "You cannot decide this request (HR Manager requests need CEO approval)",
      });
    }

    const actor = { id: req.user.id, role: req.user.role };
    const result = await HiringRequest.hrDecision(existing.id, approve, remark, actor);
    if (!result) {
      return res.status(409).json({ error: "This request is no longer waiting for HR" });
    }

    const row = await HiringRequest.getById(existing.id);
    const title = `Hiring request ${row.request_code}`;

    if (approve) {
      insertNotification(
        row.requested_by, "hiring", title,
        `HR approved "${row.position_title}". Recruitment has started.`,
        LINK_MINE, "info", row.project_id, null, row.id,
      ).catch((e) => console.error(e.message));
    } else {
      insertNotification(
        row.requested_by, "hiring", title,
        `HR rejected "${row.position_title}": ${remark}`,
        LINK_MINE, "warning", row.project_id, null, row.id,
      ).catch((e) => console.error(e.message));
    }

    res.json(row);
  } catch (err) {
    console.error("HR HIRING DECISION ERROR:", err.message);
    res.status(500).json({ error: "Failed to record HR decision" });
  }
};

exports.MANAGER_ROLES = MANAGER_ROLES;