// src/routes/AppRoutes.jsx
// MERGED — combines both AppRoutes versions with fixed Finance routing
import { Routes, Route } from "react-router-dom";

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

import DigitalMarketing from "../pages/business-development/digital-marketing/DigitalMarketing";
import DigitalMarketingLayout from "../layouts/DigitalMarketingLayout";
import ThreeDVisualizerDashboard from "../pages/3DVisualizer/ThreeDVisualizerDashboard";

/* ── PROJECT MANAGER ─────────────────────────────────────── */
import TeamManagement from "../pages/projects/projectmanager/TeamManagement";
import DailyUpdates from "../pages/projects/projectmanager/DailyUpdates";
import Reports from "../pages/projects/projectmanager/Reports";
import Pmcostreports from "../pages/projects/projectmanager/Pmcostreports";

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

/* ── FINANCE ═══════════════════════════════════════════════ */
import FinanceRoutes from "./FinanceRoutes";
import FinanceLayout from "../layouts/FinanceManagerLayout";

/* ── ARCHITECT ───────────────────────────────────────────── */
import ArchitectDashboard from "../pages/Architect/ArchitectDashboard";
import ArchitectDailyLogins from "../pages/Architect/ArchitectDailyLogins";
import ArchitectDesigns from "../pages/Architect/ArchitectDesigns";
import ArchitectAssign from "../pages/Architect/ArchitectAssign";
import ArchitectProject from "../pages/Architect/ArchitectProject";
import ArchitectSnagList from "../pages/Architect/ArchitectSnagList";
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

