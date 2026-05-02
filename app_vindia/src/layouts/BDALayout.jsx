import AppLayout from "./AppLayout";
import { bdaMenu } from "../menus/Bdamenu";

function BDALayout({ children }) {
  return (
    <AppLayout menuItems={bdaMenu}>
      {children}
    </AppLayout>
  );
}

export default BDALayout;