import AppLayout from "./AppLayout";
import MEPMenu from "../menus/MEPMenu";
import { ProjectProvider } from "../context/ProjectContext";

function MepLayout({ children }) {
  return (
    <ProjectProvider>
      <AppLayout menuItems={MEPMenu}>{children}</AppLayout>
    </ProjectProvider>
  );
}

export default MepLayout;
