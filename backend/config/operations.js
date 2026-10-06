// ===== FILE: APP_Vindia/backend/config/operations.js =====
// Single place for the business rules of the Operations & Administration
// department. Change a threshold or a role list HERE — not inside controllers.

const toAmount = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

module.exports = {
  /* Purchase orders whose total exceeds this (INR) are created as
     'pending_approval' and must be approved by the Operations Manager
     before Logistics can schedule a delivery. A PO with no prices entered
     has a total of 0, so it is issued straight away (old behaviour).
     Override with PO_APPROVAL_THRESHOLD in backend/.env */
  PO_APPROVAL_THRESHOLD: toAmount(process.env.PO_APPROVAL_THRESHOLD, 100000),

  /* Office requests (supplies / maintenance / facilities) whose cost
     estimate exceeds this need Operations Manager approval.
     Override with OFFICE_REQUEST_APPROVAL_THRESHOLD in backend/.env */
  OFFICE_REQUEST_APPROVAL_THRESHOLD: toAmount(
    process.env.OFFICE_REQUEST_APPROVAL_THRESHOLD,
    25000
  ),

  /* Who may move a material request  requested -> approved / rejected.
     The Site Engineer screen says "sent to Procurement for approval" and the
     Project Coordinator dashboard already had an approve/reject modal, so
     both keep working; the Operations Manager can approve as an escalation. */
  MATERIAL_REQUEST_APPROVER_ROLES: [
    "project_manager",
    "project_coordinator",
    "procurement_officer",
    "operations_manager",
    "ceo",
  ],

  /* Who may LIST every material request (everyone else sees only their own). */
  MATERIAL_REQUEST_VIEW_ALL_ROLES: [
    "project_manager",
    "project_coordinator",
    "procurement_officer",
    "logistics_coordinator",
    "inventory_controller",
    "operations_manager",
    "ceo",
  ],

  /* Who may record a delivery / stock issue against a material request. */
  MATERIAL_REQUEST_FULFIL_ROLES: [
    "logistics_coordinator",
    "inventory_controller",
    "operations_manager",
    "ceo",
  ],

  /* Who may confirm receipt of material on site. */
  MATERIAL_REQUEST_RECEIVE_ROLES: [
    "site_engineer",
    "project_manager",
    "project_coordinator",
    "operations_manager",
    "ceo",
  ],

  /* Roles that make up the Operations & Administration department. */
  OPERATIONS_ROLES: [
    "operations_manager",
    "office_administrator",
    "procurement_officer",
    "logistics_coordinator",
    "inventory_controller",
  ],

  /* Purchase-order statuses. */
  PO_STATUS: {
    PENDING_APPROVAL: "pending_approval",
    ISSUED: "issued",
    PARTIALLY_FULFILLED: "partially_fulfilled",
    FULFILLED: "fulfilled",
    REJECTED: "rejected",
    CANCELLED: "cancelled",
  },
};
