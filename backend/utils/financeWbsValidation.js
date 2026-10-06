// ===== FILE: APP_Vindia/backend/utils/financeWbsValidation.js =====
//
// ONE reusable WBS validation/resolution layer for all of Finance, so
// Expenses/Invoices/Payments/Budgets/Journal Entries/Petty Cash/Tax
// Register never each grow their own slightly-different WBS check
// (Section 22: "Do not duplicate slightly different WBS validation
// logic in every controller").
//
// Reuses the EXISTING `wbs` table exactly as wbsController.js defines
// it (id, project_id, code, name, parent_id, status, progress). Never
// creates a second hierarchy.

const pool = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

// ── Basic lookups ──────────────────────────────────────────────────

async function getWbsById(wbsId) {
  const { rows } = await pool.query(`SELECT * FROM wbs WHERE id = $1`, [wbsId]);
  return rows[0] || null;
}

// Full display context for a wbs_id: the row itself, plus its
// top-level milestone (itself, if it has no parent — otherwise the
// parent row). This is what lets Finance show
//   PROJECT -> WBS CODE/MILESTONE -> ACTIVITY/SUBTASK
// without a second query fanning out from every list page.
async function resolveWbsContext(wbsId) {
  if (wbsId === null || wbsId === undefined) return null;
  const wbs = await getWbsById(wbsId);
  if (!wbs) return null;

  let milestone = wbs;
  if (wbs.parent_id) {
    milestone = (await getWbsById(wbs.parent_id)) || wbs;
  }

  return {
    wbs_id: wbs.id,
    wbs_code: wbs.code,
    wbs_name: wbs.name,
    wbs_level: wbs.parent_id ? "activity" : "milestone",
    wbs_project_id: wbs.project_id,
    milestone_id: milestone.id,
    milestone_code: milestone.code,
    milestone_name: milestone.name,
  };
}

function toIdOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// ── Core validation, used by every create/update ────────────────────
//
// Call BEFORE any DB write. Throws AppError (400/404) on any violation
// — never trusts the frontend to have already enforced the
// project<->WBS relationship.
//
// options.required: true  -> a project-level record (project_id set)
//                             MUST carry a wbs_id.
// options.allowChildOnly: reserved for future use; currently both
//   top-level milestones and child activities are valid finance
//   classifications, per spec Section 2.
//
// Returns the resolved WBS context (see resolveWbsContext) or null
// when no WBS was supplied and none was required.
async function validateFinanceWbs({ project_id, wbs_id }, { required = false } = {}) {

  const projectId = toIdOrNull(project_id);
  const wbsId = toIdOrNull(wbs_id);
  console.error("\n========== validateFinanceWbs CALLED ==========");
console.error({
  project_id,
  wbs_id,
  required
});
console.error(new Error("WBS VALIDATION CALL STACK").stack);
console.error("=============================================\n");

  if (Number.isNaN(projectId)) {
    throw new AppError("Invalid project_id.", 400);
  }
  if (Number.isNaN(wbsId)) {
    throw new AppError("Invalid wbs_id.", 400);
  }

  if (wbsId === null) {
    if (required && projectId !== null) {
      throw new AppError(
        "A WBS / Milestone classification is required for project-level records.",
        400
      );
    }
    return null;
  }

  // A WBS can never be attached to a record that isn't itself
  // project-scoped — there would be nothing to check it against, and
  // it would let a company-level row silently borrow one project's
  // WBS code.
  if (projectId === null) {
    throw new AppError(
      "A WBS can only be selected together with a project.",
      400
    );
  }

  const wbs = await getWbsById(wbsId);
  if (!wbs) {
    throw new AppError("Selected WBS does not exist.", 404);
  }
  if (Number(wbs.project_id) !== projectId) {
    throw new AppError(
      "Selected WBS does not belong to the selected project.",
      400
    );
  }

  return resolveWbsContext(wbsId);
}

// ── Immutability guard ───────────────────────────────────────────────
//
// Once a record reaches an accounting state where classification must
// stop moving (approved expense, posted journal entry, filed tax
// entry, etc.), its WBS must not be silently reassigned through a
// generic update. Call with the field only when present in the
// request body — a field the caller didn't touch is never flagged.
function assertWbsUnchanged(existingWbsId, incomingWbsId, label = "record") {
  if (incomingWbsId === undefined) return; // caller didn't try to change it
  const existing = existingWbsId ?? null;
  const incoming = incomingWbsId === "" ? null : incomingWbsId ?? null;
  const same =
    (existing === null && incoming === null) ||
    Number(existing) === Number(incoming);
  if (!same) {
    throw new AppError(
      `Cannot change the WBS classification of a ${label} that is no longer editable.`,
      409
    );
  }
}

// ── Source-derived WBS (Tax Register) ───────────────────────────────
//
// Tax Register must never disagree with its source invoice/expense.
// Given a source_type/source_id, returns the { project_id, wbs_id }
// the source transaction is actually classified under, or throws if
// the source cannot be found.
async function deriveWbsFromSource(sourceType, sourceId) {
  const table = sourceType === "invoice" ? "invoices" : "expenses";
  const { rows } = await pool.query(
    `SELECT project_id, wbs_id FROM ${table} WHERE id = $1`,
    [sourceId]
  );
  if (!rows.length) {
    throw new AppError(
      `Source ${sourceType} #${sourceId} was not found.`,
      404
    );
  }
  return { project_id: rows[0].project_id, wbs_id: rows[0].wbs_id };
}

module.exports = {
  getWbsById,
  resolveWbsContext,
  validateFinanceWbs,
  assertWbsUnchanged,
  deriveWbsFromSource,
};
