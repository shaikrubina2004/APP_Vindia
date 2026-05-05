// src/config/siteEngineerMenu.js

const siteEngineerMenu = [
  // 🏠 DASHBOARD
  {
    name: "Dashboard",
    path: "/site-engineer/dashboard",
    icon: "home",
  },

  // 📘 DAILY OPERATIONS
  {
    name: "Daily Diary",
    path: "/site-engineer/daily-diary", // ✅ matches route
    icon: "book",
  },
  {
    name: "Checklist",
    path: "/site-engineer/checklist",
    icon: "check-square",
  },

  // ⚠️ QUALITY & ISSUES
  {
    name: "RFI Register",
    path: "/site-engineer/rfi",
    icon: "alert-circle",
  },
  {
    name: "NCR Register",
    path: "/site-engineer/ncr",
    icon: "x-circle",
  },
  {
    name: "Incidents",
    path: "/site-engineer/incidents",
    icon: "alert-triangle",
  },
  {
    name: "Tasks",
    path: "/site-engineer/incidents?page=tasks", // ✅ handled by AppShell
    icon: "list",
  },

  // 📊 PERFORMANCE
  {
    name: "Progress",
    path: "/site-engineer/progress",
    icon: "trending-up",
  },

  // 🧾 TRACKING
  {
    name: "Activity Log",
    path: "/site-engineer/activity",
    icon: "clock",
  },

  // 📌 EXTRA MODULES (NEW PAGES)
  {
    name: "Snag List",
    path: "/site-engineer/snag-list",
    icon: "tool",
  },
  {
    name: "Material Request",
    path: "/site-engineer/materials",
    icon: "package",
  },
  {
    name: "Approvals",
    path: "/site-engineer/approvals",
    icon: "check-circle",
  },
  {
    name: "Photo Gallery",
    path: "/site-engineer/photos",
    icon: "image",
  },
  {
    name: "Site Instructions",
    path: "/site-engineer/site-instructions",
    icon: "file-text",
  },
];

export default siteEngineerMenu;