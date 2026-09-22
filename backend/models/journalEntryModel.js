// ===== FILE: APP_Vindia/backend/models/journalEntryModel.js =====
//
// Implements the Decision 3 workflow:
//   draft -> submitted -> approved -> posted -> reversed (via linked entry)
// Accountant: create, edit (draft only), submit.
// Finance Manager: approve, post, reverse.
// Role enforcement itself lives in the controller (the real security
// boundary); this model enforces the *data* invariants (debit=credit,
// no editing outside draft, no deleting posted entries).

const pool = require("../config/db");

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const JournalEntry = {
  getAll: async (filters = {}) => {
    const values = [];
    let where = "WHERE 1=1";
    if (filters.project_id) {
      values.push(filters.project_id);
      where += ` AND je.project_id = $${values.length}`;
    }
    if (filters.status && filters.status !== "all") {
      values.push(filters.status);
      where += ` AND je.status = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT je.*, p.name AS project_name
       FROM journal_entries je
       LEFT JOIN projects p ON p.id = je.project_id
       ${where}
       ORDER BY je.entry_date DESC, je.id DESC`,
      values
    );
    return result.rows;
  },

  getById: async (id) => {
    const header = await pool.query(
      `SELECT je.*, p.name AS project_name
       FROM journal_entries je
       LEFT JOIN projects p ON p.id = je.project_id
       WHERE je.id = $1`,
      [id]
    );
    if (!header.rows[0]) return null;

    const lines = await pool.query(
      `SELECT jl.*, a.account_code, a.account_name
       FROM journal_entry_lines jl
       JOIN chart_of_accounts a ON a.id = jl.account_id
       WHERE jl.journal_entry_id = $1
       ORDER BY jl.id ASC`,
      [id]
    );

    return { ...header.rows[0], lines: lines.rows };
  },

  // Creates a draft entry with its lines in one transaction.
  // entry_number is generated from journal_entry_number_seq BEFORE the
  // insert, so it is available immediately and the column can carry a
  // real NOT NULL constraint from row creation — no insert-then-backfill
  // step, unlike the earlier id-based approach.
  create: async ({ entry_date, description, project_id, lines, created_by }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const seq = await client.query(`SELECT nextval('journal_entry_number_seq') AS n`);
      const entryNumber = `JE-${String(seq.rows[0].n).padStart(6, "0")}`;

      const totalDebit = (lines || []).reduce((sum, l) => sum + toNumber(l.debit), 0);
      const totalCredit = (lines || []).reduce((sum, l) => sum + toNumber(l.credit), 0);

      const header = await client.query(
        `INSERT INTO journal_entries
           (entry_number, entry_date, description, project_id, status, total_debit, total_credit, created_by)
         VALUES ($1,$2,$3,$4,'draft',$5,$6,$7)
         RETURNING *`,
        [entryNumber, entry_date, description, project_id || null, totalDebit, totalCredit, created_by]
      );
      const entry = header.rows[0];

      const insertedLines = [];
      for (const line of lines || []) {
        const lineResult = await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [entry.id, line.account_id, toNumber(line.debit), toNumber(line.credit), line.description || null]
        );
        insertedLines.push(lineResult.rows[0]);
      }

      await client.query("COMMIT");
      return { ...entry, lines: insertedLines };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // Only draft entries can be edited (enforced here AND in the controller).
  // userId: when ownershipRequired is true, only the entry's own creator
  // may edit it (Decision: journal entries enforce own-draft-only editing,
  // stricter than the rest of the app, flagged explicitly — see manifest).
  updateDraft: async (id, { entry_date, description, project_id, lines }, userId, ownershipRequired = true) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT status, created_by FROM journal_entries WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (!existing.rows[0]) {
        await client.query("ROLLBACK");
        return { error: "NOT_FOUND" };
      }
      if (existing.rows[0].status !== "draft") {
        await client.query("ROLLBACK");
        return { error: "NOT_DRAFT" };
      }
      if (ownershipRequired && existing.rows[0].created_by !== userId) {
        await client.query("ROLLBACK");
        return { error: "NOT_OWNER" };
      }

      const totalDebit = (lines || []).reduce((sum, l) => sum + toNumber(l.debit), 0);
      const totalCredit = (lines || []).reduce((sum, l) => sum + toNumber(l.credit), 0);

      const header = await client.query(
        `UPDATE journal_entries SET
           entry_date = COALESCE($1, entry_date),
           description = COALESCE($2, description),
           project_id = $3,
           total_debit = $4,
           total_credit = $5,
           updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [entry_date, description, project_id || null, totalDebit, totalCredit, id]
      );

      if (Array.isArray(lines)) {
        await client.query(`DELETE FROM journal_entry_lines WHERE journal_entry_id = $1`, [id]);
        for (const line of lines) {
          await client.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
             VALUES ($1,$2,$3,$4,$5)`,
            [id, line.account_id, toNumber(line.debit), toNumber(line.credit), line.description || null]
          );
        }
      }

      await client.query("COMMIT");
      return { entry: header.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // draft -> submitted. Requires debit === credit (Decision 3).
  // Row-locked (SELECT ... FOR UPDATE) to prevent a race between two
  // concurrent requests on the same entry. Own-draft-only, same as
  // updateDraft.
  submit: async (id, userId, ownershipRequired = true) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const entry = await client.query(`SELECT * FROM journal_entries WHERE id = $1 FOR UPDATE`, [id]);
      if (!entry.rows[0]) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" }; }
      if (entry.rows[0].status !== "draft") { await client.query("ROLLBACK"); return { error: "NOT_DRAFT" }; }
      if (ownershipRequired && entry.rows[0].created_by !== userId) {
        await client.query("ROLLBACK"); return { error: "NOT_OWNER" };
      }
      if (toNumber(entry.rows[0].total_debit) !== toNumber(entry.rows[0].total_credit)) {
        await client.query("ROLLBACK"); return { error: "UNBALANCED" };
      }
      const result = await client.query(
        `UPDATE journal_entries
         SET status = 'submitted', submitted_by = $1, submitted_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, id]
      );
      await client.query("COMMIT");
      return { entry: result.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // submitted -> approved (Finance Manager only — enforced in controller).
  // Row-locked to prevent two concurrent approvals of the same entry.
  approve: async (id, userId) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const entry = await client.query(`SELECT * FROM journal_entries WHERE id = $1 FOR UPDATE`, [id]);
      if (!entry.rows[0]) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" }; }
      if (entry.rows[0].status !== "submitted") { await client.query("ROLLBACK"); return { error: "NOT_SUBMITTED" }; }
      if (toNumber(entry.rows[0].total_debit) !== toNumber(entry.rows[0].total_credit)) {
        await client.query("ROLLBACK"); return { error: "UNBALANCED" };
      }
      const result = await client.query(
        `UPDATE journal_entries
         SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, id]
      );
      await client.query("COMMIT");
      return { entry: result.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // approved -> posted (Finance Manager only — enforced in controller).
  // Row-locked — this is the transition most exposed to a double-post race.
  post: async (id, userId) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const entry = await client.query(`SELECT * FROM journal_entries WHERE id = $1 FOR UPDATE`, [id]);
      if (!entry.rows[0]) { await client.query("ROLLBACK"); return { error: "NOT_FOUND" }; }
      if (entry.rows[0].status !== "approved") { await client.query("ROLLBACK"); return { error: "NOT_APPROVED" }; }
      if (toNumber(entry.rows[0].total_debit) !== toNumber(entry.rows[0].total_credit)) {
        await client.query("ROLLBACK"); return { error: "UNBALANCED" };
      }
      const result = await client.query(
        `UPDATE journal_entries
         SET status = 'posted', posted_by = $1, posted_at = NOW(), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, id]
      );
      await client.query("COMMIT");
      return { entry: result.rows[0] };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  // posted -> reversed, via a NEW linked entry with debit/credit swapped.
  // The original is never edited/deleted — only its status flips to
  // 'reversed' as the well-defined side effect of this specific action.
  // Finance Manager only — enforced in controller.
  reverse: async (id, userId) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const original = await client.query(
        `SELECT * FROM journal_entries WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (!original.rows[0]) {
        await client.query("ROLLBACK");
        return { error: "NOT_FOUND" };
      }
      if (original.rows[0].status !== "posted") {
        await client.query("ROLLBACK");
        return { error: "NOT_POSTED" };
      }

      const originalLines = await client.query(
        `SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1`,
        [id]
      );

      const seq = await client.query(`SELECT nextval('journal_entry_number_seq') AS n`);
      const reversalNumber = `JE-${String(seq.rows[0].n).padStart(6, "0")}`;

      const reversalHeader = await client.query(
        `INSERT INTO journal_entries
           (entry_number, entry_date, description, project_id, status, total_debit, total_credit,
            created_by, posted_by, posted_at, reversed_entry_id)
         VALUES ($1, CURRENT_DATE, $2, $3, 'posted', $4, $5, $6, $6, NOW(), $7)
         RETURNING *`,
        [
          reversalNumber,
          `Reversal of ${original.rows[0].entry_number}`,
          original.rows[0].project_id,
          original.rows[0].total_credit, // swapped
          original.rows[0].total_debit,  // swapped
          userId,
          id,
        ]
      );
      const reversal = reversalHeader.rows[0];

      for (const line of originalLines.rows) {
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
           VALUES ($1,$2,$3,$4,$5)`,
          [reversal.id, line.account_id, toNumber(line.credit), toNumber(line.debit), line.description]
        );
      }

      await client.query(
        `UPDATE journal_entries SET status = 'reversed', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      await client.query("COMMIT");
      return { reversal };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = JournalEntry;
