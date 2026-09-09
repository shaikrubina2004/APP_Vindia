import AppLayout from "./AppLayout";
import { officeAdministratorMenu } from "../menus/OfficeAdministratorMenu";

function OfficeAdministratorLayout({ children }) {
  return (
    <AppLayout menuItems={officeAdministratorMenu}>
      {children}
    </AppLayout>
  );
}

export default OfficeAdministratorLayout;