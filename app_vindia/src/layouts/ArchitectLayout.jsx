import AppLayout from "./AppLayout";
import { ArchitectMenu } from "../menus/ArchitectMenu";

function ArchitectLayout({ children }) {
  return (
    <AppLayout menuItems={ArchitectMenu}>
      {children}
    </AppLayout>
  );
}

export default ArchitectLayout;