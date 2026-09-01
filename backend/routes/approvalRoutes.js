// backend/routes/approvalRoutes.js

const express = require("express");

const router = express.Router();

const authMiddleware =
  require("../middleware/authMiddleware");

  const upload = require("../middleware/upload");
const {
  createApproval,
  getApprovals,
  getMyApprovals,
  getApprovalById,
  reviewApproval,
} = require("../controllers/approvalController");


/* =========================================================
   GET ALL APPROVALS

   GET /api/approvals
========================================================= */

router.get(
  "/",
  authMiddleware,
  getApprovals
);


/* =========================================================
   GET MY ASSIGNED APPROVALS

   GET /api/approvals/my

   Project Manager:
   → project_manager approvals

   QC:
   → qc_engineer approvals

   QS:
   → quantity_surveyor approvals

   Architect:
   → architect approvals
========================================================= */

router.get(
  "/my",
  authMiddleware,
  getMyApprovals
);


/* =========================================================
   CREATE APPROVAL

   POST /api/approvals
========================================================= */

router.post(
  "/",
  authMiddleware,
  upload.array("attachments", 10),
  createApproval
);


/* =========================================================
   GET SINGLE APPROVAL

   GET /api/approvals/:id
========================================================= */

router.get(
  "/:id",
  authMiddleware,
  getApprovalById
);


/* =========================================================
   REVIEW APPROVAL

   PATCH /api/approvals/:id/review

   Body:

   {
     "status": "approved"
   }

   OR

   {
     "status": "rejected",
     "rejection_reason": "Concrete quantity does not match."
   }

   OR

   {
     "status": "revision",
     "rejection_reason": "Please upload the revised drawing."
   }
========================================================= */

router.patch(
  "/:id/review",
  authMiddleware,
  reviewApproval
);


module.exports = router;