// /**
//  * incidentAuth.js
//  * ───────────────
//  * Lightweight JWT middleware used by incidentRoutes.
//  * Reads the token from the Authorization header (Bearer <token>),
//  * verifies it, and sets req.user = { id, ... } so controllers
//  * can scope queries to the logged-in user.
//  *
//  * This is intentionally self-contained — it does NOT depend on
//  * any other middleware file in the project.
//  *
//  * If your JWT_SECRET env variable is named differently, change
//  * the one line marked ← CHANGE THIS if needed.
//  */

// const jwt = require("jsonwebtoken");

// module.exports = function incidentAuth(req, res, next) {
//   try {
//     const header = req.headers["authorization"] || req.headers["Authorization"];

//     if (!header || !header.startsWith("Bearer ")) {
//       return res
//         .status(401)
//         .json({ success: false, message: "No token provided" });
//     }

//     const token = header.slice(7); // remove "Bearer "

//     // ← CHANGE THIS if your env variable is named differently
//     //   e.g. process.env.JWT_SECRET_KEY  or  process.env.SECRET
//     const secret =
//       process.env.JWT_SECRET ||
//       process.env.JWT_SECRET_KEY ||
//       process.env.SECRET;

//     if (!secret) {
//       console.error("incidentAuth: JWT secret env variable not set!");
//       return res
//         .status(500)
//         .json({ success: false, message: "Server configuration error" });
//     }

//     const decoded = jwt.verify(token, secret);

//     // Normalise — different projects put the user id in different fields.
//     // We try all common shapes and always end up with req.user.id as a number.
//     const rawId =
//       decoded.id ?? decoded.userId ?? decoded.user_id ?? decoded.sub ?? null;

//     req.user = {
//       ...decoded,
//       id: rawId !== null ? Number(rawId) : null,
//     };

//     // Debug — remove after confirming it works
//     console.log("[incidentAuth] decoded userId =", req.user.id);

//     next();
//   } catch (err) {
//     console.error("[incidentAuth] token error:", err.message);
//     return res
//       .status(401)
//       .json({ success: false, message: "Invalid or expired token" });
//   }
// };
