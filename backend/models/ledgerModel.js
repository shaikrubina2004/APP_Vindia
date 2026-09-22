// ===== FILE: APP_Vindia/backend/models/ledgerModel.js =====
//
// Decision 2: General Ledger has NO physical table. This is a read-only
// derived query over journal_entries + journal_entry_lines + chart_of_accounts,
// filtered to status = 'posted' only.

const pool = require("../config/db");

const Ledger = {
  getEntries: async (filters = {}) => {
    const values = [];
    let where = "WHERE je.status = 'posted'";

    if (filters.account_id) {
      values.push(filters.account_id);
      where += ` AND jl.account_id = $${values.length}`;
    }
    if (filters.project_id) {
      values.push(filters.project_id);
      where += ` AND je.project_id = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT
         je.entry_date        AS date,
         je.entry_number,
         je.description        AS entry_description,
         je.project_id,
         p.name                AS project_name,
         a.id                  AS account_id,
         a.account_code,
         a.account_name,
         jl.debit,
         jl.credit,
         jl.description         AS line_description
       FROM journal_entry_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN chart_of_accounts a ON a.id = jl.account_id
       LEFT JOIN projects p ON p.id = je.project_id
       ${where}
       ORDER BY a.account_code ASC, je.entry_date ASC, je.id ASC`,
      values
    );

    // Running balance is computed per account, in date order — standard
    // ledger presentation (debit increases, credit decreases, for a
    // simple net view; sign convention can be refined per account_type
    // later if needed, flagged as a simplification for now).
    const balances = {};
    const rows = result.rows.map((row) => {
      const key = row.account_id;
      const prev = balances[key] || 0;
      const running = prev + Number(row.debit) - Number(row.credit);
      balances[key] = running;
      return { ...row, runningBalance: running };
    });

    return rows;
  },

  getTrialBalance: async (filters = {}) => {
    // Previous query put `je.status = 'posted'` in the ON clause of a
    // LEFT JOIN to journal_entries. With a LEFT JOIN, a non-matching
    // condition only nulls out je's columns — it does NOT remove the
    // already-joined journal_entry_lines row. So jl.debit/jl.credit for
    // draft/submitted/approved/reversed lines were still being summed,
    // just with je.* showing NULL alongside them. The status filter was
    // therefore a no-op for exclusion purposes.
    //
    // Fixed by pre-filtering journal_entry_lines to posted-only entries
    // in a subquery (INNER JOIN + WHERE there correctly excludes
    // non-posted lines before any SUM happens), then LEFT JOINing that
    // already-filtered set onto chart_of_accounts — so accounts with
    // zero posted activity still appear with total_debit/total_credit
    // of 0, same as before.
    const result = await pool.query(
      `SELECT
         a.id AS account_id,
         a.account_code,
         a.account_name,
         a.account_type,
         COALESCE(SUM(jl.debit),0)  AS total_debit,
         COALESCE(SUM(jl.credit),0) AS total_credit
       FROM chart_of_accounts a
       LEFT JOIN (
         SELECT jel.account_id, jel.debit, jel.credit
         FROM journal_entry_lines jel
         JOIN journal_entries je ON je.id = jel.journal_entry_id
         WHERE je.status = 'posted'
       ) jl ON jl.account_id = a.id
       GROUP BY a.id, a.account_code, a.account_name, a.account_type
       ORDER BY a.account_code ASC`
    );
    return result.rows;
  },
};

module.exports = Ledger;
