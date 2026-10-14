// Every path below exists in routes/OperationsManagerRoutes.jsx.
// Kept short and in plain words on purpose — one entry per thing the manager does.
const OperationsManagerMenu = [
  { name: "Dashboard", path: "/operations/manager/dashboard", icon: "home" },
  { name: "Approvals", path: "/operations/manager/approvals", icon: "check-circle" },
  { name: "Material Requests", path: "/operations/manager/material-requests", icon: "package" },
  { name: "Purchase Orders", path: "/operations/manager/procurement", icon: "shopping-cart" },
  { name: "Deliveries", path: "/operations/manager/logistics", icon: "truck" },
  { name: "Stock", path: "/operations/manager/inventory", icon: "archive" },
  { name: "Project Control (WBS)", path: "/operations/manager/wbs", icon: "layers" },
  { name: "Office Admin", path: "/operations/manager/administration", icon: "briefcase" },
  { name: "Team Updates", path: "/operations/manager/daily-updates", icon: "clipboard" },
  { name: "Reports", path: "/operations/manager/reports", icon: "bar-chart-2" },
  { name: "Issues & Tasks", path: "/operations/manager/incidents", icon: "alert-triangle" },
  { name: "Report to CEO", path: "/my-reports", icon: "send" },
];

export default OperationsManagerMenu;
