import { Outlet } from "react-router-dom";
import AppLayout from "./AppLayout";
import { StructuralEngineerMenu } from "../menus/structuralEngineerMenu";
import { SENotificationProvider } from "../context/SENotificationProvider";
import SENotificationBell from "../components/notifications/SENotificationBell";
import { ProjectProvider } from "../context/ProjectContext";

export default function StructuralEngineerLayout() {
  return (
    <SENotificationProvider>
      <ProjectProvider>
        {" "}
        <AppLayout
          menuItems={StructuralEngineerMenu}
          notificationSlot={<SENotificationBell />}
        >
          <Outlet />
        </AppLayout>
      </ProjectProvider>
    </SENotificationProvider>
  );
}
