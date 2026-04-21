const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    console.log("---- AUTH DEBUG ----"); // ✅ ADD HERE

    const authHeader = req.headers.authorization;
    console.log("HEADER:", authHeader); // ✅ ADD HERE

    console.log("SECRET:", process.env.JWT_SECRET); // ✅ ADD HERE

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("DECODED:", decoded); // ✅ ADD HERE

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.log("JWT ERROR:", error.message); // ✅ ADD HERE

    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

module.exports = authMiddleware;
