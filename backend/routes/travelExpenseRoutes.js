// backend/routes/travelExpenseRoutes.js
const express = require("express");
const {
  createRequest,
  getRequests,
  getRequestById,
  updateStatus,
} = require("../controllers/travelExpenseController");

const router = express.Router();

// Employee submits a request
router.post("/", createRequest);

// List requests  (HR: all | Employee: ?user_id=N)
router.get("/", getRequests);

// Single request detail with receipts
router.get("/:id", getRequestById);

// HR approve / reject
router.put("/:id/status", updateStatus);

module.exports = router;

/* ─────────────────────────────────────────────────────────────────────────────
   In your server.js, add:

   const travelExpenseRoutes = require("./routes/travelExpenseRoutes");
   app.use("/api/travel-expenses", travelExpenseRoutes);
───────────────────────────────────────────────────────────────────────────── */