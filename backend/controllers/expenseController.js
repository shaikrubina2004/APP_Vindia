// ===== FILE: APP_Vindia/backend/controllers/expenseController.js =====
const Expense = require("../models/expenseModel");
const Budget = require("../models/budgetModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/expenses?project_id=&expense_type=&category=&status=
exports.getAllExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.getAll(req.query);
  res.json({ success: true, data: expenses });
});

// GET /api/finance/expenses/summary?projectId=
exports.getExpenseSummary = asyncHandler(async (req, res) => {
  const summary = await Expense.getSummary(req.query.projectId);
  res.json({ success: true, data: summary });
});

// GET /api/finance/expenses/:id
exports.getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.getById(req.params.id);
  if (!expense) throw new AppError("Expense not found", 404);
  res.json({ success: true, data: expense });
});

// POST /api/finance/expenses
exports.createExpense = asyncHandler(async (req, res) => {
  const { category, amount } = req.body;
  if (!category || amount === undefined) {
    throw new AppError("category and amount are required", 400);
  }
  const expense = await Expense.create({ ...req.body, created_by: req.user.id });

  // Keep the matching budget's spent_amount in sync (only meaningful for project expenses)
  if (expense.project_id && expense.category) {
    await Budget.recalcSpent(expense.project_id, expense.category);
  }
  res.status(201).json({ success: true, data: expense });
});

// PUT /api/finance/expenses/:id
exports.updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.update(req.params.id, req.body);
  if (!expense) throw new AppError("Expense not found", 404);

  if (expense.project_id && expense.category) {
    await Budget.recalcSpent(expense.project_id, expense.category);
  }
  res.json({ success: true, data: expense });
});

// DELETE /api/finance/expenses/:id
exports.deleteExpense = asyncHandler(async (req, res) => {
  const existing = await Expense.getById(req.params.id);
  if (!existing) throw new AppError("Expense not found", 404);

  await Expense.delete(req.params.id);

  if (existing.project_id && existing.category) {
    await Budget.recalcSpent(existing.project_id, existing.category);
  }
  res.json({ success: true, message: "Expense deleted" });
});