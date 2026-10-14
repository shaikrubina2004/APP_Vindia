// Every path below exists in routes/OfficeAdministratorRoutes.jsx.
// Supplies and Facilities are filters inside "Requests", so they are not separate menu items.
const OfficeAdministratorMenu = [
  { name: "Dashboard", path: "/operations/administrator/dashboard", icon: "home" },
  { name: "Requests", path: "/operations/administrator/requests", icon: "clipboard" },
  { name: "Visitors", path: "/operations/administrator/visitors", icon: "user-check" },
  { name: "Assets", path: "/operations/administrator/assets", icon: "monitor" },
  { name: "Daily Update", path: "/operations/administrator/daily-update", icon: "send" },
  { name: "Issues & Tasks", path: "/operations/administrator/incidents", icon: "alert-triangle" },
];

export default OfficeAdministratorMenu;
