export const ClientMenu = [
  // ── Overview ──────────────────────────────────────────────────────────
  { name: "Dashboard", path: "/client/dashboard", icon: "home" },

  // ── Progress ──────────────────────────────────────────────────────────
  { name: "Milestones", path: "/client/milestones", icon: "check-square" },
  { name: "Site Photos", path: "/client/site-photos", icon: "image" },
  { name: "Daily Logs", path: "/client/daily-logs", icon: "calendar" },

  // ── Finance ───────────────────────────────────────────────────────────
  { name: "Invoices", path: "/client/invoices", icon: "file-text" },
  { name: "BOQ / Estimates", path: "/client/boq", icon: "clipboard" },
  { name: "Payments", path: "/client/payments", icon: "credit-card" },

  // ── Documents ─────────────────────────────────────────────────────────
  { name: "Drawings", path: "/client/drawings", icon: "layout" },
  { name: "Approvals", path: "/client/approvals", icon: "check-circle" },
  { name: "Shared Files", path: "/client/shared-files", icon: "folder" },

  // ── Support ───────────────────────────────────────────────────────────
  { name: "Incidents", path: "/client/incidents", icon: "alert-triangle" },
  { name: "RFI", path: "/client/rfi", icon: "help-circle" },
];

export default ClientMenu;
