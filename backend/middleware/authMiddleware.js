const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("HEADER:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // ── Debug: check if JWT_SECRET is loaded ──
    console.log("JWT_SECRET loaded?", !!process.env.JWT_SECRET);
    console.log("JWT_SECRET value:", process.env.JWT_SECRET);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("✅ DECODED:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT ERROR:", err.message);
    return res
      .status(401)
      .json({ message: "Invalid token", detail: err.message });
  }
};

// ── Role guard — use after protect ────────────────────────────────────────
// Usage: router.use(requireRole("client"))
//        router.use(requireRole("admin", "ceo"))
// Normalizes "Finance Manager" and "finance_manager" (and any casing/spacing
// variant) to the same key, so role checks work regardless of how the role
// was stored/cased when the JWT was issued.
const normalizeRole = (r) =>
  String(r || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const userRole = normalizeRole(req.user.role);
    const allowed = roles.map(normalizeRole);
    if (!allowed.includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Access denied. Insufficient role." });
    }
    next();
  };

// ── Export both ───────────────────────────────────────────────────────────
// clientRoutes.js uses:  const protect = require("../middleware/authMiddleware");
// Other routes that need requireRole use:
//   const { protect, requireRole } = require("../middleware/authMiddleware");
//
// Both work because protect is the default AND named export.
module.exports = protect;
module.exports.protect = protect;
module.exports.requireRole = requireRole;
