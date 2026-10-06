// src/routes/AppRoutes.jsx

// FINAL MERGED VERSION

import { Routes, Route, Navigate } from "react-router-dom";

/* ── AUTH ────────────────────────────────────────────────── */

import SignIn from "../pages/SignIn";

import SignUp from "../pages/SignUp";

/* ── CEO ─────────────────────────────────────────────────── */

import Dashboard from "../pages/ceo/Dashboard";

import CEOPanel from "../pages/ceo/CEOPanel";

import UserManagement from "../pages/ceo/UserManagement";

import ProjectManagement from "../pages/ceo/ProjectManagement";

/* ── HR ──────────────────────────────────────────────────── */

import HRDashboard from "../pages/hr/HRDashboard";

import Employees from "../pages/hr/Employees";

import AddEmployee from "../pages/hr/AddEmployee";

import EmployeeDetails from "../pages/hr/EmployeeDetails";

import Attendance from "../pages/hr/Attendance";

import Documents from "../pages/hr/Documents";

import Leaves from "../pages/hr/Leaves";

import Payroll from "../pages/hr/Payroll";

import Travel from "../pages/hr/Travel";

import TravelRequest from "../pages/hr/TravelRequest";

// HR Recruitment

import JobOpenings from "../pages/hr/recruitment/JobOpenings";

import JobOpeningDetail from "../pages/hr/recruitment/JobOpeningDetail";

import CandidateDetail from "../pages/hr/recruitment/CandidateDetail";

/* ── DIGITAL MARKETING ───────────────────────────────────── */

import DigitalMarketing from "../pages/business-development/digital-marketing/DigitalMarketing";

import DMCampaigns from "../pages/business-development/digital-marketing/Campaigns";

import DMReports from "../pages/business-development/digital-marketing/Reports";

import DigitalMarketingLayout from "../layouts/DigitalMarketingLayout";

/* ── 3D VISUALIZER ───────────────────────────────────────── */

import ThreeDVisualizerDashboard from "../pages/3DVisualizer/ThreeDVisualizerDashboard";

import ThreeDVisualizerLayout from "../layouts/ThreeDVisualizerLayout";

import Model from "../pages/3DVisualizer/Model";

/* ── PROJECT MANAGER ─────────────────────────────────────── */

import TeamManagement from "../pages/projects/projectmanager/TeamManagement";

import DailyUpdates from "../pages/projects/projectmanager/DailyUpdates";

import Reports from "../pages/projects/projectmanager/Reports";

import Pmcostreports from "../pages/projects/projectmanager/Pmcostreports";

import ProjectApprovals from "../pages/projects/projectmanager/ProjectApprovals";

import ApprovalRequests from "../pages/siteEngineer/ApprovalRequests";
import ProjectManagerLabour from "../pages/projects/projectmanager/Projectmanagerlabour";

/* ── OPERATIONS ──────────────────────────────────────────── */

import CreatePO from "../pages/operations/PurchaseOrders/CreatePO";

import PurchaseOrderList from "../pages/operations/PurchaseOrders/PurchaseOrderList";

import PurchaseOrderDetail from "../pages/operations/PurchaseOrders/PurchaseOrderDetail";

import ApprovedRequests from "../pages/operations/MaterialRequests/ApprovedRequests";

import VendorsView from "../pages/operations/procurement/VendorsView";

import ProcurementDailyReport from "../pages/operations/procurement/ProcurementDailyReport";

/* ── SHARED COMPONENTS ───────────────────────────────────── */

import AppShell from "../components/incidents/AppShell";

import SharedDrawingPage from "../components/project/SharedDrawingPage";

/* ── SITE ENGINEER ───────────────────────────────────────── */

import SiteEngineerRoutes from "./SiteEngineerRoutes";

/* ── QUANTITY SURVEYOR ───────────────────────────────────── */

import QuantitySurveyorDashboard from "../pages/Quality Surveyor/QuantitySurveyorDashboard";

import Qsdailyupdates from "../pages/Quality Surveyor/Qsdailyupdates";

import Qsboq from "../pages/Quality Surveyor/Qsboq";

import Qsquantityreport from "../pages/Quality Surveyor/Qsquantityreport";

import Qscostreport from "../pages/Quality Surveyor/Qscostreport";

import Qsmeasurement from "../pages/Quality Surveyor/Qsmeasurement";

/* ── MEP ─────────────────────────────────────────────────── */

