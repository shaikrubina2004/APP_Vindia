// ===== FILE: APP_Vindia/backend/controllers/expenseController.js =====
const Expense = require("../models/expenseModel");
const Budget = require("../models/budgetModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/expenses
// Optional query filters: ?project_id=&expense_type=&category=&status=
exports.getAllExpenses = asyncHandler(async (req, res) => {
  const { project_id, expense_type, category, status } = req.query;
  const expenses = await Expense.getAll({ project_id, expense_type, category, status });
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
//         payment_method?, status?, receipt_url?, expense_type? }
exports.createExpense = asyncHandler(async (req, res) => {
  const { project_id, category, amount } = req.body;
  if (!project_id || !category || amount == null) {
    throw new AppError("project_id, category and amount are required", 400);
  }

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
//                 payment_method, status, receipt_url }
exports.updateExpense = asyncHandler(async (req, res) => {
  const existing = await Expense.getById(req.params.id);
  if (!existing) throw new AppError("Expense not found", 404);

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