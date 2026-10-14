// ===== FILE: APP_Vindia/backend/config/operations.js =====
// Central business rules for the Operations & Administration department.
// Keep business rules here instead of scattering constants through controllers.
//
// WBS is a shared project-control reference. Operations reads and references
// WBS records; it does not maintain a second Operations WBS.

const toAmount = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const toPositiveInteger = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

module.exports = {
  PO_APPROVAL_THRESHOLD: toAmount(
    process.env.PO_APPROVAL_THRESHOLD,
    100000
  ),

  OFFICE_REQUEST_APPROVAL_THRESHOLD: toAmount(
    process.env.OFFICE_REQUEST_APPROVAL_THRESHOLD,
    25000
  ),

  // Material requests are approved by the Project Coordinator in the normal
  // workflow. CEO is the escalation/override role. Procurement and Operations
  // Manager do not approve the input they subsequently consume/control.
  MATERIAL_REQUEST_APPROVER_ROLES: [
    "project_coordinator",
    "ceo",
  ],

  MATERIAL_REQUEST_VIEW_ALL_ROLES: [
    "project_manager",
    "project_coordinator",
    "procurement_officer",
    "logistics_coordinator",
    "inventory_controller",
    "operations_manager",
    "ceo",
  ],

  MATERIAL_REQUEST_FULFIL_ROLES: [
    "logistics_coordinator",
    "inventory_controller",
    "operations_manager",
    "ceo",
  ],

  MATERIAL_REQUEST_RECEIVE_ROLES: [
    "site_engineer",
    "project_manager",
    "project_coordinator",
    "operations_manager",
    "ceo",
  ],

  OPERATIONS_ROLES: [
    "operations_manager",
    "office_administrator",
    "procurement_officer",
    "logistics_coordinator",
    "inventory_controller",
  ],

  WBS: {
    ENABLED: true,
    MATERIAL_REQUEST_LINK_ENABLED: true,
    PURCHASE_ORDER_INHERIT_FROM_REQUEST: true,
    PURCHASE_ORDER_WBS_EDITABLE: false,
    MANAGER_READ_ONLY: true,
    VALIDATE_PROJECT_RELATIONSHIP: true,
  },

  WBS_REFERENCE_ROLES: [
    "site_engineer",
    "project_coordinator",
    "project_manager",
    "procurement_officer",
    "operations_manager",
    "inventory_controller",
    "logistics_coordinator",
    "quantity_surveyor",
    "accountant",
    "ceo",
  ],

  WBS_VIEW_ROLES: [
    "site_engineer",
    "project_coordinator",
    "project_manager",
    "procurement_officer",
    "operations_manager",
    "inventory_controller",
    "logistics_coordinator",
    "quantity_surveyor",
    "accountant",
    "ceo",
  ],

  WBS_MANAGER_METRICS: [
    "material_requests",
    "purchase_orders",
    "purchase_order_value",
    "deliveries",
    "received_quantities",
    "delayed_deliveries",
    "inventory_alerts",
  ],

  MATERIAL_REQUEST_STATUS: {
    REQUESTED: "requested",
    APPROVED: "approved",
    REJECTED: "rejected",
    PARTIALLY_FULFILLED: "partially_fulfilled",
    FULFILLED: "fulfilled",
    DELIVERED: "delivered",
    SITE_CONFIRMED: "site_confirmed",
    CANCELLED: "cancelled",
  },

  PO_STATUS: {
    PENDING_APPROVAL: "pending_approval",
    ISSUED: "issued",
    PARTIALLY_FULFILLED: "partially_fulfilled",
    FULFILLED: "fulfilled",
    REJECTED: "rejected",
    CANCELLED: "cancelled",
  },

  DELIVERY_ALLOWED_PO_STATUSES: [
    "issued",
    "partially_fulfilled",
  ],

  GOODS_RECEIPT_ALLOWED_PO_STATUSES: [
    "issued",
    "partially_fulfilled",
  ],

  SITE_RECEIPT_CONFIRMATION_ENABLED: true,
  PREVENT_STOCK_OVERDRAW: true,
  PREVENT_DUPLICATE_STOCK_RECEIPT: true,
  PREVENT_OVER_FULFILLMENT: true,

  PO_REQUIRES_APPROVED_MATERIAL_REQUEST: true,
  CANCELLED_PO_CAN_REOPEN_REQUEST: true,
  PROCUREMENT_CANNOT_APPROVE_PO: true,

  PO_HIGH_VALUE_APPROVER_ROLES: [
    "operations_manager",
    "ceo",
  ],

  NOTIFICATION_EVENTS: {
    MATERIAL_REQUEST_SUBMITTED: "material_request_submitted",
    MATERIAL_REQUEST_APPROVED: "material_request_approved",
    MATERIAL_REQUEST_REJECTED: "material_request_rejected",
    PO_CREATED: "purchase_order_created",
    PO_PENDING_APPROVAL: "purchase_order_pending_approval",
    PO_APPROVED: "purchase_order_approved",
    PO_REJECTED: "purchase_order_rejected",
    DELIVERY_SCHEDULED: "delivery_scheduled",
    DELIVERY_DELAYED: "delivery_delayed",
    GOODS_RECEIVED: "goods_received",
    SITE_RECEIPT_REQUIRED: "site_receipt_required",
    SITE_RECEIPT_CONFIRMED: "site_receipt_confirmed",
    LOW_STOCK: "low_stock",
  },

  DEFAULT_PAGE_SIZE: toPositiveInteger(
    process.env.OPERATIONS_DEFAULT_PAGE_SIZE,
    25
  ),

  MAX_PAGE_SIZE: toPositiveInteger(
    process.env.OPERATIONS_MAX_PAGE_SIZE,
    100
  ),
};
