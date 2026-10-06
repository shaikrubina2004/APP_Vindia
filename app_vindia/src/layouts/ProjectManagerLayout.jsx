import "../styles/rolePortal.css";
import AppLayout from "./AppLayout";
import { ProjectManagerMenu } from "../menus/ProjectManagerMenu";
import { ProjectProvider } from "../context/ProjectContext";

function ProjectManagerLayout({ children }) {
  return (
    <div className="role-portal">
      <ProjectProvider>
        <AppLayout menuItems={ProjectManagerMenu}>{children}</AppLayout>
      </ProjectProvider>
    </div>
  );
}

export default ProjectManagerLayout;
