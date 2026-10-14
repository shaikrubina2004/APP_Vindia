import "../styles/opsShared.css";
import "../styles/opsTheme.css";
import AppLayout from "./AppLayout";
import { procurementOfficerMenu } from "../menus/ProcurementOfficerMenu";

function ProcurementOfficerLayout({ children }) {
  return (
    <AppLayout menuItems={procurementOfficerMenu}>
      {children}
    </AppLayout>
  );
}

export default ProcurementOfficerLayout;