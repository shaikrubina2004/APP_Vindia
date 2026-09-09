import AppLayout from "./AppLayout";
import { inventoryControllerMenu } from "../menus/InventoryControllerMenu";

function InventoryControllerLayout({ children }) {
  return (
    <AppLayout menuItems={inventoryControllerMenu}>
      {children}
    </AppLayout>
  );
}

export default InventoryControllerLayout;