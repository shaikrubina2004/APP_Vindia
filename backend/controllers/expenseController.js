// ===== FILE: APP_Vindia/backend/controllers/expenseController.js =====
const Expense = require("../models/expenseModel");
const Budget = require("../models/budgetModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { validateFinanceWbs, assertWbsUnchanged } = require("../utils/financeWbsValidation");

// Once an expense has moved past pending, its WBS classification
// becomes part of the accounting record and must not silently move
// (Section 9 / 22.8).
const WBS_LOCKED_STATUSES = ["approved", "paid"];

// GET /api/finance/expenses
// Optional query filters: ?project_id=&expense_type=&category=&status=

// Statuses an accountant is allowed to set directly. 'approved'/'paid'
// represent Finance Manager's approval action per financePermissions.js
// (Accountant: view/create/edit/verify — not approve). This restriction
// applies only to the 'accountant' role; finance_manager/ceo are
// completely unaffected, so Finance Manager's existing behavior does
// not change.
const ACCOUNTANT_ALLOWED_STATUSES = ["pending"];

function blockPrivilegedStatusForAccountant(req) {
  if (req.user?.role !== "accountant") return null;
  if (req.body.status && !ACCOUNTANT_ALLOWED_STATUSES.includes(req.body.status)) {
    return new AppError(
      `Accountant cannot set expense status to '${req.body.status}'. Only Finance Manager can approve or mark expenses paid.`,
      403
    );
  }
  return null;
}

exports.getAllExpenses = asyncHandler(async (req, res) => {
  const { project_id, expense_type, category, status, wbs_id } = req.query;
  const expenses = await Expense.getAll({ project_id, expense_type, category, status, wbs_id });
  res.json({ success: true, data: expenses });
});

// GET /api/finance/expenses/summary
// Optional query filter: ?project_id=
exports.getExpenseSummary = asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  const summary = await Expense.getSummary(project_id);
  res.json({ success: true, data: summary });
});

// GET /api/finance/expenses/:id
exports.getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.getById(req.params.id);
  if (!expense) throw new AppError("Expense not found", 404);
  res.json({ success: true, data: expense });
});

// POST /api/finance/expenses
// Body: { project_id, category, description, amount, vendor_id?, expense_date?,
//         payment_method?, status?, receipt_url?, expense_type?, wbs_id? }
exports.createExpense = asyncHandler(async (req, res) => {
  const { project_id, category, amount, wbs_id } = req.body;
  if (!project_id || !category || amount == null) {
    throw new AppError("project_id, category and amount are required", 400);
  }

  // Backend is the authority on the WBS relationship — never trust the
  // frontend to have already matched wbs_id to project_id.
  await validateFinanceWbs({ project_id, wbs_id }, { required: true });

  const expense = await Expense.create({
    ...req.body,
    created_by: req.user.id,
  });

  // Keep the matching budget's spent_amount in sync
  await Budget.recalcSpent(expense.project_id, expense.category);

  res.status(201).json({ success: true, data: expense });
});

// PUT /api/finance/expenses/:id
// Body: any of { category, description, amount, vendor_id, expense_date,
//                 payment_method, status, receipt_url, wbs_id }
exports.updateExpense = asyncHandler(async (req, res) => {
  // Authorization checked BEFORE any DB round-trip — fail fast, and
  // don't leak whether the record exists to a caller who isn't even
  // allowed to perform this particular change.
  const statusError = blockPrivilegedStatusForAccountant(req);
  if (statusError) throw statusError;

  const existing = await Expense.getById(req.params.id);
  if (!existing) throw new AppError("Expense not found", 404);

  if (WBS_LOCKED_STATUSES.includes(String(existing.status || "").toLowerCase())) {
    assertWbsUnchanged(existing.wbs_id, req.body.wbs_id, "expense");
  } else if (Object.prototype.hasOwnProperty.call(req.body, "wbs_id")) {
    const projectId = req.body.project_id ?? existing.project_id;
    await validateFinanceWbs({ project_id: projectId, wbs_id: req.body.wbs_id }, { required: true });
  }

  const expense = await Expense.update(req.params.id, req.body);

  // Recalc the new category's budget, and the old one too if it changed
  await Budget.recalcSpent(expense.project_id, expense.category);
  if (existing.category !== expense.category) {
    await Budget.recalcSpent(existing.project_id, existing.category);
  }

  res.json({ success: true, data: expense });
});

// DELETE /api/finance/expenses/:id
exports.deleteExpense = asyncHandler(async (req, res) => {
  const existing = await Expense.getById(req.params.id);
  if (!existing) throw new AppError("Expense not found", 404);

  await Expense.delete(req.params.id);
  await Budget.recalcSpent(existing.project_id, existing.category);

  res.json({ success: true, message: "Expense deleted" });
});