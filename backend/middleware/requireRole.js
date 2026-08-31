exports.requireRole = (...allowedRoles) => (req, res, next) => {
  const role = req.query.role || req.body.role;
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};