// ===== FILE: APP_Vindia/backend/controllers/budgetController.js =====
const Budget = require("../models/budgetModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { validateFinanceWbs, projectHasAnyWbs } = require("../utils/financeWbsValidation");

// GET /api/finance/budgets
// Optional query filters: ?project_id=&fiscal_year=&wbs_id=(id|unassigned)
exports.getAllBudgets = asyncHandler(async (req, res) => {
  const { project_id, fiscal_year, wbs_id } = req.query;
  const budgets = await Budget.getAll({ project_id, fiscal_year, wbs_id });
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
// Body: { project_id, category, allocated_amount, fiscal_year, notes?, wbs_id? }
//
// Budget WBS rule (documented per this review's Phase 6):
//   - company-level budget (no project_id): WBS may be NULL, always.
//   - project-specific budget, and that project HAS at least one WBS
//     item defined: WBS is REQUIRED. The whole point of this ERP is
//     Project -> WBS -> financial control, so once a project has a
//     WBS breakdown, every new budget against it must be classified.
//   - project-specific budget, but that project has NO WBS items yet
//     (e.g. a brand-new project, or one that predates the WBS
//     module): WBS stays OPTIONAL — a project that genuinely has no
//     WBS must not be blocked from having a budget at all.
// This is a NEW-record rule only. Historical budgets that already
// have wbs_id = NULL are never retroactively invalidated — nothing
// here touches existing rows.
exports.createBudget = asyncHandler(async (req, res) => {
  const { project_id, category, allocated_amount, fiscal_year, wbs_id } = req.body;
  if (!project_id || !category || allocated_amount == null || !fiscal_year) {
    throw new AppError(
      "project_id, category, allocated_amount and fiscal_year are required",
      400
    );
  }

  const requireWbs = await projectHasAnyWbs(project_id);
  await validateFinanceWbs({ project_id, wbs_id }, { required: requireWbs });

  const budget = await Budget.create({
    ...req.body,
    created_by: req.user.id,
  });
  res.status(201).json({ success: true, data: budget });
});

// PUT /api/finance/budgets/:id
// Body: any of { category, allocated_amount, fiscal_year, notes, wbs_id }
// Same rule as create: only enforced if the caller actually touches
// wbs_id in this request — an update that never mentions wbs_id never
// re-validates or disturbs whatever the budget already had.
exports.updateBudget = asyncHandler(async (req, res) => {
  const existing = await Budget.getById(req.params.id);
  if (!existing) throw new AppError("Budget not found", 404);

  if (Object.prototype.hasOwnProperty.call(req.body, "wbs_id")) {
    const requireWbs = await projectHasAnyWbs(existing.project_id);
    await validateFinanceWbs(
      { project_id: existing.project_id, wbs_id: req.body.wbs_id },
      { required: requireWbs }
    );
  }

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