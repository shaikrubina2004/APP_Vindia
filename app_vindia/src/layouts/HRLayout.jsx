import AppLayout from "./AppLayout";
import { hrMenu } from "../menus/hrMenu";

function HRLayout({ children }) {

  return (
    <AppLayout menuItems={hrMenu}>
      {children}
    </AppLayout>

  );
}

export default HRLayout;