import MEPRoutes from "./MepRoutes";

import ClientRoutes from "./ClientRoutes";

import MEPCoordination from "../pages/MEP Engineer/MEPCoordination";

/* ── OTHER ROLES ─────────────────────────────────────────── */

import PlanningEngineerDashboard from "../pages/Planning Engineer/PlanningEngineerDashboard";

import QCDashboard from "../pages/QC Engineer/QCDashboard";

import SafetyOfficerDashboard from "../pages/Safety Officer/SafetyOfficerDashboard";

/* ── STRUCTURAL ──────────────────────────────────────────── */

import StructuralRoutes from "./StructuralRoutes";

/* ── FINANCE ──────────────────────────────────────────────── */

import FinanceRoutes from "./FinanceRoutes";

import FinanceLayout from "../layouts/FinanceManagerLayout";

/* ── ACCOUNTANT ──────────────────────────────────────────── */

import AccountantRoutes from "./AccountantRoutes";

import AccountantLayout from "../layouts/AccountantLayout";

/* ── ARCHITECT ───────────────────────────────────────────── */

import ArchitectDashboard from "../pages/Architect/ArchitectDashboard";

import ArchitectDailyLogins from "../pages/Architect/ArchitectDailyLogins";

import ArchitectDesigns from "../pages/Architect/ArchitectDesigns";

import ArchitectAssign from "../pages/Architect/ArchitectAssign";

import ArchitectProject from "../pages/Architect/ArchitectProject";

import ArchitectSnagList from "../pages/Architect/ArchitectSnagList";

/* ── RFI ─────────────────────────────────────────────────── */

import RFIPage from "../pages/StructuralEngineer/RFI";

import RFIDetailPage from "../pages/StructuralEngineer/RFIDetails";

/* ── PROJECT COORDINATOR ─────────────────────────────────── */

import ProjectCoordinatorDashboard from "../pages/Project Coordinator/ProjectCoordinatorDashboard";

import DailyUpdatesPC from "../pages/Project Coordinator/DailyUpdates";

import Milestone from "../pages/Project Coordinator/Milestone";

import Payment from "../pages/Project Coordinator/Payment";

/* ── BDA ─────────────────────────────────────────────────── */

import BDADashboard from "../pages/business-development/business-development-analyst/BDADashboard";

import BDALeads from "../pages/business-development/business-development-analyst/BDALeads";

import BDAAddLead from "../pages/business-development/business-development-analyst/BDAAddLead";

import BDAFollowUp from "../pages/business-development/business-development-analyst/BDAFollowUp";

import BDAReportsWithRole from "../pages/business-development/business-development-analyst/BDAReportsWithRole";

/* ── OPERATIONS & ADMINISTRATION ─────────────────────────── */

import OperationsManagerDashboard from "../pages/operations/manager/OperationsManagerDashboard";

import OfficeAdministratorDashboard from "../pages/operations/administrator/OfficeAdministratorDashboard";

import ProcurementOfficerDashboard from "../pages/operations/procurement/ProcurementOfficerDashboard";

import LogisticsCoordinatorDashboard from "../pages/operations/logistics/LogisticsCoordinatorDashboard";

import InventoryControllerDashboard from "../pages/operations/inventory/InventoryControllerDashboard";

/* Operations control-tower nested routes */
import OperationsManagerRoutes from "./OperationsManagerRoutes";
import OfficeAdministratorRoutes from "./OfficeAdministratorRoutes";
import DeliveryFollowUp from "../pages/operations/procurement/DeliveryFollowUp";

/* ── COMMON ──────────────────────────────────────────────── */

import Timesheet from "../pages/timesheet/Timesheet";

import ProtectedRoute from "./ProtectedRoute";

import { ROLES } from "../roles";

import { NotificationProvider } from "../context/Notificationcontext";

/* ── LAYOUTS ─────────────────────────────────────────────── */

import CEOLayout from "../layouts/CEOLayout";

import HRLayout from "../layouts/HRLayout";

import ProjectManagerLayout from "../layouts/ProjectManagerLayout";

import SiteEngineerLayout from "../layouts/SiteEngineerLayout";

import QuantitySurveyorLayout from "../layouts/QuantitySurveyorLayout";

import ProjectCoordinatorLayout from "../layouts/ProjectCoordinatorLayout";

import ArchitectLayout from "../layouts/ArchitectLayout";

import BDALayout from "../layouts/BDALayout";

