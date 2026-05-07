// FILE PATH: backend/utils/createSENotification.js
// ─────────────────────────────────────────────────────────────────────────────
// Call this from ANY route (drawings, BOQ, RFI, incidents, etc.) whenever
// another role does something the Structural Engineer should know about.
//
// Usage:
//   const notify = require("../utils/createSENotification");
//   await notify({ type: "drawing", severity: "warn", title: "...", description: "..." });
// ─────────────────────────────────────────────────────────────────────────────


/**
 * @param {Object} opts
 * @param {"drawing"|"rfi"|"incident"|"approval"|"work"|"boq"|"task"|"handover"|"analysis"} opts.type
 * @param {"critical"|"warn"|"info"|"ok"} opts.severity
 * @param {string} opts.title   – short headline shown in bell list
 * @param {string} opts.description – longer detail line
 */

const pool = require("../config/db");

async function createSENotification({
  message,
  type = "work",
  severity = "info",
  description = "",
  link = "/structural-engineer/dashboard",
}) {
  try {
    await pool.query(
      `
      INSERT INTO notifications
      (
        message,
        description,
        type,
        role,
        severity,
        is_read,
        created_at,
        link
      )
      VALUES ($1,$2,$3,$4,$5,false,NOW(),$6)
      `,
      [
        message,
        description,
        type,
        "structural_engineer",
        severity,
        link,
      ]
    );

    console.log(
      "✅ SE notification created:",
      message
    );

  } catch (err) {
    console.error(
      "SE notification insert error:",
      err.message
    );
  }
}

module.exports = createSENotification;
// async function createSENotification({ type, severity = "info", title, description }) {
//   try {
//     await pool.query(
//       `INSERT INTO notifications (role, type, severity, message, description, is_read, created_at)
//        VALUES ('structural_engineer', $1, $2, $3, $4, false, NOW())`,
//       [type, severity, title, description || title]
//     );
//   } catch (err) {
//     // Never let notification failures crash the main request
//     console.error("⚠️ createSENotification failed:", err.message);
//   }
// }

// module.exports = createSENotification;