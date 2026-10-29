import { Outlet } from "react-router-dom";
import "../styles/rolePortal.css";
import AppLayout from "./AppLayout";
import { ClientMenu } from "../menus/ClientMenu";
import { ProjectProvider } from "../context/ProjectContext";

// Every other role's layout (ProjectManagerLayout, SiteEngineerLayout, etc.)
// takes a `children` prop and renders it directly, because RoleLayout.jsx
// calls them all the same way: <Layout>{children}</Layout>. This was the
// only one built for React Router's nested-route pattern instead
// (<Outlet />, with no children prop at all) — fine when used directly as a
// route element with real nested <Route> children, but when RoleLayout
// invokes it for a shared page like Settings, the children it passes were
// silently dropped and <Outlet /> had no matching route context to render
// into, so the whole page came back blank. Falling back to <Outlet /> only
// when no children are given keeps both call sites working.
function ClientLayout({ children }) {
  return (
    <div className="role-portal">
      <ProjectProvider>
        <AppLayout menuItems={ClientMenu}>
          {children ?? <Outlet />}
        </AppLayout>
      </ProjectProvider>
    </div>
  );
}

export default ClientLayout;