import OperationsManagerLayout from "../layouts/OperationsManagerLayout";

import OfficeAdministratorLayout from "../layouts/OfficeAdministratorLayout";

import ProcurementOfficerLayout from "../layouts/ProcurementOfficerLayout";

import LogisticsCoordinatorLayout from "../layouts/LogisticsCoordinatorLayout";

import InventoryControllerLayout from "../layouts/InventoryControllerLayout";

/* ── INVENTORY / LOGISTICS ───────────────────────────────── */

import ItemMaster from "../pages/operations/inventory/ItemMaster";

import StockIn from "../pages/operations/inventory/StockIn";

import StockOut from "../pages/operations/inventory/StockOut";

import Deliveries from "../pages/operations/logistics/Deliveries";

import InventoryDailyUpdate from "../pages/operations/inventory/InventoryDailyUpdate";

import LogisticsDailyUpdate from "../pages/operations/logistics/LogisticsDailyUpdate";

import OperationsDailyUpdatesReview from "../pages/operations/manager/OperationsDailyUpdatesReview";

/* ── REPORTS / ANALYTICS / SETTINGS ──────────────────────── */

// IMPORTANT: Folder name must exactly match your project.

// If your folder is "SharedResourse", keep it as below.

import ManagerReports from "../SharedResourse/ManagerReports";

import Settings from "../SharedResourse/Settings";

import ReportsInbox from "../pages/ceo/ReportsInbox";

import Analytics from "../pages/ceo/Analytics";

import BDADailyUpdate from "../pages/business-development/business-development-analyst/BDADailyUpdate";

import CeoReports from "../pages/ceo/Reports";

import RoleLayout from "../layouts/RoleLayout";

/* ═══════════════════════════════════════════════════════════

   APP ROUTES

═══════════════════════════════════════════════════════════ */

