// ===== FILE: APP_Vindia/backend/controllers/journalEntryController.js =====
//
// Backend authorization is the real security boundary (financePermissions.js
// is frontend-visibility only). This controller enforces Decision 3:
//   Accountant: create, edit draft, submit
//   Finance Manager: approve, post, reverse
// req.user.role is already normalized lowercase/snake_case by authMiddleware.

const JournalEntry = require("../models/journalEntryModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

const FM_ONLY_ROLES = ["finance_manager", "ceo"];

function isFinanceManager(req) {
  return FM_ONLY_ROLES.includes(req.user?.role);
}

// create/edit-draft/submit are Accountant-only (Decision 3). No existing
// precedent in this project supports Finance Manager creating journal
// entries operationally (searched: nothing analogous exists), so this
// defaults to strict separation rather than silently allowing FM/CEO
// through — if FM needs to create/submit for a legitimate operational
// reason, that is a separate explicit decision, not made here.
function isAccountant(req) {
  return req.user?.role === "accountant";
}

exports.getAll = asyncHandler(async (req, res) => {
  const { project_id, status } = req.query;
  const rows = await JournalEntry.getAll({ project_id, status });
  res.json({ success: true, data: rows });
});

exports.getById = asyncHandler(async (req, res) => {
  const entry = await JournalEntry.getById(req.params.id);
  if (!entry) throw new AppError("Journal entry not found", 404);
  res.json({ success: true, data: entry });
});

// Accountant only (Decision 3) — Finance Manager/CEO explicitly blocked.
exports.create = asyncHandler(async (req, res) => {
  if (!isAccountant(req)) {
    throw new AppError("Only Accountant can create journal entries", 403);
  }

  const { entry_date, description, project_id, lines } = req.body;

  if (!Array.isArray(lines) || lines.length === 0) {
    throw new AppError("At least one journal line is required", 400);
  }
  for (const line of lines) {
    if (!line.account_id) {
      throw new AppError("Every journal line requires an account_id", 400);
    }
  }

  const entry = await JournalEntry.create({
    entry_date,
    description,
    project_id,
    lines,
    created_by: req.user.id,
  });
  res.status(201).json({ success: true, data: entry });
});

// Accountant only (Decision 3), AND only their own draft — the model
// enforces both NOT_DRAFT and NOT_OWNER. A submitted/approved/posted
// entry can never be silently changed regardless of role, and one
// accountant cannot edit another accountant's draft.
exports.update = asyncHandler(async (req, res) => {
  if (!isAccountant(req)) {
    throw new AppError("Only Accountant can edit journal entries", 403);
  }

  const { entry_date, description, project_id, lines } = req.body;
  const result = await JournalEntry.updateDraft(
    req.params.id,
    { entry_date, description, project_id, lines },
    req.user.id
  );

  if (result.error === "NOT_FOUND") throw new AppError("Journal entry not found", 404);
  if (result.error === "NOT_DRAFT") {
    throw new AppError("Only draft journal entries can be edited", 409);
  }
  if (result.error === "NOT_OWNER") {
    throw new AppError("You can only edit journal entries you created", 403);
  }
  res.json({ success: true, data: result.entry });
});

// Accountant only (Decision 3), own draft only — submits a balanced
// draft for approval.
exports.submit = asyncHandler(async (req, res) => {
  if (!isAccountant(req)) {
    throw new AppError("Only Accountant can submit journal entries", 403);
  }

  const result = await JournalEntry.submit(req.params.id, req.user.id);

  if (result.error === "NOT_FOUND") throw new AppError("Journal entry not found", 404);
  if (result.error === "NOT_DRAFT") {
    throw new AppError("Only draft journal entries can be submitted", 409);
  }
  if (result.error === "NOT_OWNER") {
    throw new AppError("You can only submit journal entries you created", 403);
  }
  if (result.error === "UNBALANCED") {
    throw new AppError("Total debit must equal total credit before submission", 400);
  }
  res.json({ success: true, data: result.entry });
});

// Finance Manager / CEO only — Accountant is explicitly blocked here,
// this IS the backend enforcement, not just a hidden UI button.
exports.approve = asyncHandler(async (req, res) => {
  if (!isFinanceManager(req)) {
    throw new AppError("Only Finance Manager can approve journal entries", 403);
  }
  const result = await JournalEntry.approve(req.params.id, req.user.id);

  if (result.error === "NOT_FOUND") throw new AppError("Journal entry not found", 404);
  if (result.error === "NOT_SUBMITTED") {
    throw new AppError("Only submitted journal entries can be approved", 409);
  }
  if (result.error === "UNBALANCED") {
    throw new AppError("Total debit must equal total credit before approval", 400);
  }
  res.json({ success: true, data: result.entry });
});

// Finance Manager / CEO only — Accountant cannot post directly (Decision 3).
exports.post = asyncHandler(async (req, res) => {
  if (!isFinanceManager(req)) {
    throw new AppError("Only Finance Manager can post journal entries", 403);
  }
  const result = await JournalEntry.post(req.params.id, req.user.id);

  if (result.error === "NOT_FOUND") throw new AppError("Journal entry not found", 404);
  if (result.error === "NOT_APPROVED") {
    throw new AppError("Only approved journal entries can be posted", 409);
  }
  if (result.error === "UNBALANCED") {
    throw new AppError("Total debit must equal total credit before posting", 400);
  }
  res.json({ success: true, data: result.entry });
});

// Finance Manager / CEO only.
exports.reverse = asyncHandler(async (req, res) => {
  if (!isFinanceManager(req)) {
    throw new AppError("Only Finance Manager can reverse journal entries", 403);
  }
  const result = await JournalEntry.reverse(req.params.id, req.user.id);

  if (result.error === "NOT_FOUND") throw new AppError("Journal entry not found", 404);
  if (result.error === "NOT_POSTED") {
    throw new AppError("Only posted journal entries can be reversed", 409);
  }
  res.status(201).json({ success: true, data: result.reversal });
});
