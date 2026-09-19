// ===== FILE: APP_Vindia/backend/controllers/pcPaymentController.js =====
//
// Read-only payment view for the Project Coordinator.
//
// The PC does NOT get access to /api/finance/* — those routes are restricted
// to accountant / finance_manager / ceo, and they also expose outgoing vendor
// payments which a coordinator has no business seeing.
//
// Instead this controller reads the SAME finance tables (invoices + payments)
// that the Accountant writes to, filters them down to:
//   • only projects where this user is the assigned coordinator
//   • only client receivables (incoming money), never vendor payouts
// and reshapes them into exactly what the PC Payment page renders.

const pool = require("../config/db");

/* Infer a human payment type from the invoice notes.
   The finance `invoices` table has no type column, so we derive a label
   from whatever the Accountant wrote. Falls back to "Invoice". */
const deriveType = (notes = "") => {
  const n = String(notes || "").toLowerCase();
  if (n.includes("advance") || n.includes("mobilisation") || n.includes("mobilization")) return "Advance";
  if (n.includes("retention") || n.includes("retainer")) return "Retention";
  const m = n.match(/milestone\s*(\d+)/);
  if (m) return `Milestone ${m[1]}`;
  if (n.includes("milestone")) return "Milestone";
  if (n.includes("final")) return "Final";
  return "Invoice";
};

/* First line of the notes doubles as the milestone name. */
const deriveMilestone = (notes, invoiceNumber) => {
  const first = String(notes || "").split("\n")[0].trim();
  return first || invoiceNumber || "—";
};

const toStatus = (amount, paidAmount, dueDate) => {
  const total = Number(amount || 0);
  const paid = Number(paidAmount || 0);
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  if (dueDate && new Date(dueDate) < new Date(new Date().toDateString())) return "overdue";
  return "pending";
};

/* GET /api/pc/payments
   Optional: ?project_id=
   Returns every project this coordinator owns, with its receivables. */
exports.getCoordinatorPayments = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { project_id } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // 1. Projects assigned to this coordinator.
    const params = [userId];
    let projectFilter = "WHERE p.coordinator_id = $1";
    if (project_id) {
      params.push(project_id);
      projectFilter += ` AND p.id = $${params.length}`;
    }

    const projectsResult = await pool.query(
      `SELECT p.id, p.name, p.client, p.budget, p.start_date, p.end_date
       FROM projects p
       ${projectFilter}
       ORDER BY p.id`,
      params
    );

    const projects = projectsResult.rows;
    if (!projects.length) {
      return res.json({ success: true, data: [] });
    }

    const projectIds = projects.map((p) => p.id);

    // 2. Invoices for those projects, with how much has actually been
    //    collected against each one (completed incoming payments only).
    const invoicesResult = await pool.query(
      `SELECT
         i.id,
         i.project_id,
         i.invoice_number,
         i.client_name,
         i.amount,
         i.tax_amount,
         i.status,
         i.issue_date,
         i.due_date,
         i.paid_date,
         i.notes,
         COALESCE(paid.total, 0)      AS paid_amount,
         paid.last_payment_date       AS last_payment_date,
         paid.last_method             AS last_method,
         paid.last_notes              AS last_notes
       FROM invoices i
       LEFT JOIN LATERAL (
         SELECT
           SUM(pay.amount) AS total,
           MAX(pay.payment_date) AS last_payment_date,
           (ARRAY_AGG(pay.payment_method ORDER BY pay.payment_date DESC NULLS LAST))[1] AS last_method,
           (ARRAY_AGG(pay.notes          ORDER BY pay.payment_date DESC NULLS LAST))[1] AS last_notes
         FROM payments pay
         WHERE pay.invoice_id = i.id
           AND pay.payment_type = 'incoming'
           AND pay.status = 'completed'
       ) paid ON TRUE
       WHERE i.project_id = ANY($1::int[])
       ORDER BY i.due_date NULLS LAST, i.id`,
      [projectIds]
    );

    // 3. Reshape into the structure the PC Payment page expects.
    const byProject = new Map(projectIds.map((id) => [id, []]));

    for (const inv of invoicesResult.rows) {
      const amount = Number(inv.amount || 0) + Number(inv.tax_amount || 0);
      const paidAmount = Number(inv.paid_amount || 0);

      // Trust an explicit "paid" from Finance, otherwise compute it.
      const status =
        inv.status === "paid"
          ? "paid"
          : inv.status === "cancelled"
            ? "cancelled"
            : toStatus(amount, paidAmount, inv.due_date);

      byProject.get(inv.project_id)?.push({
        id: inv.id,
        invoiceNo: inv.invoice_number,
        milestone: deriveMilestone(inv.notes, inv.invoice_number),
        type: deriveType(inv.notes),
        amount,
        paidAmount,
        dueDate: inv.due_date,
        issueDate: inv.issue_date,
        paidOn: inv.paid_date || inv.last_payment_date || null,
        status,
        method: inv.last_method || "—",
        remarks: inv.last_notes || inv.notes || "",
      });
    }

    const data = projects.map((p) => ({
      id: p.id,
      name: p.name,
      client: p.client,
      contractValue: Number(p.budget || 0),
      targetProfit: 35, // no column in projects yet — display-only figure
      startDate: p.start_date,
      deadline: p.end_date,
      payments: byProject.get(p.id) || [],
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("PC PAYMENTS ERROR:", err.message);
    res.status(500).json({ success: false, error: "Failed to load payments" });
  }
};

/* GET /api/pc/payments/:invoiceId/transactions
   Individual payment lines behind one invoice — used by the expanded card. */
exports.getInvoiceTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;
    const invoiceId = Number(req.params.invoiceId);

    if (!Number.isInteger(invoiceId)) {
      return res.status(400).json({ success: false, error: "Invalid invoice id" });
    }

    // Ownership check — the coordinator may only open invoices on their projects.
    const owns = await pool.query(
      `SELECT 1 FROM invoices i
       JOIN projects p ON p.id = i.project_id
       WHERE i.id = $1 AND p.coordinator_id = $2`,
      [invoiceId, userId]
    );
    if (!owns.rows.length) {
      return res.status(403).json({ success: false, error: "Not your project" });
    }

    const result = await pool.query(
      `SELECT id, amount, payment_method, reference_number, status, payment_date, notes
       FROM payments
       WHERE invoice_id = $1 AND payment_type = 'incoming'
       ORDER BY payment_date DESC, id DESC`,
      [invoiceId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("PC INVOICE TRANSACTIONS ERROR:", err.message);
    res.status(500).json({ success: false, error: "Failed to load transactions" });
  }
};