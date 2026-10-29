const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/officeAdminController");

router.use(protect, requireRole("office_administrator", "operations_manager", "ceo"));
const officeAdminWrite = requireRole("office_administrator", "ceo");

// Existing Office Administration API — preserved.
router.get("/dashboard", controller.getDashboard);
router.get("/requests", controller.getRequests);
router.post("/requests", requireRole("office_administrator", "operations_manager", "ceo"), controller.createRequestV2);
router.put("/requests/:id/status", controller.updateRequestStatusV2);

router.get("/facilities", controller.listFacilities);
router.post("/facilities", officeAdminWrite, controller.createFacility);
router.put("/facilities/:id/status", officeAdminWrite, controller.updateFacilityStatus);
router.get("/supplies", controller.listSupplies);
router.post("/supplies", officeAdminWrite, controller.createSupply);
router.post("/supplies/:id/transaction", officeAdminWrite, controller.transactSupply);

router.get("/visitors", controller.getVisitorsV2);
router.post("/visitors", officeAdminWrite, controller.createVisitorV2);
router.put("/visitors/:id/check-in", officeAdminWrite, controller.checkInVisitor);
router.put("/visitors/:id/check-out", officeAdminWrite, controller.checkOutVisitor);
router.put("/visitors/:id/status", officeAdminWrite, controller.updateVisitorStatus);

router.get("/assets", controller.getAssetsV2);
router.post("/assets", officeAdminWrite, controller.createAssetV2);
router.put("/assets/:id/assign", officeAdminWrite, controller.assignAssetV2);
router.put("/assets/:id/status", officeAdminWrite, controller.updateAssetStatusV2);
router.put("/assets/:id", officeAdminWrite, controller.updateAsset);

module.exports = router;
