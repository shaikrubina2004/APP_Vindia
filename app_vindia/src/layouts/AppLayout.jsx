import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import TeamFloatingWidget from "../components/TeamFloatingWidget";
import { useAuth } from "../context/useAuth";
import "../styles/Layout.css";

function AppLayout({
  menuItems = [],
  children,
  notificationSlot = null,
}) {
  const { user } = useAuth();
  const role = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const isClient = role === "client";
  const hasTimesheet = menuItems.some((item) => item.path === "/timesheet");
  const visibleMenuItems = isClient
    ? menuItems.filter((item) => item.path !== "/timesheet")
    : hasTimesheet
      ? menuItems
      : [...menuItems, { name: "My Timesheet", path: "/timesheet", icon: "clock" }];

  return (
    <>
      <Navbar notificationSlot={notificationSlot} />

      <div className="app-layout">
        <Sidebar menuItems={visibleMenuItems} />

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