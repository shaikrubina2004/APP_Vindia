const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/officeAdminController");

router.use(protect, requireRole("office_administrator", "operations_manager", "ceo"));

// Existing Office Administration API — preserved.
router.get("/dashboard", controller.getDashboard);
router.get("/requests", controller.getRequests);
router.post("/requests", requireRole("office_administrator", "operations_manager", "ceo"), controller.createRequestV2);
router.put("/requests/:id/status", controller.updateRequestStatusV2);

router.get("/facilities", controller.listFacilities);
router.post("/facilities", controller.createFacility);
router.put("/facilities/:id/status", controller.updateFacilityStatus);
router.get("/supplies", controller.listSupplies);
router.post("/supplies", controller.createSupply);
router.post("/supplies/:id/transaction", controller.transactSupply);

router.get("/visitors", controller.getVisitorsV2);
router.post("/visitors", controller.createVisitorV2);
router.put("/visitors/:id/check-in", controller.checkInVisitor);
router.put("/visitors/:id/check-out", controller.checkOutVisitor);
router.put("/visitors/:id/status", controller.updateVisitorStatus);

router.get("/assets", controller.getAssetsV2);
router.post("/assets", controller.createAssetV2);
router.put("/assets/:id/assign", controller.assignAssetV2);
router.put("/assets/:id/status", controller.updateAssetStatusV2);
router.put("/assets/:id", controller.updateAsset);

module.exports = router;
