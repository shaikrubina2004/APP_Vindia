// backend/routes/travelExpenseRoutes.js
const express = require("express");
const auth = require("../middleware/authMiddleware");
const {
  createRequest,
  getRequests,
  getRequestById,
  updateStatus,
  pmUpdateStatus,
  getManualExpenses,
  saveManualExpenses,
  getFinanceClaims,
  markFinancePaid,
} = require("../controllers/travelExpenseController");

const router = express.Router();

// Every travel-expense route now requires a valid login token. Who may do
// what (own requests only, HR/CEO review, manual expenses) is enforced inside
// the controller using the logged-in user's role.
router.use(auth);

router.post("/",              createRequest);
router.get("/",               getRequests);

// Finance queue (approved travel claims). MUST stay above "/:id" or Express
// would treat the word "finance" as a request id.
router.get("/finance/claims", getFinanceClaims);
router.get("/:id",            getRequestById);
router.put("/:id/status",     updateStatus);
router.put("/:id/pm-status",  pmUpdateStatus);

// Finance Manager marks an approved claim as paid.
router.put("/:id/finance-status", markFinancePaid);

// Manual expense entry by HR / CEO (company-pays requests)
// Stored as JSONB on the request row — no extra table needed.
// Run once in your DB:  ALTER TABLE travel_expense_requests ADD COLUMN IF NOT EXISTS manual_expenses JSONB DEFAULT '[]';
router.get("/:id/manual-expenses", getManualExpenses);
router.put("/:id/manual-expenses", saveManualExpenses);

module.exports = router;
/* ─────────────────────────────────────────────────────────────────────────────
   In your server.js, add:

   const travelExpenseRoutes = require("./routes/travelExpenseRoutes");
   app.use("/api/travel-expenses", travelExpenseRoutes);
───────────────────────────────────────────────────────────────────────────── */