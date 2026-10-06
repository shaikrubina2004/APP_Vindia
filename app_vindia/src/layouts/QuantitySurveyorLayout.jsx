import "../styles/rolePortal.css";
import AppLayout from "./AppLayout";
import QuantitySurveyorMenu from "../menus/QuantitySurveyorMenu";
import { ProjectProvider } from "../context/ProjectContext";

function QuantitySurveyorLayout({ children }) {
  return (
    <div className="role-portal">
    <ProjectProvider>
      <AppLayout menuItems={QuantitySurveyorMenu}>{children}</AppLayout>
    </ProjectProvider>
    </div>
  );
}

export default QuantitySurveyorLayout;
