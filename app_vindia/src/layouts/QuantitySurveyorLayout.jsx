import AppLayout from "./AppLayout";
import QuantitySurveyorMenu from "../menus/QuantitySurveyorMenu";
import { ProjectProvider } from "../context/ProjectContext";

function QuantitySurveyorLayout({ children }) {
  return (
    <ProjectProvider>
      <AppLayout menuItems={QuantitySurveyorMenu}>{children}</AppLayout>
    </ProjectProvider>
  );
}

export default QuantitySurveyorLayout;
