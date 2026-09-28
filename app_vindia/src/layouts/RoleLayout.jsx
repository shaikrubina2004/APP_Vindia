import { useAuth } from "../context/useAuth";
import AppLayout from "./AppLayout";
import CEOLayout from "./CEOLayout";
import HRLayout from "./HRLayout";
import BDALayout from "./BDALayout";
import FinanceLayout from "./FinanceManagerLayout";
import AccountantLayout from "./AccountantLayout";
import ArchitectLayout from "./ArchitectLayout";
import ClientLayout from "./ClientLayout";
import DigitalMarketingLayout from "./DigitalMarketingLayout";
import InventoryControllerLayout from "./InventoryControllerLayout";
import LogisticsCoordinatorLayout from "./LogisticsCoordinatorLayout";
import MEPLayout from "./MEPLayout";
import OfficeAdministratorLayout from "./OfficeAdministratorLayout";
import OperationsManagerLayout from "./OperationsManagerLayout";
import ProcurementOfficerLayout from "./ProcurementOfficerLayout";
import ProjectCoordinatorLayout from "./ProjectCoordinatorLayout";
import ProjectManagerLayout from "./ProjectManagerLayout";
import QuantitySurveyorLayout from "./QuantitySurveyorLayout";
import SiteEngineerLayout from "./SiteEngineerLayout";
import StructuralEngineerLayout from "./StructuralEngineerLayout";
import ThreeDVisualizerLayout from "./ThreeDVisualizerLayout";

/* Shared pages (Settings, Report to CEO) are used by many roles.
   This picks the right sidebar/layout for whoever is logged in, so each
   role stays inside its own portal instead of jumping to a generic one. */
const LAYOUT_BY_ROLE = {
  ceo: CEOLayout,
  hr_manager: HRLayout,
  hr_executive: HRLayout,
  bda: BDALayout,
  bd_manager: BDALayout,
  finance_manager: FinanceLayout,
  accountant: AccountantLayout,
  architect: ArchitectLayout,
  client: ClientLayout,
  digital_marketing: DigitalMarketingLayout,
  inventory_controller: InventoryControllerLayout,
  logistics_coordinator: LogisticsCoordinatorLayout,
  mep_engineer: MEPLayout,
  office_administrator: OfficeAdministratorLayout,
  operations_manager: OperationsManagerLayout,
  procurement_officer: ProcurementOfficerLayout,
  project_coordinator: ProjectCoordinatorLayout,
  project_manager: ProjectManagerLayout,
  quantity_surveyor: QuantitySurveyorLayout,
  site_engineer: SiteEngineerLayout,
  structural_engineer: StructuralEngineerLayout,
  "3d_visualizer": ThreeDVisualizerLayout,
};

export default function RoleLayout({ children }) {
  const { user } = useAuth();
  const Layout = LAYOUT_BY_ROLE[user?.role] || AppLayout;
  return <Layout>{children}</Layout>;
}