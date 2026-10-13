import "../styles/opsShared.css";
import "../styles/opsTheme.css";
import AppLayout from "./AppLayout";
import { logisticsCoordinatorMenu } from "../menus/LogisticsCoordinatorMenu";

function LogisticsCoordinatorLayout({ children }) {
  return (
    <AppLayout menuItems={logisticsCoordinatorMenu}>
      {children}
    </AppLayout>
  );
}

export default LogisticsCoordinatorLayout;