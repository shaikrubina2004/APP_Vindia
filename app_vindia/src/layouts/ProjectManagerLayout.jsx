import AppLayout from "./AppLayout";
import { ProjectManagerMenu } from "../menus/ProjectManagerMenu";
import { ProjectProvider } from "../context/ProjectContext";


function ProjectManagerLayout({ children }) {
  return(    <ProjectProvider>
  <AppLayout menuItems={ProjectManagerMenu}>{children}</AppLayout>    </ProjectProvider>
  );
}

export default ProjectManagerLayout;
