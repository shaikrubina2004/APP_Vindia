const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

const normalizedRole = String(decoded.role || "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "_");

req.user = {
  ...decoded,
  role: normalizedRole,
};

next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);

    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Insufficient role.",
      });
    }

    next();
  };

module.exports = protect;
module.exports.protect = protect;
module.exports.requireRole = requireRole;