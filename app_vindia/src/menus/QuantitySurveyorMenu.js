// QuantitySurveyorMenu.js

const QuantitySurveyorMenu = [
  { name: "Dashboard", path: "/quantity-surveyor/dashboard", icon: "grid" },

  {
    name: "Coordination",
    path: "/quantity-surveyor/coordination",
    icon: "users",
  },

  {
    name: "Daily Updates",
    path: "/quantity-surveyor/daily-updates",
    icon: "edit-3",
  },
  { name: "Measurement", path: "/quantity-surveyor/measurement", icon: "maximize" },
  { name: "BOQ", path: "/quantity-surveyor/boq", icon: "list" },

  // ✅ NEW

  {
    name: "Cost Report",
    path: "/quantity-surveyor/cost-report",
    icon: "dollar-sign",
  },
  {
    name: "Quantity Report",
    path: "/quantity-surveyor/quantity-report",
    icon: "bar-chart-2",
  },

  // ✅ NEW
  {
    name: "Incident",
    path: "/quantity-surveyor/incident",
    icon: "alert-triangle",
  },
  {
    name: "Tasks",
    path: "/quantity-surveyor/incident?page=tasks",
    icon: "check-square",
  },
];

export default QuantitySurveyorMenu;
