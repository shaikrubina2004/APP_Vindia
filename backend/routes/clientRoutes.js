const express = require("express");
const router = express.Router();

const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// ── Auth guard — every client route requires a valid JWT with role = client ──
router.use(verifyToken);
router.use(requireRole("client"));

// ── Single controller for all client endpoints ─────────────────────────────
const {
  // Milestones
  getClientMilestones,
  getClientMilestoneById,
  // Daily logs
  getClientDailyLogs,
  getClientDailyLogById,
  // Site photos
  getClientSitePhotos,
  // Invoices
  getClientInvoices,
  getClientInvoiceById,
  // BOQ
  getClientBoq,
  // Payments
  getClientPayments,
  // Shared files
  getClientSharedFiles,
  // Incidents
  getClientIncidents,
  getClientIncidentById,
  createClientIncident,
  // RFI
  getClientRfis,
  getClientRfiById,
  createClientRfi,
} = require("../controllers/clientController");

// ═══════════════════════════════════════════════════════════════════════════
// MILESTONES
// ═══════════════════════════════════════════════════════════════════════════
router.get("/milestones", getClientMilestones);
router.get("/milestones/:id", getClientMilestoneById);

// ═══════════════════════════════════════════════════════════════════════════
// DAILY LOGS
// ═══════════════════════════════════════════════════════════════════════════
router.get("/daily-logs", getClientDailyLogs);
router.get("/daily-logs/:id", getClientDailyLogById);

// ═══════════════════════════════════════════════════════════════════════════
// SITE PHOTOS
// ═══════════════════════════════════════════════════════════════════════════
router.get("/site-photos", getClientSitePhotos);

// ═══════════════════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════════════════
router.get("/invoices", getClientInvoices);
router.get("/invoices/:id", getClientInvoiceById);

// ═══════════════════════════════════════════════════════════════════════════
// BOQ & ESTIMATES
// ═══════════════════════════════════════════════════════════════════════════
router.get("/boq", getClientBoq);

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════
router.get("/payments", getClientPayments);

// ═══════════════════════════════════════════════════════════════════════════
// SHARED FILES
// ═══════════════════════════════════════════════════════════════════════════
router.get("/shared-files", getClientSharedFiles);

// ═══════════════════════════════════════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════
router.get("/incidents", getClientIncidents);
router.get("/incidents/:id", getClientIncidentById);
router.post("/incidents", createClientIncident);

// ═══════════════════════════════════════════════════════════════════════════
// RFI
// ═══════════════════════════════════════════════════════════════════════════
router.get("/rfi", getClientRfis);
router.get("/rfi/:id", getClientRfiById);
router.post("/rfi", createClientRfi);

module.exports = router;
