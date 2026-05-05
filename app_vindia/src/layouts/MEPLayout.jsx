import { Outlet } from "react-router-dom";  // ✅ ADD THIS
import AppLayout from "./AppLayout";
import MEPMenu from "../menus/MEPMenu";
import { ProjectProvider } from "../context/ProjectContext";

function MepLayout() {  // ✅ remove { children }
  return (
    <ProjectProvider>
      <AppLayout menuItems={MEPMenu}>
        <Outlet />  {/* ✅ replace {children} with Outlet */}
      </AppLayout>
    </ProjectProvider>
  );
}

export default MepLayout;