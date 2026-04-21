// backend/models/Dashboard.js
const pool = require("../config/db");

class Dashboard {
  // Get RFI summary
  static async getRFISummary() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
        COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_count
      FROM rfi
    `;
    const result = await pool.query(query);
    return result.rows[0] || { total: 0, open_count: 0, critical_count: 0 };
  }

  // Get NCR summary
  static async getNCRSummary() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
        COUNT(CASE WHEN "holdPlaced" = true THEN 1 END) as hold_count
      FROM ncr
    `;
    const result = await pool.query(query);
    return result.rows[0] || { total: 0, open_count: 0, hold_count: 0 };
  }

  // Get recent RFIs and NCRs for activity log
  static async getRecentActivity(limit = 10) {
    const query = `
      SELECT 'RFI' as type, id, title as label, priority, status, created_at 
      FROM rfi 
      UNION ALL 
      SELECT 'NCR' as type, id, description as label, priority, status, created_at 
      FROM ncr 
      ORDER BY created_at DESC 
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Get labour count
  static async getLabourToday() {
    const query = `
      SELECT COUNT(DISTINCT employee_id) as total_workers
      FROM attendance
      WHERE DATE(date) = CURRENT_DATE AND status = 'present'
    `;
    const result = await pool.query(query);
    return result.rows[0]?.total_workers || 0;
  }

  // Get zone progress (from progress table)
  static async getZoneProgress() {
    const query = `
      SELECT 
        zone,
        COUNT(*) as entries,
        AVG(percent_complete) as avg_completion,
        MAX(updated_at) as last_updated
      FROM progress
      WHERE DATE(date) >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY zone
      ORDER BY zone
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Get week progress percentage
  static async getWeekProgress() {
    const query = `
      SELECT AVG(percent_complete) as weekly_avg
      FROM progress
      WHERE DATE(date) >= CURRENT_DATE - INTERVAL '7 days'
    `;
    const result = await pool.query(query);
    return Math.round(result.rows[0]?.weekly_avg || 0);
  }
}

module.exports = Dashboard;