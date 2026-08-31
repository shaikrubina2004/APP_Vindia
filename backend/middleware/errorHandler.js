// ===== FILE: APP_Vindia/backend/middleware/errorHandler.js =====

// Wrap async route handlers so thrown errors reach errorHandler
// Usage: router.get('/', asyncHandler(async (req, res) => {...}))
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Custom error class so controllers can throw with a specific status code
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Express error-handling middleware — must have 4 args
// Mount this LAST in server.js, after all routes
const errorHandler = (err, req, res, next) => {
  console.error("❌ ERROR:", err.message);

  // Postgres unique_violation
  if (err.code === "23505") {
    return res.status(409).json({ success: false, message: "Duplicate entry", detail: err.detail });
  }
  // Postgres foreign_key_violation
  if (err.code === "23503") {
    return res.status(400).json({ success: false, message: "Invalid reference (foreign key)", detail: err.detail });
  }
  // Postgres check_violation (e.g. bad enum/status value)
  if (err.code === "23514") {
    return res.status(400).json({ success: false, message: "Invalid value provided", detail: err.detail });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = { asyncHandler, AppError, errorHandler };