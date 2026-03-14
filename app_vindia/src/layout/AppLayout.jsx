import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/Layout.css";

function AppLayout({ children }) {
  return (
    <div className="app-layout">

      {/* Sidebar */}
      <Sidebar  />

      {/* Main Section */}
      <div className="main-section">

        {/* Top Navbar */}
        <Navbar />

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>

      </div>

    </div>
  );
}

export default AppLayout;