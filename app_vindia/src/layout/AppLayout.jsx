import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function AppLayout({ children }) {
  return (
    <div>
      {/* Top Navbar */}
      <Navbar />

      {/* Sidebar + Page Content */}
      <div style={{ display: "flex", marginTop: "70px" }}>
        <Sidebar />

        <div
          style={{
            flex: 1,
            padding: "30px",
            background: "#f1f5f9",
            minHeight: "100vh",
            marginLeft: "110px" 
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default AppLayout;