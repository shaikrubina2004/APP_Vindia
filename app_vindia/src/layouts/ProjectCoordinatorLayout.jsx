import AppLayout from "./AppLayout";

export const ProjectCoordinatorMenu = [
  { name: "Dashboard", path: "/project-coordinator/dashboard", icon: "home" },
  { name: "Daily Updates", path: "/project-coordinator/daily", icon: "calendar" },
  { name: "Milestone", path: "/project-coordinator/milestone", icon: "target" },
  { name: "Tasks", path: "/project-coordinator/tasks", icon: "check-square" },
  { name: "Incidents", path: "/project-coordinator/incidents", icon: "alert-triangle" },
  { name: "Payments", path: "/project-coordinator/payments", icon: "credit-card" },
];

function ProjectCoordinatorLayout({ children }) {
  return <AppLayout menuItems={ProjectCoordinatorMenu}>{children}</AppLayout>;
}

export default ProjectCoordinatorLayout;