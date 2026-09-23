const multer = require("multer");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const path = require("path");
const fs = require("fs");

/* ── Upload directory ───────────────────────── */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ── Multer config ───────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

/* ═════════ ROUTES IMPORT ═════════ */

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const rolesRoutes = require("./routes/rolesRoutes");
const travelExpenseRoutes = require("./routes/travelExpenseRoutes");
const payrollRoutes = require("./routes/payrollRoutes");

const projectRoutes = require("./routes/projectRoutes");
const wbsRoutes = require("./routes/wbsRoutes");
const costRoutes = require("./routes/costRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const teamRoutes = require("./routes/teamRoutes");

const timesheetRoutes = require("./routes/timesheetRoutes");
const dailyRoutes = require("./routes/dailyUpdatesRoutes");
const analysisRoutes = require("./routes/analysis");

const incidentRoutes = require("./routes/IncidentRoutes");

const pcDailyUpdateRoutes = require("./routes/pcDailyUpdateRoutes");
const templateRoutes = require("./routes/templateRoutes");
const pcNotificationsRouter = require("./routes/pcNotifications");
const pcPaymentRoutes = require("./routes/pcPaymentRoutes");

/* ✅ Site Engineer */
const siteEngineerRfiRoutes = require("./routes/siteEngineerRfiRoutes");
const ncrRoutes = require("./routes/ncrRoutes");
const siteDiaryRoutes = require("./routes/siteDiaryRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const progressRoutes = require("./routes/progressRoutes");
const siteEngineerDashboardRoutes = require("./routes/siteEngineerDashboardRoutes");
const materialRequestRoutes = require("./routes/materialRequestRoutes");
const procurementRoutes = require("./routes/procurementRoutes");

const operationsNotificationsRoutes = require("./routes/operationsNotifications");

const snagRoutes = require("./routes/snagRoutes");
const siteProgressRoutes = require("./routes/siteProgressRoutes");
const sitephotosRoutes = require("./routes/sitephotosRoutes");
const labourRegistryRoutes = require("./routes/labourRoutes");
const labourReportRoutes = require("./routes/labourReportRoutes");
const approvalRoutes = require("./routes/approvalRoutes");

/* Architect */
const architectProjectsRoutes = require("./routes/architectProjects");
const architectDailyLogRoutes = require("./routes/architectDailyLogRoutes");
const architectDesignRoutes = require("./routes/architectDesignRoutes");
const architectDrawingUploadRoutes = require("./routes/architectDrawingUploadRoutes");
const architectAssignRoutes = require("./routes/architectAssignRoutes");
const architectNotifRoutes = require("./routes/architectNotificationsRoutes");

const drawingUploadRoutes = require("./routes/drawingUploadRoutes");

/* Structural */
const structuralRoutes = require("./routes/structuralRoutes");
const seDailyRoutes = require("./routes/seDailyupdatesRoutes");
const rfiRoutes = require("./routes/rfiRoutes");
const seNotificationRoutes = require("./routes/seNotificationRoutes");

/* QS */
const qsRoutes = require("./routes/qsRoutes");
const boqRoutes = require("./routes/boqRoutes");
const costReportRoutes = require("./routes/costReportRoutes");
const quantityReportRoutes = require("./routes/Quantityreportroutes");
const qsNotifRoutes = require("./routes/qsNotificationRoutes");
const measurementRoutes = require("./routes/measurementRoutes");

// ✅ NEW: Site Measurements (SE submits actual quantities against BOQ)
const siteMeasurementRoutes = require("./routes/siteMeasurementRoutes");

/* Others */
const mepNotifRoutes = require("./routes/mepNotificationsRoutes");
const clientRoutes = require("./routes/clientRoutes");

const leadRoutes = require("./routes/leadRoutes");
const reportRoutes = require("./routes/reportRoutes");
const pmReportRoutes = require("./routes/pmReportRoutes");
const metaRoutes = require("./routes/metaRoutes");
const bdaNotifRoutes = require("./routes/bdaNotificationRoutes");

/* ✅ Finance Manager */
const financeRoutes = require("./routes/financeRoutes");
const financeDailyUpdateRoutes = require("./routes/financeDailyUpdateRoutes");
/* ✅ Inventory & Logistics */
const inventoryItemRoutes = require("./routes/inventoryItemRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const goodsReceiptRoutes = require("./routes/goodsReceiptRoutes");
const inventoryTransactionRoutes = require("./routes/inventoryTransactionRoutes");
const operationsNotificationRoutes = require("./routes/operationsNotifications");

/* ✅ Accountant */
const accountantRoutes = require("./routes/accountantRoutes");

/* ✅ 3D Visualizer */
const threeDModelRoutes = require("./routes/threeDModelRoutes");
const threeDNotificationRoutes = require("./routes/threeDNotificationsRoutes");

/* ✅ Digital Marketing */
const campaignRoutes = require("./routes/campaignRoutes");
const marketingRoutes = require("./routes/marketingRoutes");
const digitalMarketingNotificationRoutes = require("./routes/digitalMarketingNotificationRoutes");
const { errorHandler } = require("./middleware/errorHandler");
/* ═════════ APP SETUP ═════════ */

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(uploadDir));

/* ═════════ DB CHECK ═════════ */

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Database error");
  }
});

