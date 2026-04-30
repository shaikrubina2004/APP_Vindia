// FILE PATH: src/menus/structuralEngineerMenu.js

export const StructuralEngineerMenu = [
  {
    name: "Dashboard",
    path: "/structural-engineer/dashboard",
    icon: "home",
  },
  {
    name: "Drawings",
    path: "/structural-engineer/shared/drawings",   // ← fixed path
    icon: "file-text",
  },
  {
    name: "BOQ",
    path: "/structural-engineer/boq",               // ← now has a real route
    icon: "clipboard",
  },
  {
    name: "RFI",
    path: "/structural-engineer/rfi",
    icon: "help-circle",
  },
  {
    name: "Incidents",
    path: "/structural-engineer/incidents",
    icon: "alert-triangle",
  },
  {
    name: "Tasks",
    path: "/structural-engineer/incidents?page=tasks",
    icon: "check-square",
  },
  {
    name: "Daily Updates",
    path: "/structural-engineer/daily-updates",
    icon: "calendar",
  },
<<<<<<< Updated upstream

  { name: "Upload", path: "/structural-engineer/upload", icon: "upload" },
=======
>>>>>>> Stashed changes
];