const AppRoutes = () => {

  const PROJECT_ROLES = [

    ROLES.PROJECT_MANAGER,

    ROLES.PROJECT_COORDINATOR,

    ROLES.SITE_ENGINEER,

    ROLES.MEP_ENGINEER,

    ROLES.QUANTITY_SURVEYOR,

    ROLES.STRUCTURAL_ENGINEER,

    ROLES.PLANNING_ENGINEER,

    ROLES.SAFETY_OFFICER,

    ROLES.QC_ENGINEER,

  ];
  const INTERNAL_ROLES = Object.values(ROLES).filter(
  (role) => role !== ROLES.CLIENT
);

  return (

    <NotificationProvider>

      <Routes>

        {/* ══ AUTH ══════════════════════════════════════════ */}

        <Route path="/" element={<SignIn />} />

        <Route path="/signup" element={<SignUp />} />

        {/* ══ CEO ═══════════════════════════════════════════ */}

        <Route

          path="/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR_MANAGER]}>

              <CEOLayout>

                <Dashboard />

              </CEOLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/ceo"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO]}>

              <CEOLayout>

                <CEOPanel />

              </CEOLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/users"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO]}>

              <CEOLayout>

                <UserManagement />

              </CEOLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/project-manager/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.PROJECT_MANAGER]}>

              <ProjectManagerLayout>

                <ProjectManagement />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ PROJECT MANAGER ═══════════════════════════════ */}

        <Route

          path="/pm/team"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.PROJECT_MANAGER]}>

              <ProjectManagerLayout>

                <TeamManagement />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/pm/labour"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.PROJECT_MANAGER]}>

              <ProjectManagerLayout>

                <ProjectManagerLabour />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/pm/incidents"

          element={

            <ProtectedRoute

              allowedRoles={[

                ROLES.CEO,

                ROLES.MEP_ENGINEER,

                ROLES.PROJECT_MANAGER,

              ]}

            >

              <ProjectManagerLayout>

                <AppShell key="pm-incidents" />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/pm/daily-updates"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.PROJECT_MANAGER]}>

              <ProjectManagerLayout>

                <DailyUpdates />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/pm/cost-reports"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.PROJECT_MANAGER]}>

              <ProjectManagerLayout>

                <Pmcostreports />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/pm/project-approvals"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.PROJECT_MANAGER]}>

              <ProjectManagerLayout>

                <ProjectApprovals />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/pm/reports"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.PROJECT_MANAGER]}>

              <ProjectManagerLayout>

                <Reports />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/project-manager/approvals"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROJECT_MANAGER]}>

              <ProjectManagerLayout>

                <ApprovalRequests />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ HR ════════════════════════════════════════════ */}

        <Route

          path="/hr"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <HRDashboard />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/employees"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <Employees />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/add-employee"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <AddEmployee />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/employee/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <EmployeeDetails />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/attendance"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <Attendance />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/documents"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <Documents />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/payroll"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <Payroll />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/travel"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <Travel />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/leaves"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <Leaves />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/travelrequest"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <TravelRequest />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        {/* ── HR RECRUITMENT ─────────────────────────────── */}

        <Route

          path="/hr/recruitment/job-openings"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <JobOpenings />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/recruitment/job-openings/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <JobOpeningDetail />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/incidents"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <AppShell key="hr-incidents" />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/rfi"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <RFIPage />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/rfi/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <RFIDetailPage />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/hr/recruitment/candidates/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.HR_MANAGER, ROLES.CEO]}>

              <HRLayout>

                <CandidateDetail />

              </HRLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ SITE ENGINEER ═════════════════════════════════ */}

          {SiteEngineerRoutes}

        {/* ══ QUANTITY SURVEYOR ═════════════════════════════ */}

        <Route
          path="/quantity-surveyor/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><QuantitySurveyorDashboard /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/daily-updates"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><Qsdailyupdates /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/quantity-report"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><Qsquantityreport /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/cost-report"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><Qscostreport /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/boq"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><Qsboq /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/coordination"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><MEPCoordination /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/rfi"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><RFIPage /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/incident"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><AppShell key="qs-incidents" /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/measurement"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR, ROLES.PROJECT_MANAGER, ROLES.SITE_ENGINEER, ROLES.CEO]}>
              <QuantitySurveyorLayout><Qsmeasurement /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor/approvals"
          element={
            <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR]}>
              <QuantitySurveyorLayout><ApprovalRequests /></QuantitySurveyorLayout>
            </ProtectedRoute>
          }
        />

        {/* ══ MEP / CLIENT ══════════════════════════════════ */}

        <Route
          path="/mep/*"
          element={
            <ProtectedRoute allowedRoles={[ROLES.MEP_ENGINEER, ROLES.CEO]}>
              <MEPRoutes />
            </ProtectedRoute>
          }
        />

        <Route path="/client/*" element={<ProtectedRoute allowedRoles={[ROLES.CLIENT, ROLES.CEO]}><ClientRoutes /></ProtectedRoute>} />

        {/* ══ PLANNING / QC / SAFETY ════════════════════════ */}

        <Route

          path="/planning-engineer/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PLANNING_ENGINEER, ROLES.CEO]}>

              <ProjectManagerLayout>

                <PlanningEngineerDashboard />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/qc/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.QC_ENGINEER, ROLES.CEO]}>

              <ProjectManagerLayout>

                <QCDashboard />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/safety/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.SAFETY_OFFICER, ROLES.CEO]}>

              <ProjectManagerLayout>

                <SafetyOfficerDashboard />

              </ProjectManagerLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ STRUCTURAL ════════════════════════════════════ */}

        <Route

          path="/structural-engineer/*"

          element={

            <ProtectedRoute

              allowedRoles={[ROLES.STRUCTURAL_ENGINEER, ROLES.CEO]}

            >

              <StructuralRoutes />

            </ProtectedRoute>

          }

        />

        {/* ══ FINANCE ═══════════════════════════════════════ */}

        <Route

          path="/finance-manager/*"

          element={

            <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>

              <FinanceLayout>

                <FinanceRoutes />

              </FinanceLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ ACCOUNTANT ════════════════════════════════════ */}

        <Route

          path="/accountant/*"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ACCOUNTANT]}>

              <AccountantLayout>

                <AccountantRoutes />

              </AccountantLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ ARCHITECT ═════════════════════════════════════ */}

        <Route

          path="/architect/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <ArchitectDashboard />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/snags"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <ArchitectSnagList />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/logs"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <ArchitectDailyLogins />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/approvals"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <ApprovalRequests />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/designs"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <ArchitectDesigns />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/3d-models"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <Model currentRole="architect" />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/assign"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <ArchitectAssign />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/projects"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <ArchitectProject />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/rfi"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <RFIPage />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/rfi/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <RFIDetailPage />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/shared/drawings"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <SharedDrawingPage />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/incidents"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>

              <ArchitectLayout>

                <AppShell key="arch-incidents" />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/architect/travelrequest"

          element={

            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>

              <ArchitectLayout>

                <TravelRequest />

              </ArchitectLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ 3D VISUALIZER ════════════════════════════════ */}

        <Route

          path="/3d-visualizer/dashboard"

          element={

            <ProtectedRoute

              allowedRoles={[ROLES.THREE_D_VISUALIZER, ROLES.CEO]}

            >

              <ThreeDVisualizerLayout>

                <ThreeDVisualizerDashboard />

              </ThreeDVisualizerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/3d-visualizer/drawings"

          element={

            <ProtectedRoute

              allowedRoles={[ROLES.THREE_D_VISUALIZER, ROLES.CEO]}

            >

              <ThreeDVisualizerLayout>

                <ArchitectDesigns />

              </ThreeDVisualizerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/3d-visualizer/tasks"

          element={

            <ProtectedRoute

              allowedRoles={[ROLES.THREE_D_VISUALIZER, ROLES.CEO]}

            >

              <ThreeDVisualizerLayout>

                <AppShell key="viz-tasks" />

              </ThreeDVisualizerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/3d-visualizer/rfi"

          element={

            <ProtectedRoute

              allowedRoles={[ROLES.THREE_D_VISUALIZER, ROLES.CEO]}

            >

              <ThreeDVisualizerLayout>

                <RFIPage />

              </ThreeDVisualizerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/3d-visualizer/rfi/:id"

          element={

            <ProtectedRoute

              allowedRoles={[ROLES.THREE_D_VISUALIZER, ROLES.CEO]}

            >

              <ThreeDVisualizerLayout>

                <RFIDetailPage />

              </ThreeDVisualizerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/3d-visualizer/models"

          element={

            <ProtectedRoute

              allowedRoles={[ROLES.THREE_D_VISUALIZER, ROLES.CEO]}

            >

              <ThreeDVisualizerLayout>

                <Model />

              </ThreeDVisualizerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/3d-visualizer/incidents"

          element={

            <ProtectedRoute

              allowedRoles={[ROLES.THREE_D_VISUALIZER, ROLES.CEO]}

            >

              <ThreeDVisualizerLayout>

                <AppShell key="viz-incidents" />

              </ThreeDVisualizerLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ PROJECT COORDINATOR ═══════════════════════════ */}

        <Route
          path="/project-coordinator/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR, ROLES.CEO]}>
              <ProjectCoordinatorLayout><ProjectCoordinatorDashboard /></ProjectCoordinatorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project-coordinator/daily"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR, ROLES.CEO]}>
              <ProjectCoordinatorLayout><DailyUpdatesPC /></ProjectCoordinatorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project-coordinator/milestone"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR, ROLES.CEO]}>
              <ProjectCoordinatorLayout><Milestone /></ProjectCoordinatorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project-coordinator/payments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR, ROLES.CEO]}>
              <ProjectCoordinatorLayout><Payment /></ProjectCoordinatorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project-coordinator/designs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR, ROLES.CEO]}>
              <ProjectCoordinatorLayout><ArchitectDesigns /></ProjectCoordinatorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project-coordinator/incidents"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR, ROLES.CEO]}>
              <ProjectCoordinatorLayout><AppShell key="pc-incidents" /></ProjectCoordinatorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project-coordinator/rfi"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR, ROLES.CEO]}>
              <ProjectCoordinatorLayout><RFIPage /></ProjectCoordinatorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project-coordinator/rfi/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR, ROLES.CEO]}>
              <ProjectCoordinatorLayout><RFIDetailPage /></ProjectCoordinatorLayout>
            </ProtectedRoute>
          }
        />

        {/* ══ TIMESHEET ═════════════════════════════════════ */}

        <Route

          path="/timesheet"

          element={

            <ProtectedRoute

              allowedRoles={INTERNAL_ROLES}

            >

              <RoleLayout>

                <Timesheet />

              </RoleLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ BDA ═══════════════════════════════════════════ */}

        <Route

          path="/business-development/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.BDA]}>

              <BDALayout>

                <BDADashboard />

              </BDALayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/bda/leads"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.BDA]}>

              <BDALayout>

                <BDALeads />

              </BDALayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/bda/add-lead"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.BDA]}>

              <BDALayout>

                <BDAAddLead />

              </BDALayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/bda/follow-up"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.BDA]}>

              <BDALayout>

                <BDAFollowUp />

              </BDALayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/bda/reports"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.BDA]}>

              <BDALayout>

                <BDAReportsWithRole />

              </BDALayout>

            </ProtectedRoute>

          }

        />

        <Route

        path="/bda/daily-update"

        element={

          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.BDA]}>

            <BDALayout>

              <BDADailyUpdate />

            </BDALayout>

          </ProtectedRoute>

        }

      />

        {/* ══ DIGITAL MARKETING ═════════════════════════════ */}

        <Route

          path="/digital-marketing/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.DIGITAL_MARKETING, ROLES.CEO]}>

              <DigitalMarketingLayout>

                <DigitalMarketing />

              </DigitalMarketingLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/digital-marketing/campaigns"

          element={

            <ProtectedRoute allowedRoles={[ROLES.DIGITAL_MARKETING, ROLES.CEO]}>

              <DigitalMarketingLayout>

                <DMCampaigns />

              </DigitalMarketingLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/digital-marketing/reports"

          element={

            <ProtectedRoute allowedRoles={[ROLES.DIGITAL_MARKETING, ROLES.CEO]}>

              <DigitalMarketingLayout>

                <DMReports />

              </DigitalMarketingLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/digital-marketing/incidents"

          element={

            <ProtectedRoute allowedRoles={[ROLES.DIGITAL_MARKETING, ROLES.CEO]}>

              <DigitalMarketingLayout>

                <AppShell key="dm-incidents" />

              </DigitalMarketingLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/digital-marketing/rfi"

          element={

            <ProtectedRoute allowedRoles={[ROLES.DIGITAL_MARKETING, ROLES.CEO]}>

              <DigitalMarketingLayout>

                <RFIPage />

              </DigitalMarketingLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/digital-marketing/rfi/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.DIGITAL_MARKETING, ROLES.CEO]}>

              <DigitalMarketingLayout>

                <RFIDetailPage />

              </DigitalMarketingLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ OPERATIONS & ADMINISTRATION ═══════════════════ */}

        {/* Operations Manager — nested control-tower routes. */}
        <Route
          path="/operations/manager/*"
          element={
            <ProtectedRoute allowedRoles={[ROLES.OPERATIONS_MANAGER]}>
              <OperationsManagerLayout>
                <OperationsManagerRoutes />
              </OperationsManagerLayout>
            </ProtectedRoute>
          }
        />

        {/* Office Administrator — nested administration routes. */}
        <Route
          path="/operations/administrator/*"
          element={
            <ProtectedRoute allowedRoles={[ROLES.OFFICE_ADMINISTRATOR]}>
              <OfficeAdministratorLayout>
                <OfficeAdministratorRoutes />
              </OfficeAdministratorLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/operations/procurement/delivery-follow-up"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>
              <ProcurementOfficerLayout>
                <DeliveryFollowUp />
              </ProcurementOfficerLayout>
            </ProtectedRoute>
          }
        />

        <Route

          path="/operations/procurement/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <ProcurementOfficerDashboard />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/purchase-requests"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <ApprovedRequests />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/vendors"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <VendorsView />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/daily-report"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <ProcurementDailyReport />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/logistics/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.LOGISTICS_COORDINATOR]}>

              <LogisticsCoordinatorLayout>

                <LogisticsCoordinatorDashboard />

              </LogisticsCoordinatorLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/inventory/dashboard"

          element={

            <ProtectedRoute allowedRoles={[ROLES.INVENTORY_CONTROLLER]}>

              <InventoryControllerLayout>

                <InventoryControllerDashboard />

              </InventoryControllerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/inventory"

          element={

            <ProtectedRoute allowedRoles={[ROLES.INVENTORY_CONTROLLER]}>

              <InventoryControllerLayout>

                <ItemMaster />

              </InventoryControllerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/inventory/stock-in"

          element={

            <ProtectedRoute allowedRoles={[ROLES.INVENTORY_CONTROLLER]}>

              <InventoryControllerLayout>

                <StockIn />

              </InventoryControllerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/inventory/stock-out"

          element={

            <ProtectedRoute allowedRoles={[ROLES.INVENTORY_CONTROLLER]}>

              <InventoryControllerLayout>

                <StockOut />

              </InventoryControllerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/inventory/daily-update"

          element={

            <ProtectedRoute allowedRoles={[ROLES.INVENTORY_CONTROLLER]}>

              <InventoryControllerLayout>

                <InventoryDailyUpdate />

              </InventoryControllerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/logistics/daily-update"

          element={

            <ProtectedRoute allowedRoles={[ROLES.LOGISTICS_COORDINATOR]}>

              <LogisticsCoordinatorLayout>

                <LogisticsDailyUpdate />

              </LogisticsCoordinatorLayout>

            </ProtectedRoute>

          }

        />


        <Route

          path="/operations/logistics/deliveries"

          element={

            <ProtectedRoute allowedRoles={[ROLES.LOGISTICS_COORDINATOR]}>

              <LogisticsCoordinatorLayout>

                <Deliveries />

              </LogisticsCoordinatorLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/inventory/incidents"

          element={

            <ProtectedRoute allowedRoles={[ROLES.INVENTORY_CONTROLLER]}>

              <InventoryControllerLayout>

                <AppShell key="inv-incidents" />

              </InventoryControllerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/inventory/rfi"

          element={

            <ProtectedRoute allowedRoles={[ROLES.INVENTORY_CONTROLLER]}>

              <InventoryControllerLayout>

                <RFIPage />

              </InventoryControllerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/inventory/rfi/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.INVENTORY_CONTROLLER]}>

              <InventoryControllerLayout>

                <RFIDetailPage />

              </InventoryControllerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/logistics/incidents"

          element={

            <ProtectedRoute allowedRoles={[ROLES.LOGISTICS_COORDINATOR]}>

              <LogisticsCoordinatorLayout>

                <AppShell key="log-incidents" />

              </LogisticsCoordinatorLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/logistics/rfi"

          element={

            <ProtectedRoute allowedRoles={[ROLES.LOGISTICS_COORDINATOR]}>

              <LogisticsCoordinatorLayout>

                <RFIPage />

              </LogisticsCoordinatorLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/logistics/rfi/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.LOGISTICS_COORDINATOR]}>

              <LogisticsCoordinatorLayout>

                <RFIDetailPage />

              </LogisticsCoordinatorLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/purchase-orders"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <PurchaseOrderList />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/purchase-orders/create/:requestId"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <CreatePO />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/purchase-orders/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <PurchaseOrderDetail />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/incidents"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <AppShell key="proc-incidents" />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/rfi"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <RFIPage />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/operations/procurement/rfi/:id"

          element={

            <ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_OFFICER]}>

              <ProcurementOfficerLayout>

                <RFIDetailPage />

              </ProcurementOfficerLayout>

            </ProtectedRoute>

          }

        />

        <Route

          path="/reports"

          element={

            <ProtectedRoute allowedRoles={[ROLES.CEO]}>

              <CEOLayout>

                <ReportsInbox />

              </CEOLayout>

            </ProtectedRoute>

          }

        />

                {/* ══ CEO REPORTS / ANALYTICS / MANAGER UPDATES ═════ */}

        <Route
          path="/reports-hub"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CEO]}>
              <CEOLayout>
                <CeoReports />
              </CEOLayout>
            </ProtectedRoute>
          }
        />

        {/* Old links / notifications → the single Reports page */}
        <Route
          path="/ceo/manager-updates"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CEO]}>
              <Navigate to="/reports?tab=daily" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CEO]}>
              <CEOLayout>
                <Analytics />
              </CEOLayout>
            </ProtectedRoute>
          }
        />

        {/* ══ MANAGERS: REPORT TO CEO ════════════════════════ */}

        <Route

          path="/my-reports"

          element={

            <ProtectedRoute

              allowedRoles={[

                ROLES.PROJECT_MANAGER,

                ROLES.HR_MANAGER,

                ROLES.FINANCE_MANAGER,

                ROLES.OPERATIONS_MANAGER,

                ROLES.BDA,

                ROLES.BD_MANAGER,

              ]}

            >

              <RoleLayout>

                <ManagerReports />

              </RoleLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ SETTINGS ══════════════════════════════════════ */}

        <Route

          path="/settings"

          element={

            <ProtectedRoute allowedRoles={Object.values(ROLES)}>

              <RoleLayout>

                <Settings />

              </RoleLayout>

            </ProtectedRoute>

          }

        />

        {/* ══ FALLBACK ══════════════════════════════════════ */}

        <Route

          path="*"

          element={

            <h2

              style={{

                padding: 40,

                textAlign: "center",

              }}

            >

              404 — Page Not Found

            </h2>

          }

        />

      </Routes>

    </NotificationProvider>

  );

};

export default AppRoutes;
