export const MEPMenu = [
  { name: "Dashboard", path: "/mep/dashboard", icon: "home" },

  { name: "Daily Log", path: "/mep/daily-log", icon: "calendar" },

  { name: "Drawings", path: "/mep/drawings", icon: "file-text" },

  { name: "Version Control", path: "/mep/version-control", icon: "git-branch" },

  { name: "Incidents", path: "/mep/incidents", icon: "alert-triangle" },

  { name: "Coordination", path: "/mep/coordination", icon: "users" },

  {
    name: "Task Queue",
    path: "/mep/incidents?page=tasks",
    icon: "check-square",
  },

  { name: "Upload", path: "/mep/upload", icon: "upload" },
];
export default MEPMenu;
