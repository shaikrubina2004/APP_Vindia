require("dotenv").config();
const pool = require("../config/db");
const { ensureLeadAssignmentSchema } = require("../utils/leadAssignment");

ensureLeadAssignmentSchema()
  .then(() => pool.end())
  .catch((e) => { console.error(e); process.exit(1); });