import AppLayout from "./AppLayout";
import { StructuralEngineerMenu } from "../menus/structuralEngineerMenu";

function StructuralEngineerLayout({ children }) {
  return (
    <AppLayout menuItems={StructuralEngineerMenu}>
      {children}
    </AppLayout>
  );
}

export default StructuralEngineerLayout;