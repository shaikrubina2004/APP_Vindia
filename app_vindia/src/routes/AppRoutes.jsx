import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

/* AUTH */
import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";
import SignInMobile from "../pages/SignInMobile";
import SignUpMobile from "../pages/SignUpMobile";

/* CEO */
import Dashboard from "../pages/ceo/Dashboard";
import CEOPanel from "../pages/ceo/CEOPanel";
import UserManagement from "../pages/ceo/UserManagement";
import ProjectManagement from "../pages/ceo/ProjectManagement";

/* HR */
import HRDashboard from "../pages/hr/HRDashboard";
import Employees from "../pages/hr/Employees";
import AddEmployee from "../pages/hr/AddEmployee";
import EmployeeDetails from "../pages/hr/EmployeeDetails";
import Attendance from "../pages/hr/Attendance";
import Documents from "../pages/hr/Documents";
import Leaves from "../pages/hr/Leaves";
import Payroll from "../pages/hr/Payroll";
import Travel from "../pages/hr/Travel";

/* PROJECT MANAGER */
import TeamManagement from "../pages/projects/projectmanager/TeamManagement";
import AppShell from "../components/incidents/AppShell";
import SharedDrawingPage from "../components/project/SharedDrawingPage";
import DailyUpdates from "../pages/projects/projectmanager/DailyUpdates";
import Reports from "../pages/projects/projectmanager/Reports";

/* SITE ENGINEER */
import SiteEngineerDashboard from "../pages/siteEngineer/SiteEngineerDashboard";
import DailyDiary from "../pages/siteEngineer/DailyDiary";
import RFI from "../pages/siteEngineer/RFI";
import NCR from "../pages/siteEngineer/NCR";
import Checklist from "../pages/siteEngineer/Checklist";
import Progress from "../pages/siteEngineer/Progress";
import ActivityLog from "../pages/siteEngineer/ActivityLog";

/* QUANTITY SURVEYOR */
import QuantitySurveyorDashboard from "../pages/Quality Surveyor/QuantitySurveyorDashboard";
import Qsdailyupdates from "../pages/Quality Surveyor/Qsdailyupdates";
import Qsboq from "../pages/Quality Surveyor/Qsboq";

import Qsquantityreport from "../pages/Quality Surveyor/Qsquantityreport";
import Qscostreport from "../pages/Quality Surveyor/Qscostreport";

/* MEP ROLES */
import MEPDashboard from "../pages/MEP Engineer/MEPDashboard";
import MEPDailylog from "../pages/MEP Engineer/MEPDailylog";
import MEPDrawings from "../pages/MEP Engineer/MEPDrawings";
import MEPUploads from "../pages/MEP Engineer/MEPUploads";
import MEPVerssionControll from "../pages/MEP Engineer/MEPVerssionControll";
import MEPCoordination from "../pages/MEP Engineer/MEPCoordination";

import MEPRoutes from "./MepRoutes";

import PlanningEngineerDashboard from "../pages/Planning Engineer/PlanningEngineerDashboard";
import QCDashboard from "../pages/QC Engineer/QCDashboard";
import SafetyOfficerDashboard from "../pages/Safety Officer/SafetyOfficerDashboard";

/* STRUCTURAL */
import StructuralRoutes from "./StructuralRoutes";
import RFIDetails from "../pages/Structural Engineer/RFIDetails";

/* ARCHITECT */
import ArchitectDashboard from "../pages/Architect/ArchitectDashboard";
import ArchitectTasks from "../pages/Architect/ArchitectTasks";
import ArchitectDailyLogins from "../pages/Architect/ArchitectDailyLogins";
import ArchitectDesigns from "../pages/Architect/ArchitectDesigns";
import ArchitectSignOff from "../pages/Architect/ArchitectSignOff";
import ArchitectProject from "../pages/Architect/ArchitectProject";

/* PROJECT COORDINATOR */
import ProjectCoordinatorDashboard from "../pages/Project Coordinator/ProjectCoordinatorDashboard";
import DailyUpdatesPC from "../pages/Project Coordinator/DailyUpdates";
import Milestone from "../pages/Project Coordinator/Milestone";
import Payment from "../pages/Project Coordinator/Payment";

