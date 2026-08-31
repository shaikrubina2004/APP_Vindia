// ===== FILE: APP_Vindia/backend/controllers/vendorController.js =====
const Vendor = require("../models/vendorModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/vendors?status=&search=
exports.getAllVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.getAll(req.query);
  res.json({ success: true, data: vendors });
});

// GET /api/finance/vendors/metrics
exports.getVendorMetrics = asyncHandler(async (req, res) => {
  const metrics = await Vendor.getMetrics();
  res.json({ success: true, data: metrics });
});

// GET /api/finance/vendors/:id
exports.getVendorById = asyncHandler(async (req, res) => {
  const vendor = await Vendor.getById(req.params.id);
  if (!vendor) throw new AppError("Vendor not found", 404);
  res.json({ success: true, data: vendor });
});

// POST /api/finance/vendors
exports.createVendor = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new AppError("name is required", 400);
  const vendor = await Vendor.create(req.body);
  res.status(201).json({ success: true, data: vendor });
});

// PUT /api/finance/vendors/:id
exports.updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.update(req.params.id, req.body);
  if (!vendor) throw new AppError("Vendor not found", 404);
  res.json({ success: true, data: vendor });
});

// PATCH /api/finance/vendors/:id/toggle-status
exports.toggleVendorStatus = asyncHandler(async (req, res) => {
  const vendor = await Vendor.toggleStatus(req.params.id);
  if (!vendor) throw new AppError("Vendor not found", 404);
  res.json({ success: true, data: vendor });
});

// DELETE /api/finance/vendors/:id
exports.deleteVendor = asyncHandler(async (req, res) => {
  await Vendor.remove(req.params.id);
  res.json({ success: true, message: "Vendor deleted" });
});