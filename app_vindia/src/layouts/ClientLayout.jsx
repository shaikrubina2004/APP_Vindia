import { Outlet } from "react-router-dom";
import "../styles/rolePortal.css";
import AppLayout from "./AppLayout";
import { ClientMenu } from "../menus/ClientMenu";
import { ProjectProvider } from "../context/ProjectContext";

function ClientLayout() {
  return (
    <div className="role-portal">
      <ProjectProvider>
        <AppLayout menuItems={ClientMenu}>
          <Outlet />
        </AppLayout>
      </ProjectProvider>
    </div>
  );
}

export default ClientLayout;
