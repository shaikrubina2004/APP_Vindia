import AppLayout from "./AppLayout";
import ProjectCoordinatorMenu from "../menus/ProjectCoordinatorMenu";
import { ProjectProvider } from "../context/ProjectContext";

function ProjectCoordinatorLayout({ children }) {
  return (
    <ProjectProvider>
      <AppLayout menuItems={ProjectCoordinatorMenu}>
        {children}
      </AppLayout>
    </ProjectProvider>
  );
}

export default ProjectCoordinatorLayout;