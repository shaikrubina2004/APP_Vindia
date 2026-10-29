import "../styles/rolePortal.css";
import "../styles/opsTheme.css";
import AppLayout from "./AppLayout";
import OperationsManagerMenu from "../menus/OperationsManagerMenu";
import { ProjectProvider } from "../context/ProjectContext";

function OperationsManagerLayout({ children }) {
  return (
    <div className="role-portal operations-manager-portal">
      <ProjectProvider>
        <AppLayout menuItems={OperationsManagerMenu}>
          {children}
        </AppLayout>
      </ProjectProvider>
    </div>
  );
}

export default OperationsManagerLayout;