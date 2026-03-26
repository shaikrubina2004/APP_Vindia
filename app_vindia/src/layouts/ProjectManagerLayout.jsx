import AppLayout from "./AppLayout";
import { ProjectManagerMenu } from "../menus/ProjectManagerMenu";

function ProjectManagerLayout({ children }) {
  return <AppLayout menuItems={ProjectManagerMenu}>{children}</AppLayout>;
}

export default ProjectManagerLayout;
