export const ArchitectMenu = [
  { 
    name: "Home", 
    path: "/architect/dashboard", 
    icon: "home" 
  },
  { 
    /* This is where you handle task assigning */
    name: "Tasks", 
    path: "/architect/incidents?page=tasks", 
    icon: "file-text" 
  },

  { 
    /* Routine site reporting */
    name: "Daily Logs", 
    path: "/architect/logs", 
    icon: "book-open"  // 📋 Better for daily logs/reporting
  },
  { 
    /* Blueprints, Coordination, and Versions */
    name: "The Designs", 
    path: "/architect/designs", 
    icon: "file" 
  },
  { 
    /* Official approvals and milestones */
    name: "assign", 
    path: "/architect/assign", 
    icon: "user-check" 
  },
  { 
    /* Urgent issues or site accidents */
    name: "Incident", 
    path: "/architect/incidents", 
    icon: "alert-triangle" 
  },

 {
    name: "Projects",
    path: "/architect/projects",
    icon: "grid"
  },
  {
    name: "RFI",
    path: "/architect/rfi",
    icon: "help-circle",  
  },
  {
    name: "Snag",
  path: "/architect/snag",
  icon: "clipboard",
  },

];