/* ═══════════════════════════════════════════════════════════
   APP ROUTES
═════════════════════════════════════════════════════════ */
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
            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}>
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
          path="/pm/reports"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.PROJECT_MANAGER]}>
              <ProjectManagerLayout>
                <Reports />
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

        {/* ══ SITE ENGINEER ═════════════════════════════════ */}
        {SiteEngineerRoutes}

        {/* ══ QUANTITY SURVEYOR ═════════════════════════════ */}
        <Route
          path="/quantity-surveyor/dashboard"
          element={
            <QuantitySurveyorLayout>
              <QuantitySurveyorDashboard />
            </QuantitySurveyorLayout>
          }
        />
        <Route
          path="/quantity-surveyor/daily-updates"
          element={
            <QuantitySurveyorLayout>
              <Qsdailyupdates />
            </QuantitySurveyorLayout>
          }
        />
        <Route
          path="/quantity-surveyor/quantity-report"
          element={
            <QuantitySurveyorLayout>
              <Qsquantityreport />
            </QuantitySurveyorLayout>
          }
        />
        <Route
          path="/quantity-surveyor/cost-report"
          element={
            <QuantitySurveyorLayout>
              <Qscostreport />
            </QuantitySurveyorLayout>
          }
        />
        <Route
          path="/quantity-surveyor/boq"
          element={
            <QuantitySurveyorLayout>
              <Qsboq />
            </QuantitySurveyorLayout>
          }
        />
        <Route
          path="/quantity-surveyor/coordination"
          element={
            <QuantitySurveyorLayout>
              <MEPCoordination />
            </QuantitySurveyorLayout>
          }
        />
        <Route
          path="/quantity-surveyor/incident"
          element={
            <QuantitySurveyorLayout>
              <AppShell key="qs-incidents" />
            </QuantitySurveyorLayout>
          }
        />
        <Route
          path="/quantity-surveyor/measurement"
          element={
            <QuantitySurveyorLayout>
              <Qsmeasurement />
            </QuantitySurveyorLayout>
          }
        />

        {/* ══ MEP ═══════════════════════════════════════════ */}
        <Route path="/mep/*" element={<MEPRoutes />} />
        <Route path="/client/*" element={<ClientRoutes />} />

        {/* ══ PLANNING / QC / SAFETY ════════════════════════ */}
        <Route
          path="/planning-engineer/dashboard"
          element={
            <ProjectManagerLayout>
              <PlanningEngineerDashboard />
            </ProjectManagerLayout>
          }
        />
        <Route
          path="/qc/dashboard"
          element={
            <ProjectManagerLayout>
              <QCDashboard />
            </ProjectManagerLayout>
          }
        />
        <Route
          path="/safety/dashboard"
          element={
            <ProjectManagerLayout>
              <SafetyOfficerDashboard />
            </ProjectManagerLayout>
          }
        />

        {/* ══ STRUCTURAL ════════════════════════════════════ */}
        <Route path="/structural-engineer/*" element={<StructuralRoutes />} />

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

        {/* ══ ARCHITECT ═════════════════════════════════════ */}
        <Route
          path="/architect/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
              <ArchitectLayout>
                <ArchitectDashboard />
              </ArchitectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/3d-visualizer/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.THREE_D_VISUALIZER, ROLES.CEO]}
            >
              <ArchitectLayout>
                <ThreeDVisualizerDashboard />
              </ArchitectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/architect/snags"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
              <ArchitectLayout>
                <ArchitectSnagList />
              </ArchitectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/architect/logs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
              <ArchitectLayout>
                <ArchitectDailyLogins />
              </ArchitectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/architect/designs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
              <ArchitectLayout>
                <ArchitectDesigns />
              </ArchitectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/architect/assign"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
              <ArchitectLayout>
                <ArchitectAssign />
              </ArchitectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/architect/projects"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
              <ArchitectLayout>
                <ArchitectProject />
              </ArchitectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/architect/rfi"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
              <ArchitectLayout>
                <RFIPage />
              </ArchitectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/architect/rfi/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
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
            <ArchitectLayout>
              <AppShell key="arch-incidents" />
            </ArchitectLayout>
          }
        />

        {/* ══ PROJECT COORDINATOR ═══════════════════════════ */}
        <Route
          path="/project-coordinator/dashboard"
          element={
            <ProjectCoordinatorLayout>
              <ProjectCoordinatorDashboard />
            </ProjectCoordinatorLayout>
          }
        />
        <Route
          path="/project-coordinator/daily"
          element={
            <ProjectCoordinatorLayout>
              <DailyUpdatesPC />
            </ProjectCoordinatorLayout>
          }
        />
        <Route
          path="/project-coordinator/milestone"
          element={
            <ProjectCoordinatorLayout>
              <Milestone />
            </ProjectCoordinatorLayout>
          }
        />
        <Route
          path="/project-coordinator/payments"
          element={
            <ProjectCoordinatorLayout>
              <Payment />
            </ProjectCoordinatorLayout>
          }
        />
        <Route
          path="/project-coordinator/designs"
          element={
            <ProjectCoordinatorLayout>
              <ArchitectDesigns />
            </ProjectCoordinatorLayout>
          }
        />
        <Route
          path="/project-coordinator/incidents"
          element={
            <ProjectCoordinatorLayout>
              <AppShell key="pc-incidents" />
            </ProjectCoordinatorLayout>
          }
        />
        <Route
          path="/project-coordinator/rfi"
          element={
            <ProjectCoordinatorLayout>
              <RFIPage />
            </ProjectCoordinatorLayout>
          }
        />
        <Route
          path="/project-coordinator/rfi/:id"
          element={
            <ProjectCoordinatorLayout>
              <RFIDetailPage />
            </ProjectCoordinatorLayout>
          }
        />

        {/* ══ TIMESHEET ═════════════════════════════════════ */}
        <Route
          path="/timesheet"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.CEO, ROLES.HR, ...PROJECT_ROLES]}
            >
              <CEOLayout>
                <Timesheet />
              </CEOLayout>
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

        {/* ══ DIGITAL MARKETING ═════════════════════════════ */}
        <Route
          path="/digital-marketing/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.DIGITAL_MARKETING, ROLES.CEO]}
            >
              <DigitalMarketingLayout>
                <DigitalMarketing />
              </DigitalMarketingLayout>
            </ProtectedRoute>
          }
        />

        {/* ══ FALLBACK ══════════════════════════════════════ */}
        <Route
          path="*"
          element={
            <h2 style={{ padding: 40, textAlign: "center" }}>
              404 — Page Not Found
            </h2>
          }
        />
      </Routes>
    </NotificationProvider>
  );
};

export default AppRoutes;