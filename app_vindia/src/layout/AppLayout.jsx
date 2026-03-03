import Navbar from "../components/Navbar";

function AppLayout({ children }) {
  return (
    <div>
      <Navbar />
      <div style={{ padding: "30px" }}>
        {children}
      </div>
    </div>
  );
}

export default AppLayout;   // ✅ THIS MUST EXIST