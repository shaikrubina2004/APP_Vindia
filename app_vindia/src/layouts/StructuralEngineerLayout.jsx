// FILE PATH: src/layouts/StructuralEngineerLayout.jsx

import { Outlet }                  from "react-router-dom";
import AppLayout                   from "./AppLayout";
import { StructuralEngineerMenu }  from "../menus/structuralEngineerMenu";
import { SENotificationProvider }  from "../context/SENotificationProvider";
import SENotificationBell          from "../components/notifications/SENotificationBell";

export default function StructuralEngineerLayout() {
  return (
    <SENotificationProvider>
      <AppLayout
        menuItems={StructuralEngineerMenu}
        notificationSlot={<SENotificationBell />}
      >
        <Outlet />
      </AppLayout>
    </SENotificationProvider>
  );
}