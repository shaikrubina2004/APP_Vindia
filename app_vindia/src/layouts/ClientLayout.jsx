// src/layouts/ClientLayout.jsx

import { Outlet } from "react-router-dom";
import AppLayout from "./AppLayout";
import { ClientMenu } from "../menus/ClientMenu";
import { ProjectProvider } from "../context/ProjectContext";

function ClientLayout() {
  return (
    <ProjectProvider>
      <AppLayout menuItems={ClientMenu}>
        <Outlet />
      </AppLayout>
    </ProjectProvider>
  );
}

export default ClientLayout;
