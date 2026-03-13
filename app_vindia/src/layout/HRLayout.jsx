import HRSidebar from "../components/hr/HRSidebar";
import Navbar from "../components/Navbar";

function HRLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      
      {/* HR SIDEBAR */}
      <HRSidebar />

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        <Navbar />

        <div style={{ padding: "30px", background: "#f1f5f9", flex: 1 }}>
          {children}
        </div>

      </div>

    </div>
  );
}

export default HRLayout;