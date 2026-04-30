// FILE PATH: backend/utils/createSENotification.js
// ─────────────────────────────────────────────────────────────────────────────
// Call this from ANY route (drawings, BOQ, RFI, incidents, etc.) whenever
// another role does something the Structural Engineer should know about.
//
// Usage:
//   const notify = require("../utils/createSENotification");
//   await notify({ type: "drawing", severity: "warn", title: "...", description: "..." });
// ─────────────────────────────────────────────────────────────────────────────

const pool = require("../config/db");

/**
 * @param {Object} opts
 * @param {"drawing"|"rfi"|"incident"|"approval"|"work"|"boq"|"task"|"handover"|"analysis"} opts.type
 * @param {"critical"|"warn"|"info"|"ok"} opts.severity
 * @param {string} opts.title   – short headline shown in bell list
 * @param {string} opts.description – longer detail line
 */
async function createSENotification({ type, severity = "info", title, description }) {
  try {
    await pool.query(
      `INSERT INTO notifications (role, type, severity, message, description, is_read, created_at)
       VALUES ('structural_engineer', $1, $2, $3, $4, false, NOW())`,
      [type, severity, title, description || title]
    );
  } catch (err) {
    // Never let notification failures crash the main request
    console.error("⚠️ createSENotification failed:", err.message);
  }
}

module.exports = createSENotification;