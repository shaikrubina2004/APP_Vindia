import AppLayout from "./AppLayout";
import { ArchitectMenu } from "../menus/ArchitectMenu";
import { ProjectProvider } from "../context/ProjectContext";  // ← ADD THIS

function ArchitectLayout({ children }) {
  return (
    <ProjectProvider>
      <AppLayout menuItems={ArchitectMenu}>
        {children}
      </AppLayout>
    </ProjectProvider>
  );
}

export default ArchitectLayout;