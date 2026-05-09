import AppLayout from "./AppLayout";
import { digitalMarketingMenu } from "../menus/DigitalMarketingMenu";

function DigitalMarketingLayout({ children }) {
  return (
    <AppLayout menuItems={digitalMarketingMenu}>
      {children}
    </AppLayout>
  );
}

export default DigitalMarketingLayout;