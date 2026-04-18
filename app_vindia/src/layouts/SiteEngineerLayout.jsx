import AppLayout from "./AppLayout";
import siteEngineerMenu from "../menus/siteEngineerMenu";

function SiteEngineerLayout({ children }) {
  return (
    <AppLayout menuItems={siteEngineerMenu} sidebarMode="full">
      {children}
    </AppLayout>
  );
}

export default SiteEngineerLayout;