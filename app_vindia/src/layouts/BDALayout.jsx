import AppLayout from "./AppLayout";
import { bdaMenu } from "../menus/Bdamenu";
import CoverAlertPopup from "../components/bda/CoverAlertPopup";

function BDALayout({ children }) {
  return (
    <AppLayout menuItems={bdaMenu}>
      {/* pop-up when another BDA's missed follow-up is handed to this BDA */}
      <CoverAlertPopup />
      {children}
    </AppLayout>
  );
}

export default BDALayout;