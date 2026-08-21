// ===== FILE: APP_Vindia/backend/middleware/validation.js =====
const { AppError } = require("./errorHandler");

const validateBody = (requiredFields = []) => (req, res, next) => {
  const missing = requiredFields.filter(
    (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ""
  );
  if (missing.length > 0) {
    return next(new AppError(`Missing required field(s): ${missing.join(", ")}`, 400));
  }
  next();
};

const validateIdParam = (paramName = "id") => (req, res, next) => {
  const value = req.params[paramName];
  if (!/^\d+$/.test(value)) {
    return next(new AppError(`Invalid ${paramName} — must be a numeric id`, 400));
  }
  next();
};

module.exports = { validateBody, validateIdParam };