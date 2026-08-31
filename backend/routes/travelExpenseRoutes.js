// backend/routes/travelExpenseRoutes.js
const express = require("express");
const {
  createRequest,
  getRequests,
  getRequestById,
  updateStatus,
  pmUpdateStatus,
  getManualExpenses,
  saveManualExpenses,
} = require("../controllers/travelExpenseController");

const router = express.Router();

router.post("/",              createRequest);
router.get("/",               getRequests);
router.get("/:id",            getRequestById);
router.put("/:id/status",     updateStatus);
router.put("/:id/pm-status",  pmUpdateStatus);

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