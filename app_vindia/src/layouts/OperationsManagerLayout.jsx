import AppLayout from "./AppLayout";
import OperationsManagerMenu from "../menus/OperationsManagerMenu";
import { ProjectProvider } from "../context/ProjectContext";

function OperationsManagerLayout({ children }) {
  return (
    <ProjectProvider>
      <AppLayout menuItems={OperationsManagerMenu}>
        {children}
      </AppLayout>
    </ProjectProvider>
  );
}

export default OperationsManagerLayout;