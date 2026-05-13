// backend/routes/travelExpenseRoutes.js
const express = require("express");
const { createRequest, getRequests, getRequestById,
        updateStatus, pmUpdateStatus } = require("../controllers/travelExpenseController");

const router = express.Router();

// Employee submits a request
router.post("/", createRequest);

// List requests  (HR: all | Employee: ?user_id=N)
router.get("/", getRequests);

// Single request detail with receipts
router.get("/:id", getRequestById);

// HR approve / reject
router.put("/:id/status", updateStatus);
router.put("/:id/pm-status", pmUpdateStatus);   // ← ADD THIS
  // existing HR route

module.exports = router;
 
/* ─────────────────────────────────────────────────────────────────────────────
   In your server.js, add:

   const travelExpenseRoutes = require("./routes/travelExpenseRoutes");
   app.use("/api/travel-expenses", travelExpenseRoutes);
───────────────────────────────────────────────────────────────────────────── */