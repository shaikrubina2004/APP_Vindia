const bcrypt = require("bcryptjs");
const pool = require("../config/db");

/* Helper used by other modules (e.g. the escalation job) to read a
   system setting, falling back to a default if the table/row is missing. */
const getSetting = async (key, fallback) => {
  try {
    const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = $1`, [key]);
    return rows.length ? rows[0].value : fallback;
  } catch {
    return fallback;
  }
};
exports.getSetting = getSetting;

/* POST /api/settings/change-password  (any logged-in user) */
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    if (new_password === current_password) {
      return res.status(400).json({ message: "New password must be different from the current one" });
    }

    const { rows } = await pool.query(`SELECT password FROM users WHERE id = $1`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(current_password, rows[0].password);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hash, req.user.id]);
    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("changePassword:", err.message);
    res.status(500).json({ message: "Failed to update password" });
  }
};

/* GET /api/settings/system  (CEO) */
exports.getSystemSettings = async (req, res) => {
  res.json({
    escalation_enabled:    (await getSetting("escalation_enabled", "true")) === "true",
    escalation_grace_days: parseInt(await getSetting("escalation_grace_days", "1"), 10),
  });
};

/* PUT /api/settings/system  (CEO) */
exports.updateSystemSettings = async (req, res) => {
  try {
    const { escalation_enabled, escalation_grace_days } = req.body;
    const days = parseInt(escalation_grace_days, 10);
    if (Number.isNaN(days) || days < 0 || days > 30) {
      return res.status(400).json({ message: "Grace days must be a number between 0 and 30" });
    }
    const upsert = (key, value) =>
      pool.query(
        `INSERT INTO app_settings (key, value, updated_by, updated_at)
         VALUES ($1,$2,$3,NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, String(value), req.user.id]
      );
    await upsert("escalation_enabled", !!escalation_enabled);
    await upsert("escalation_grace_days", days);
    res.json({ message: "Settings saved" });
  } catch (err) {
    console.error("updateSystemSettings:", err.message);
    res.status(500).json({ message: "Failed to save settings" });
  }
};