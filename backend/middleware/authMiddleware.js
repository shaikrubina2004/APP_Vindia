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
    console.error("❌ JWT ERROR:", err.message); // tells us exact reason
    return res.status(401).json({ message: "Invalid token", detail: err.message });
  }
};

module.exports = protect;