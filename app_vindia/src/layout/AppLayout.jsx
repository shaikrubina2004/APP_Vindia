import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/Layout.css";

function AppLayout({ children }) {

  return (
    <div className="app-layout">

      <Sidebar />

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