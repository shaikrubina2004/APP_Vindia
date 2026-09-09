import AppLayout from "./AppLayout";
import { operationsManagerMenu } from "../menus/OperationsManagerMenu";

function OperationsManagerLayout({ children }) {
  return (
    <AppLayout menuItems={operationsManagerMenu}>
      {children}
    </AppLayout>
  );
}

export default OperationsManagerLayout;