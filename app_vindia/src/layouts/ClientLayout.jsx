import { Outlet } from "react-router-dom";
import "../styles/rolePortal.css";
import AppLayout from "./AppLayout";
import { ClientMenu } from "../menus/ClientMenu";

function ClientLayout() {
  return (
    <div className="role-portal client-portal">
      <AppLayout menuItems={ClientMenu}>
        <Outlet />
      </AppLayout>
    </div>
  );
}

export default ClientLayout;
