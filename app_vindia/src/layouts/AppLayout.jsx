import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import "../styles/Layout.css";

function AppLayout({ menuItems, children }) {

  return (
    <div className="app-layout">

      <Sidebar menuItems={menuItems} />

      <div className="main-section">

        <Navbar />

        <div className="page-content">
          {children}
        </div>

      </div>

    </div>
  );
}

export default AppLayout;