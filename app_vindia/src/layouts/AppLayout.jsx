import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
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
    </>
  );
}

export default AppLayout;