import AppLayout from "./AppLayout";
import financeMenu from "../menus/financeMenu";
import { ProjectProvider } from "../context/ProjectContext";

function FinanceManagerLayout({ children }) {
  // console.log("financeMenu sample:", financeMenu[0]); // ← add this
  return (
    <ProjectProvider>
      <AppLayout menuItems={financeMenu}>
        {children}
      </AppLayout>
    </ProjectProvider>
  );
}

export default FinanceManagerLayout;