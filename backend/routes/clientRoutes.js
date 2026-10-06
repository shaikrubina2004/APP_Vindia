const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const c = require("../controllers/clientController");

// Every client route needs a valid JWT and the client role (CEO may preview).
router.use(protect);
router.use(protect.requireRole("client", "ceo"));
// (clientFence in server.js additionally stops client tokens reaching any other /api route)

// Projects (switcher)
router.get("/projects", c.getClientProjects);

// Milestones
router.get("/milestones", c.getClientMilestones);
router.get("/milestones/:id", c.getClientMilestoneById);

// Daily logs
router.get("/daily-logs", c.getClientDailyLogs);
router.get("/daily-logs/:id", c.getClientDailyLogById);

// Site photos
router.get("/site-photos", c.getClientSitePhotos);

// Finance (finalised BOQs only)
router.get("/invoices", c.getClientInvoices);
router.get("/invoices/:id", c.getClientInvoiceById);
router.get("/boq", c.getClientBoq);
router.get("/payments", c.getClientPayments);

// Documents
router.get("/shared-files", c.getClientSharedFiles);
router.get("/approvals", c.getClientApprovals);

// Incidents (client's own tickets)
router.get("/incidents", c.getClientIncidents);
router.get("/incidents/:id", c.getClientIncidentById);
router.post("/incidents", c.createClientIncident);
router.post("/incidents/:id/comments", c.addClientIncidentComment);

// RFIs
router.get("/rfi", c.getClientRfis);
router.get("/rfi/:id", c.getClientRfiById);
router.post("/rfi", c.createClientRfi);
router.post("/rfi/:id/respond", c.respondClientRfi);

// Notifications (read-all BEFORE /:id/read)
router.get("/notifications", c.getClientNotifications);
router.patch("/notifications/read-all", c.markAllClientNotificationsRead);
router.patch("/notifications/:id/read", c.markClientNotificationRead);

module.exports = router;
