import "../styles/rolePortal.css";
import AppLayout from "./AppLayout";
import OfficeAdministratorMenu from "../menus/OfficeAdministratorMenu";
import { ProjectProvider } from "../context/ProjectContext";

function OfficeAdministratorLayout({ children }) {
  return (
    <div className="role-portal">
      <ProjectProvider>
        <AppLayout menuItems={OfficeAdministratorMenu}>
          {children}
        </AppLayout>
      </ProjectProvider>
    </div>
  );
}

export default OfficeAdministratorLayout;