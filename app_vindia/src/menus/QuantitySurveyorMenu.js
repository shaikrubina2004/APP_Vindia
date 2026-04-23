// QuantitySurveyorMenu.js

const QuantitySurveyorMenu = [
  { name: "Dashboard",        path: "/quantity-surveyor/dashboard",       icon: "grid" },

  { name: "Daily Updates",    path: "/quantity-surveyor/daily-updates",   icon: "edit-3" },
  { name: "BOQ",              path: "/quantity-surveyor/boq",             icon: "list" },

  // ✅ NEW
  { name: "Measurements",     path: "/quantity-surveyor/measurements",    icon: "check-square" },

  { name: "Quantity Report",  path: "/quantity-surveyor/quantity-report", icon: "bar-chart-2" },
  { name: "Cost Report",      path: "/quantity-surveyor/cost-report",     icon: "dollar-sign" },
  

  // ✅ NEW
  { name: "Incident",         path: "/quantity-surveyor/incident",        icon: "alert-triangle" },
  { name: "Tasks", path: "/quantity-surveyor/incident?page=tasks", icon: "check-square" },
  {
  name: "Alerts",
  path: "/quantity-surveyor/alerts",
  icon: "bell",
}
];


export default QuantitySurveyorMenu;