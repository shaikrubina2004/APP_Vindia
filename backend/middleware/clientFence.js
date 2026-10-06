// Client fence.
//
// A client is an EXTERNAL user. 50 of the 80 route files in this backend have no
// role check (payroll, employees, attendance, BOQ, cost reports...), so any valid
// client token could call them. Rather than patching every router, this fence sits
// in front of ALL /api routes and lets a client token reach only what the client
// portal really uses. Tokens of every other role pass straight through untouched,
// and an invalid/missing token is left for each route's own `protect` to reject.
const jwt = require("jsonwebtoken");

const ALLOW = [
  { method: "*",    re: /^\/api\/client(\/|$)/ },                       // the client portal API
  { method: "*",    re: /^\/api\/auth(\/|$)/ },                         // login / session
  { method: "GET",  re: /^\/api\/projects\/?$/ },                       // client ProjectProvider uses this; project controller scopes clients to their own projects
  { method: "POST", re: /^\/api\/settings\/change-password\/?$/ },      // change own password
];

const normaliseRole = (role) =>
  String(role || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

module.exports = function clientFence(req, res, next) {
  if (req.method === "OPTIONS") return next();

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();

  let role;
  try {
    role = normaliseRole(jwt.verify(header.split(" ")[1], process.env.JWT_SECRET).role);
  } catch {
    return next(); // bad token: the route's own auth answers 401
  }
  if (role !== "client") return next();

  const path = req.originalUrl.split("?")[0];
  const allowed = ALLOW.some((r) => (r.method === "*" || r.method === req.method) && r.re.test(path));
  if (allowed) return next();

  return res.status(403).json({
    message: "Client accounts can only use the client portal.",
  });
};
