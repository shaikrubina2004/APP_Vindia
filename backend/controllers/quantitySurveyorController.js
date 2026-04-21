const pool = require("../config/db");

const getQSDashboard = async (req, res) => {
  try {
    // 🔹 Get all updates
    const result = await pool.query(`
      SELECT * FROM qs_daily_updates
      ORDER BY created_at DESC
    `);

    const data = result.rows;

    // 🔹 Stats
    const total = data.length;

    const totalQty = data.reduce(
      (sum, d) => sum + (Number(d.qty) || 0),
      0
    );

    const avgProgress =
      total > 0
        ? Math.round(
            data.reduce((s, d) => s + (Number(d.progress) || 0), 0) / total
          )
        : 0;

    const stats = [
      { label: "Updates", val: total, sub: "records", color: "blue" },
      { label: "Quantity", val: totalQty, sub: "work done", color: "green" },
      { label: "Progress", val: avgProgress + "%", sub: "average", color: "orange" },
    ];

    // 🔹 Recent
    const recent = data.slice(0, 4).map((d) => ({
      id: d.id,
      date: d.date,
      project: d.project,
      activity: d.activity,
      status: d.status || "on-track",
      progress: d.progress || 0,
    }));

    res.json({ stats, recent });

  } catch (err) {
    console.error("QS Dashboard Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getQSDashboard };