import AppLayout from "./AppLayout";
import accountantMenu from "../menus/AccountantMenu";
import { ProjectProvider } from "../context/ProjectContext";

function AccountantLayout({ children }) {
  return (
    <ProjectProvider>
      <AppLayout menuItems={accountantMenu}>
        {children}
      </AppLayout>
    </ProjectProvider>
  );
}

export default AccountantLayout;