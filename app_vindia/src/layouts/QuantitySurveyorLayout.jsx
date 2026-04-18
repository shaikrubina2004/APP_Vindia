import AppLayout from "./AppLayout";
import QuantitySurveyorMenu from "../menus/QuantitySurveyorMenu";

function QuantitySurveyorLayout({ children }) {
  return (
    <AppLayout menuItems={QuantitySurveyorMenu}>
      {children}
    </AppLayout>
  );
}

export default QuantitySurveyorLayout;