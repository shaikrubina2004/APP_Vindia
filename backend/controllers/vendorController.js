// ===== FILE: APP_Vindia/backend/controllers/vendorController.js =====
const Vendor = require("../models/vendorModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

// GET /api/finance/vendors
// Optional query filters: ?status=&search=
exports.getAllVendors = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const vendors = await Vendor.getAll({ status, search });
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
// Body: { name, category, payment_terms?, rating?, contact_email?, contact_phone? }
exports.createVendor = asyncHandler(async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) {
    throw new AppError("name and category are required", 400);
  }

  const vendor = await Vendor.create(req.body);
  res.status(201).json({ success: true, data: vendor });
});

// PUT /api/finance/vendors/:id
// Body: any of { name, category, payment_terms, rating, contact_email, contact_phone }
exports.updateVendor = asyncHandler(async (req, res) => {
  const existing = await Vendor.getById(req.params.id);
  if (!existing) throw new AppError("Vendor not found", 404);

  const vendor = await Vendor.update(req.params.id, req.body);
  res.json({ success: true, data: vendor });
});

// PATCH /api/finance/vendors/:id/toggle-status
exports.toggleVendorStatus = asyncHandler(async (req, res) => {
  const existing = await Vendor.getById(req.params.id);
  if (!existing) throw new AppError("Vendor not found", 404);

  const vendor = await Vendor.toggleStatus(req.params.id);
  res.json({ success: true, data: vendor });
});

// DELETE /api/finance/vendors/:id
exports.deleteVendor = asyncHandler(async (req, res) => {
  const existing = await Vendor.getById(req.params.id);
  if (!existing) throw new AppError("Vendor not found", 404);

  await Vendor.remove(req.params.id);
  res.json({ success: true, message: "Vendor deleted" });
});