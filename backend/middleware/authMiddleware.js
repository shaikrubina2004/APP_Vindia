const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("HEADER:", authHeader); // 👈 ADD HERE

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
module.exports = protect;