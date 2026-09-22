// ===== FILE: APP_Vindia/backend/controllers/accountantDashboardController.js =====

const AccountantDashboard = require("../models/accountantDashboardModel");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

/**
 * projectId validation rules:
 *  - missing            -> global view (null)
 *  - empty string ""    -> global view (null)
 *  - digits-only string, leading zeros allowed (e.g. "12", "007") -> parsed
 *    as its integer value, project-filtered view, as long as that value is > 0
 *  - "abc", "0", "000", negative numbers, decimals, anything else -> 400
 */
function parseProjectId(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return { valid: true, projectId: null };
  }

  const trimmed = String(raw).trim();

  // Digits only (leading zeros allowed, e.g. "007" -> 7).
  // Rejects "abc", "1.5", "-3", "1e2", "1 2", etc.
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, projectId: null };
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    // catches "0", "000", or anything overflowing a safe integer
    return { valid: false, projectId: null };
  }

  return { valid: true, projectId: parsed };
}

exports.getDashboard = asyncHandler(async (req, res) => {
  const { projectId: rawProjectId } = req.query;

  const { valid, projectId } = parseProjectId(rawProjectId);

  if (!valid) {
    throw new AppError(
      "Invalid projectId. Must be a positive whole number, or omitted for the global view.",
      400
    );
  }

  const data = await AccountantDashboard.getDashboard(projectId);

  res.json({
    success: true,
    data,
    meta: {
      module: "accountant-dashboard",
      dashboardVersion: data.dashboardVersion || "2.0",
    },
  });
});
