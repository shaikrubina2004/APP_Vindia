import "../styles/rolePortal.css";
import AppLayout from "./AppLayout";
import siteEngineerMenu from "../menus/siteEngineerMenu";

function SiteEngineerLayout({ children }) {
  return (
    <div className="role-portal">
    <AppLayout menuItems={siteEngineerMenu} sidebarMode="full">
      {children}
    </AppLayout>
    </div>
  );
}

export default SiteEngineerLayout;