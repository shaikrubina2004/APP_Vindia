import HRSidebar from "../components/hr/HRSidebar";
import { Outlet } from "react-router-dom";
import "../styles/Layout.css";

const HRLayout = () => {
  return (
    <div className="hr-layout">
      <HRSidebar />
      <div className="hr-content">
        <Outlet />
      </div>
    </div>
  );
};

export default HRLayout;