/* ═════════ ROUTES ═════════ */

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);

app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/travel-expenses", travelExpenseRoutes);
app.use("/api/payroll", payrollRoutes);

app.use("/api/projects", projectRoutes);
app.use("/api/wbs", wbsRoutes);
app.use("/api/cost-summary", costRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/team", teamRoutes);

app.use("/api/structural", structuralRoutes);
app.use("/api/se-daily-reports", seDailyRoutes);
app.use("/api/rfis", rfiRoutes);
app.use("/api/se-notifications", seNotificationRoutes);

/* ✅ QS */
app.use("/api/qs/notifications", qsNotifRoutes);
app.use("/api/qs", qsRoutes);
app.use("/api/boq", boqRoutes);
app.use("/api/cost-report", costReportRoutes);
app.use("/api/quantity-report", quantityReportRoutes);

/* ⚠️ Old measurement sheets (QS measurement sheets — kept for backward compat) */
app.use("/api/measurement", measurementRoutes);
app.use("/api/measurements", measurementRoutes);

// ✅ NEW: Site measurements — SE submits actual quantities against a BOQ
// Used by QSMeasurements.jsx: POST /api/site-measurements
app.use("/api/site-measurements", siteMeasurementRoutes);
app.use("/api/approvals", approvalRoutes);

app.use("/api/timesheets", timesheetRoutes);
app.use("/api/daily-reports", dailyRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/mep-notifications", mepNotifRoutes);
app.use("/api/client", clientRoutes);

app.use("/api/incidents", incidentRoutes);

app.use("/api/pc-daily-updates", pcDailyUpdateRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/pc-notifications", pcNotificationsRouter);
app.use("/api/pc/payments", pcPaymentRoutes);

app.use("/api/architect", architectProjectsRoutes);
app.use("/api/architect-daily-log", architectDailyLogRoutes);
app.use("/api/architect-designs", architectDesignRoutes);
app.use("/api/architect-drawings", architectDrawingUploadRoutes);
app.use("/api/architect-assign", architectAssignRoutes);
app.use("/api/architect-notifications", architectNotifRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/operations-notifications", operationsNotificationsRoutes);
/* ✅ Site Engineer */
app.use("/api/site-engineer/rfi", siteEngineerRfiRoutes);
app.use("/api/ncr", ncrRoutes);
app.use("/api/diary", siteDiaryRoutes);
app.use("/api/activity-log", activityLogRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/site-engineer-dashboard", siteEngineerDashboardRoutes);
app.use("/api/material-request", materialRequestRoutes);
app.use("/api/snags", snagRoutes);
app.use("/api/site-progress", siteProgressRoutes);
app.use("/api/photos", sitephotosRoutes);
app.use("/api/labour-registry", labourRegistryRoutes);
app.use("/api/labour-report", labourReportRoutes);

/* ✅ Inventory & Logistics */
app.use("/api/inventory/items", inventoryItemRoutes);
app.use("/api/inventory", inventoryTransactionRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/goods-receipts", goodsReceiptRoutes);
app.use("/api/operations-notifications", operationsNotificationRoutes);

/* Shared */
app.use("/api/drawings", drawingUploadRoutes);

app.use("/api/leads", leadRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/pm-reports", pmReportRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/bda-notifications", bdaNotifRoutes);
/* ✅ Finance Manager */
app.use("/api/finance", financeRoutes);
app.use("/api/finance-daily-updates", financeDailyUpdateRoutes);

app.use("/api/accountant", accountantRoutes);

/* ✅ 3D Visualizer */
app.use("/api/3d-models", threeDModelRoutes);
app.use("/api/3d-notifications", threeDNotificationRoutes);

/* ✅ Digital Marketing */
app.use("/api/campaigns", campaignRoutes);
app.use("/api/marketing", marketingRoutes);
app.use("/api/dm-notifications", digitalMarketingNotificationRoutes);
/* ═════════ ERROR HANDLING ═════════ */

app.use(errorHandler);

/* ═════════ START ═════════ */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});