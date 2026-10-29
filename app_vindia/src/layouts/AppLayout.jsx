import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import TeamFloatingWidget from "../components/TeamFloatingWidget";
import "../styles/Layout.css";

function AppLayout({
  menuItems = [],
  children,
  notificationSlot = null,
}) {
  return (
    <>
      <Navbar notificationSlot={notificationSlot} />

      <div className="app-layout">
        <Sidebar menuItems={menuItems} />

        <div className="main-section">
          <div className="page-content">
            {children}
          </div>
        </div>
      </div>

      {/* Floating "My Project Team" button + pop-outs. Hides itself when you are not on a project. */}
      <TeamFloatingWidget />
    </>
  );
}

export default AppLayout;