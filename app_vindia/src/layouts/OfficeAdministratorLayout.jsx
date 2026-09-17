import AppLayout from "./AppLayout";
import OfficeAdministratorMenu from "../menus/OfficeAdministratorMenu";
import { ProjectProvider } from "../context/ProjectContext";

function OfficeAdministratorLayout({ children }) {
  return (
    <ProjectProvider>
      <AppLayout menuItems={OfficeAdministratorMenu}>
        {children}
      </AppLayout>
    </ProjectProvider>
  );
}

export default OfficeAdministratorLayout;