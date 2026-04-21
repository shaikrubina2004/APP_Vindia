// backend/models/Progress.js
const pool = require("../config/db");

class Progress {
  // Create progress entry
  static async create(data) {
    const { date, zone, activity, percent_complete, labour_skilled, labour_unskilled, remarks, photos } = data;
    const query = `
      INSERT INTO progress (date, zone, activity, percent_complete, labour_skilled, labour_unskilled, remarks, photos, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
    const values = [date, zone, activity, percent_complete, labour_skilled, labour_unskilled, remarks, JSON.stringify(photos || [])];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get all progress entries with optional filters
  static async getAll(filters = {}) {
    let query = `SELECT * FROM progress ORDER BY created_at DESC`;
    const values = [];
    let conditions = [];

    if (filters.zone) {
      conditions.push(`zone ILIKE $${values.length + 1}`);
      values.push(`%${filters.zone}%`);
    }
    if (filters.date) {
      conditions.push(`date = $${values.length + 1}`);
      values.push(filters.date);
    }
    if (filters.activity) {
      conditions.push(`activity ILIKE $${values.length + 1}`);
      values.push(`%${filters.activity}%`);
    }

    if (conditions.length > 0) {
      query = query.replace('ORDER BY', `WHERE ${conditions.join(' AND ')} ORDER BY`);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get progress by ID
  static async getById(id) {
    const query = `SELECT * FROM progress WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Update progress entry
  static async update(id, data) {
    const { date, zone, activity, percent_complete, labour_skilled, labour_unskilled, remarks, photos } = data;
    const query = `
      UPDATE progress
      SET date = $1, zone = $2, activity = $3, percent_complete = $4, labour_skilled = $5, labour_unskilled = $6, remarks = $7, photos = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;
    const values = [date, zone, activity, percent_complete, labour_skilled, labour_unskilled, remarks, JSON.stringify(photos || []), id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Delete progress entry
  static async delete(id) {
    const query = `DELETE FROM progress WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Progress;