import AppLayout from "./AppLayout";
import { StructuralEngineerMenu } from "../menus/structuralEngineerMenu";
import { SENotificationProvider } from "../context/SENotificationProvider";
import SENotificationBell from "../components/notifications/SENotificationBell";

function StructuralEngineerLayout({ children }) {
  return (
    <SENotificationProvider>
      <AppLayout
        menuItems={StructuralEngineerMenu}
        notificationSlot={<SENotificationBell />}
      >
        {children}
      </AppLayout>
    </SENotificationProvider>
  );
}

export default StructuralEngineerLayout;