// Every path below exists in routes/OperationsManagerRoutes.jsx.
// (The previous version linked to /operations-manager/* which was never routed.)
const OperationsManagerMenu = [
  { name: "Dashboard", path: "/operations/manager/dashboard", icon: "home" },
  { name: "Approvals", path: "/operations/manager/approvals", icon: "check-circle" },
  { name: "Material Requests", path: "/operations/manager/material-requests", icon: "package" },
  { name: "Procurement", path: "/operations/manager/procurement", icon: "shopping-cart" },
  { name: "Logistics", path: "/operations/manager/logistics", icon: "truck" },
  { name: "Inventory", path: "/operations/manager/inventory", icon: "archive" },
  { name: "Vendors", path: "/operations/manager/vendors", icon: "users" },
  { name: "Office Administration", path: "/operations/manager/administration", icon: "briefcase" },
  { name: "Team Daily Updates", path: "/operations/manager/daily-updates", icon: "clipboard" },
  { name: "Reports", path: "/operations/manager/reports", icon: "bar-chart-2" },
  { name: "Incidents", path: "/operations/manager/incidents", icon: "alert-triangle" },
  { name: "Tasks", path: "/operations/manager/incidents?page=tasks", icon: "check-square" },
  { name: "Report to CEO", path: "/my-reports", icon: "send" },
];

export default OperationsManagerMenu;
