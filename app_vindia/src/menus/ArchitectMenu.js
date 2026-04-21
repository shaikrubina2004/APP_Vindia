export const ArchitectMenu = [
  { 
    name: "Home", 
    path: "/architect/dashboard", 
    icon: "home" 
  },
  { 
    /* This is where you handle task assigning */
    name: "Tasks", 
    path: "/architect/tasks", 
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
    icon: "layers" 
  },
  { 
    /* Official approvals and milestones */
    name: "Sign Off", 
    path: "/architect/sign-off", 
    icon: "user-check" 
  },
  { 
    /* Urgent issues or site accidents */
    name: "Incident", 
    path: "/architect/incidents", 
    icon: "alert-triangle" 
  },
  {
  /* Structural + MEP coordination, clash resolution */
  name: "Coordination",
  path: "/architect/coordination",
  icon: "git-merge"
}
];