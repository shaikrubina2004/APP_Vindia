import AppLayout from "./AppLayout";
import MEPMenu from "../menus/MEPMenu";

function MepLayout({ children }) {
  return <AppLayout menuItems={MEPMenu}>{children}</AppLayout>;
}

export default MepLayout;
