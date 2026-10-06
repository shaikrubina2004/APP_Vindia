// Every path below exists in routes/OfficeAdministratorRoutes.jsx.
// (The previous version linked to /office-administrator/* which was never routed.)
const OfficeAdministratorMenu = [
  { name: "Dashboard", path: "/operations/administrator/dashboard", icon: "home" },
  { name: "Office Requests", path: "/operations/administrator/requests", icon: "clipboard" },
  { name: "Office Supplies", path: "/operations/administrator/supplies", icon: "package" },
  { name: "Facilities", path: "/operations/administrator/facilities", icon: "tool" },
  { name: "Visitors", path: "/operations/administrator/visitors", icon: "user-check" },
  { name: "Assets", path: "/operations/administrator/assets", icon: "monitor" },
  { name: "Daily Update", path: "/operations/administrator/daily-update", icon: "send" },
  { name: "Incidents", path: "/operations/administrator/incidents", icon: "alert-triangle" },
  { name: "Tasks", path: "/operations/administrator/incidents?page=tasks", icon: "check-square" },
];

export default OfficeAdministratorMenu;