/* LAYOUTS */
import CEOLayout from "../layouts/CEOLayout";
import HRLayout from "../layouts/HRLayout";
import ProjectManagerLayout from "../layouts/ProjectManagerLayout";
import SiteEngineerLayout from "../layouts/SiteEngineerLayout";
import QuantitySurveyorLayout from "../layouts/QuantitySurveyorLayout";
import ProjectCoordinatorLayout from "../layouts/ProjectCoordinatorLayout";
import ArchitectLayout from "../layouts/ArchitectLayout";
import MEPLayout from "../layouts/MEPLayout";

/* COMMON */
import Timesheet from "../pages/timesheet/Timesheet";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

const AppRoutes = () => {
  const useIsMobile = () => {
    const [mobile, setMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
      const handleResize = () => setMobile(window.innerWidth <= 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    return mobile;
  };

  const SignInWrapper = () => {
    const isMobile = useIsMobile();
    return isMobile ? <SignInMobile /> : <SignIn />;
  };

  const SignUpWrapper = () => {
    const isMobile = useIsMobile();
    return isMobile ? <SignUpMobile /> : <SignUp />;
  };

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
    <Routes>
      {/* AUTH */}
      <Route path="/" element={<SignInWrapper />} />
      <Route path="/signup" element={<SignUpWrapper />} />

      {/* CEO */}
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

      {/* PROJECT MANAGER */}
      <Route
        path="/pm/team"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
            <ProjectManagerLayout>
              <TeamManagement />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pm/incidents"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.MEP_ENGINEER]}>
            <ProjectManagerLayout>
              <AppShell />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pm/daily-updates"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
            <ProjectManagerLayout>
              <DailyUpdates />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pm/reports"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
            <ProjectManagerLayout>
              <Reports />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      {/* HR */}
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

      {/* SITE ENGINEER */}
      <Route
        path="/site-engineer/dashboard"
        element={
          <SiteEngineerLayout>
            <SiteEngineerDashboard />
          </SiteEngineerLayout>
        }
      />
      <Route
        path="/site-engineer/daily-diary"
        element={
          <SiteEngineerLayout>
            <DailyDiary />
          </SiteEngineerLayout>
        }
      />
      <Route
        path="/site-engineer/rfi"
        element={
          <SiteEngineerLayout>
            <RFI />
          </SiteEngineerLayout>
        }
      />
      <Route
        path="/site-engineer/ncr"
        element={
          <SiteEngineerLayout>
            <NCR />
          </SiteEngineerLayout>
        }
      />
      <Route
        path="/site-engineer/checklist"
        element={
          <SiteEngineerLayout>
            <Checklist />
          </SiteEngineerLayout>
        }
      />
      <Route
        path="/site-engineer/progress"
        element={
          <SiteEngineerLayout>
            <Progress />
          </SiteEngineerLayout>
        }
      />
      <Route
        path="/site-engineer/incidents"
        element={
          <SiteEngineerLayout>
            <AppShell />
          </SiteEngineerLayout>
        }
      />
      <Route
        path="/site-engineer/activity"
        element={
          <SiteEngineerLayout>
            <ActivityLog />
          </SiteEngineerLayout>
        }
      />

      {/* QUANTITY SURVEYOR */}

      <Route
        path="/quantity-surveyor/dashboard"
        element={
          <QuantitySurveyorLayout>
            <QuantitySurveyorDashboard />
          </QuantitySurveyorLayout>
        }
      />

      <Route
        path="/quantity-surveyor/incident"
        element={
          <QuantitySurveyorLayout>
            <AppShell />
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

      {/* MEP */}
      <Route path="/mep/*" element={<MEPRoutes />} />

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

      {/* STRUCTURAL */}
      {/* SHARED DRAWING PAGE — Structural */}

      <Route path="/structural-engineer/*" element={<StructuralRoutes />} />
      <Route path="/structural-engineer/rfi/:id" element={<RFIDetails />} />

      {/* ARCHITECT */}
      {/* SHARED DRAWING PAGE — Architect */}
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
        path="/architect/incidents"
        element={
          <ArchitectLayout>
            <AppShell />
          </ArchitectLayout>
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
        path="/architect/sign-off"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}>
            <ArchitectLayout>
              <ArchitectSignOff />
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

      {/* PROJECT COORDINATOR */}
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
        path="/project-coordinator/incidents"
        element={
          <ProjectCoordinatorLayout>
            <AppShell />
          </ProjectCoordinatorLayout>
        }
      />

      {/* TIMESHEET */}
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

      {/* FALLBACK */}
      <Route path="*" element={<h2>Page Not Found</h2>} />
    </Routes>
  );
};

export default AppRoutes;
