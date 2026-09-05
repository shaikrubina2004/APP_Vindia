// ===== FILE: APP_Vindia/backend/controllers/budgetController.js =====
const Budget = require("../models/budgetModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/budgets
// Optional query filters: ?project_id=&fiscal_year=
exports.getAllBudgets = asyncHandler(async (req, res) => {
  const { project_id, fiscal_year } = req.query;
  const budgets = await Budget.getAll({ project_id, fiscal_year });
  res.json({ success: true, data: budgets });
});

// GET /api/finance/budgets/project/:projectId
exports.getBudgetsByProject = asyncHandler(async (req, res) => {
  const budgets = await Budget.getByProject(req.params.projectId);
  res.json({ success: true, data: budgets });
});

// GET /api/finance/budgets/:id
exports.getBudgetById = asyncHandler(async (req, res) => {
  const budget = await Budget.getById(req.params.id);
  if (!budget) throw new AppError("Budget not found", 404);
  res.json({ success: true, data: budget });
});

// POST /api/finance/budgets
// Body: { project_id, category, allocated_amount, fiscal_year, notes? }
exports.createBudget = asyncHandler(async (req, res) => {
  const { project_id, category, allocated_amount, fiscal_year } = req.body;
  if (!project_id || !category || allocated_amount == null || !fiscal_year) {
    throw new AppError(
      "project_id, category, allocated_amount and fiscal_year are required",
      400
    );
  }

  const budget = await Budget.create({
    ...req.body,
    created_by: req.user.id,
  });
  res.status(201).json({ success: true, data: budget });
});

// PUT /api/finance/budgets/:id
// Body: any of { category, allocated_amount, fiscal_year, notes }
exports.updateBudget = asyncHandler(async (req, res) => {
  const existing = await Budget.getById(req.params.id);
  if (!existing) throw new AppError("Budget not found", 404);

  const budget = await Budget.update(req.params.id, req.body);
  res.json({ success: true, data: budget });
});

// DELETE /api/finance/budgets/:id
exports.deleteBudget = asyncHandler(async (req, res) => {
  const existing = await Budget.getById(req.params.id);
  if (!existing) throw new AppError("Budget not found", 404);

  await Budget.remove(req.params.id);
  res.json({ success: true, message: "Budget deleted" });
});