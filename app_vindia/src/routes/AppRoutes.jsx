// src/routes/AppRoutes.jsx
// Based on your original working file.
// ONLY changes from original:
//   1. useIsMobile, SignInWrapper, SignUpWrapper moved OUTSIDE AppRoutes (fixes hook crash on navigation)
//   2. New SE pages added inline (no SiteEngineerRoutes component — that caused the crash)
//   3. All existing routes kept exactly as they were

import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

/* AUTH */
import SignIn        from "../pages/SignIn";
import SignUp        from "../pages/SignUp";
import SignInMobile  from "../pages/SignInMobile";
import SignUpMobile  from "../pages/SignUpMobile";

/* CEO */
import Dashboard         from "../pages/ceo/Dashboard";
import CEOPanel          from "../pages/ceo/CEOPanel";
import UserManagement    from "../pages/ceo/UserManagement";
import ProjectManagement from "../pages/ceo/ProjectManagement";

/* HR */
import HRDashboard     from "../pages/hr/HRDashboard";
import Employees       from "../pages/hr/Employees";
import AddEmployee     from "../pages/hr/AddEmployee";
import EmployeeDetails from "../pages/hr/EmployeeDetails";
import Attendance      from "../pages/hr/Attendance";
import Documents       from "../pages/hr/Documents";
import Leaves          from "../pages/hr/Leaves";
import Payroll         from "../pages/hr/Payroll";
import Travel          from "../pages/hr/Travel";

/* PROJECT MANAGER */
import TeamManagement from "../pages/projects/projectmanager/TeamManagement";
import AppShell       from "../components/incidents/AppShell";
import DailyUpdates   from "../pages/projects/projectmanager/DailyUpdates";
import Reports        from "../pages/projects/projectmanager/Reports";

/* SITE ENGINEER — original pages */
import SiteEngineerDashboard from "../pages/siteEngineer/SiteEngineerDashboard";
import DailyDiary            from "../pages/siteEngineer/DailyDiary";
import RFI                   from "../pages/siteEngineer/RFI";
import NCR                   from "../pages/siteEngineer/NCR";
import Checklist             from "../pages/siteEngineer/Checklist";
import Progress              from "../pages/siteEngineer/Progress";
import ActivityLog           from "../pages/siteEngineer/ActivityLog";

/* SITE ENGINEER — new pages (add only after creating the files) */
import SnagList         from "../pages/siteEngineer/SnagList";
// import MaterialRequest  from "../pages/siteEngineer/MaterialRequest";
// import ApprovalWorkflow from "../pages/siteEngineer/ApprovalWorkflow";
import PhotoGallery     from "../pages/siteEngineer/PhotoGallery";
// import SiteInstruction  from "../pages/siteEngineer/SiteInstruction";
// import DrawingAccess    from "../pages/siteEngineer/DrawingAccess";
// import QuantityReport   from "../pages/siteEngineer/QuantityReport";

/* QUANTITY SURVEYOR */
import QuantitySurveyorDashboard from "../pages/Quality Surveyor/QuantitySurveyorDashboard";
import Qsdailyupdates from "../pages/Quality Surveyor/Qsdailyupdates";
import Qsboq from "../pages/Quality Surveyor/Qsboq";
import Qsquantityreport from "../pages/Quality Surveyor/Qsquantityreport";
import Qscostreport from "../pages/Quality Surveyor/Qscostreport";

/* MEP */
import MEPDashboard        from "../pages/MEP Engineer/MEPDashboard";
import MEPDailylog         from "../pages/MEP Engineer/MEPDailylog";
import MEPDrawings         from "../pages/MEP Engineer/MEPDrawings";
import MEPUploads          from "../pages/MEP Engineer/MEPUploads";
import MEPVerssionControll from "../pages/MEP Engineer/MEPVerssionControll";
import MEPCoordination     from "../pages/MEP Engineer/MEPCoordination";

import PlanningEngineerDashboard from "../pages/Planning Engineer/PlanningEngineerDashboard";
import QCDashboard               from "../pages/QC Engineer/QCDashboard";
import SafetyOfficerDashboard    from "../pages/Safety Officer/SafetyOfficerDashboard";

/* STRUCTURAL */
import StructuralRoutes from "./StructuralRoutes";
import RFIDetails       from "../pages/Structural Engineer/RFIDetails";

/* ARCHITECT */
import ArchitectDashboard   from "../pages/Architect/ArchitectDashboard";
import ArchitectTasks       from "../pages/Architect/ArchitectTasks";
import ArchitectDailyLogins from "../pages/Architect/ArchitectDailyLogins";
import ArchitectDesigns     from "../pages/Architect/ArchitectDesigns";
import ArchitectSignOff     from "../pages/Architect/ArchitectSignOff";
import ArchitectProject     from "../pages/Architect/ArchitectProject";

/* PROJECT COORDINATOR */
import ProjectCoordinatorDashboard from "../pages/Project Coordinator/ProjectCoordinatorDashboard";
import DailyUpdatesPC from "../pages/Project Coordinator/DailyUpdates";
import Milestone      from "../pages/Project Coordinator/Milestone";
import Payment        from "../pages/Project Coordinator/Payment";

/* LAYOUTS */
import CEOLayout                from "../layouts/CEOLayout";
import HRLayout                 from "../layouts/HRLayout";
import ProjectManagerLayout     from "../layouts/ProjectManagerLayout";
import SiteEngineerLayout       from "../layouts/SiteEngineerLayout";
import QuantitySurveyorLayout   from "../layouts/QuantitySurveyorLayout";
import ProjectCoordinatorLayout from "../layouts/ProjectCoordinatorLayout";
import ArchitectLayout          from "../layouts/ArchitectLayout";
import MEPLayout                from "../layouts/MEPLayout";

/* COMMON */
import Timesheet      from "../pages/timesheet/Timesheet";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES }      from "../roles";
import { NotificationProvider } from "../context/NotificationContext";

/* ══════════════════════════════════════════════════════════
   FIX: useIsMobile MUST be defined outside AppRoutes.
   Defining hooks inside a regular function causes React to
   crash with "rendered more hooks than previous render"
   every time you navigate between pages.
══════════════════════════════════════════════════════════ */
const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return mobile;
};

/* These also must be outside AppRoutes for the same reason */
const SignInWrapper = () => {
  const isMobile = useIsMobile();
  return isMobile ? <SignInMobile /> : <SignIn />;
};

const SignUpWrapper = () => {
  const isMobile = useIsMobile();
  return isMobile ? <SignUpMobile /> : <SignUp />;
};

/* ══════════════════════════════════════════════════════════
   AppRoutes — kept as close to your original as possible
══════════════════════════════════════════════════════════ */
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

      {/* AUTH */}
      <Route path="/"       element={<SignInWrapper />} />
      <Route path="/signup" element={<SignUpWrapper />} />

      {/* CEO */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}><CEOLayout><Dashboard /></CEOLayout></ProtectedRoute>} />
      <Route path="/ceo"       element={<ProtectedRoute allowedRoles={[ROLES.CEO]}><CEOLayout><CEOPanel /></CEOLayout></ProtectedRoute>} />
      <Route path="/users"     element={<ProtectedRoute allowedRoles={[ROLES.CEO]}><CEOLayout><UserManagement /></CEOLayout></ProtectedRoute>} />
      <Route path="/projects"  element={<ProtectedRoute allowedRoles={[ROLES.CEO, ...PROJECT_ROLES]}><ProjectManagerLayout><ProjectManagement /></ProjectManagerLayout></ProtectedRoute>} />

      {/* PROJECT MANAGER */}
      <Route path="/pm/team"          element={<ProtectedRoute allowedRoles={[ROLES.CEO]}><ProjectManagerLayout><TeamManagement /></ProjectManagerLayout></ProtectedRoute>} />
      <Route path="/pm/incidents"     element={<ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.MEP_ENGINEER]}><ProjectManagerLayout><AppShell /></ProjectManagerLayout></ProtectedRoute>} />
      <Route path="/pm/daily-updates" element={<ProtectedRoute allowedRoles={[ROLES.CEO]}><ProjectManagerLayout><DailyUpdates /></ProjectManagerLayout></ProtectedRoute>} />
      <Route path="/pm/reports"       element={<ProtectedRoute allowedRoles={[ROLES.CEO]}><ProjectManagerLayout><Reports /></ProjectManagerLayout></ProtectedRoute>} />

      {/* HR */}
      <Route path="/hr"              element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><HRDashboard /></HRLayout></ProtectedRoute>} />
      <Route path="/hr/employees"    element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><Employees /></HRLayout></ProtectedRoute>} />
      <Route path="/hr/add-employee" element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><AddEmployee /></HRLayout></ProtectedRoute>} />
      <Route path="/hr/employee/:id" element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><EmployeeDetails /></HRLayout></ProtectedRoute>} />
      <Route path="/hr/attendance"   element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><Attendance /></HRLayout></ProtectedRoute>} />
      <Route path="/hr/documents"    element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><Documents /></HRLayout></ProtectedRoute>} />
      <Route path="/hr/payroll"      element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><Payroll /></HRLayout></ProtectedRoute>} />
      <Route path="/hr/travel"       element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><Travel /></HRLayout></ProtectedRoute>} />
      <Route path="/hr/leaves"       element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}><HRLayout><Leaves /></HRLayout></ProtectedRoute>} />

      {/* ════════════════════════════════════════════════════
          SITE ENGINEER
          Original routes kept exactly as they were.
          New routes added below — wrapped with layout only,
          no ProtectedRoute since originals didn't use it.
      ════════════════════════════════════════════════════ */}

      {/* Original SE routes — unchanged from your working file */}
      <Route path="/site-engineer/dashboard"   element={<SiteEngineerLayout><SiteEngineerDashboard /></SiteEngineerLayout>} />
      <Route path="/site-engineer/daily-diary" element={<SiteEngineerLayout><DailyDiary /></SiteEngineerLayout>} />
      <Route path="/site-engineer/rfi"         element={<SiteEngineerLayout><RFI /></SiteEngineerLayout>} />
      <Route path="/site-engineer/ncr"         element={<SiteEngineerLayout><NCR /></SiteEngineerLayout>} />
      <Route path="/site-engineer/checklist"   element={<SiteEngineerLayout><Checklist /></SiteEngineerLayout>} />
      <Route path="/site-engineer/progress"    element={<SiteEngineerLayout><Progress /></SiteEngineerLayout>} />
      <Route path="/site-engineer/incidents"   element={<SiteEngineerLayout><AppShell /></SiteEngineerLayout>} />
      <Route path="/site-engineer/activity"    element={<SiteEngineerLayout><ActivityLog /></SiteEngineerLayout>} />

      {/* New SE routes — same pattern as originals */}
      <Route path="/site-engineer/snag-list"         element={<SiteEngineerLayout><SnagList /></SiteEngineerLayout>} />
      {/* <Route path="/site-engineer/materials"         element={<SiteEngineerLayout><MaterialRequest /></SiteEngineerLayout>} /> */}
      {/* <Route path="/site-engineer/approvals"         element={<SiteEngineerLayout><ApprovalWorkflow /></SiteEngineerLayout>} /> */}
      <Route path="/site-engineer/photos"            element={<SiteEngineerLayout><PhotoGallery /></SiteEngineerLayout>} />
      {/* <Route path="/site-engineer/site-instructions" element={<SiteEngineerLayout><SiteInstruction /></SiteEngineerLayout>} />
      <Route path="/site-engineer/drawings"          element={<SiteEngineerLayout><DrawingAccess /></SiteEngineerLayout>} />
      <Route path="/site-engineer/quantity-report"   element={<SiteEngineerLayout><QuantityReport /></SiteEngineerLayout>} /> */}

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
      <Route path="/mep/dashboard"       element={<MEPLayout><MEPDashboard /></MEPLayout>} />
      <Route path="/mep/daily-log"       element={<MEPLayout><MEPDailylog /></MEPLayout>} />
      <Route path="/mep/drawings"        element={<MEPLayout><MEPDrawings /></MEPLayout>} />
      <Route path="/mep/version-control" element={<MEPLayout><MEPVerssionControll /></MEPLayout>} />
      <Route path="/mep/incidents"       element={<MEPLayout><AppShell /></MEPLayout>} />
      <Route path="/mep/coordination"    element={<MEPLayout><MEPCoordination /></MEPLayout>} />
      <Route path="/mep/upload"          element={<MEPLayout><MEPUploads /></MEPLayout>} />

      {/* OTHER ROLES */}
      <Route path="/planning-engineer/dashboard" element={<ProjectManagerLayout><PlanningEngineerDashboard /></ProjectManagerLayout>} />
      <Route path="/qc/dashboard"                element={<ProjectManagerLayout><QCDashboard /></ProjectManagerLayout>} />
      <Route path="/safety/dashboard"            element={<ProjectManagerLayout><SafetyOfficerDashboard /></ProjectManagerLayout>} />

      {/* STRUCTURAL */}
      <Route path="/structural-engineer/*"       element={<StructuralRoutes />} />
      <Route path="/structural-engineer/rfi/:id" element={<RFIDetails />} />

      {/* ARCHITECT */}
      <Route path="/architect/dashboard" element={<ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}><ArchitectLayout><ArchitectDashboard /></ArchitectLayout></ProtectedRoute>} />
      <Route path="/architect/tasks"     element={<ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}><ArchitectLayout><ArchitectTasks /></ArchitectLayout></ProtectedRoute>} />
      <Route path="/architect/logs"      element={<ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}><ArchitectLayout><ArchitectDailyLogins /></ArchitectLayout></ProtectedRoute>} />
      <Route path="/architect/designs"   element={<ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}><ArchitectLayout><ArchitectDesigns /></ArchitectLayout></ProtectedRoute>} />
      <Route path="/architect/sign-off"  element={<ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}><ArchitectLayout><ArchitectSignOff /></ArchitectLayout></ProtectedRoute>} />
      <Route path="/architect/projects"  element={<ProtectedRoute allowedRoles={[ROLES.ARCHITECT, ROLES.CEO]}><ArchitectLayout><ArchitectProject /></ArchitectLayout></ProtectedRoute>} />

      {/* PROJECT COORDINATOR */}
      <Route path="/project-coordinator/dashboard" element={<ProjectCoordinatorLayout><ProjectCoordinatorDashboard /></ProjectCoordinatorLayout>} />
      <Route path="/project-coordinator/daily"     element={<ProjectCoordinatorLayout><DailyUpdatesPC /></ProjectCoordinatorLayout>} />
      <Route path="/project-coordinator/milestone" element={<ProjectCoordinatorLayout><Milestone /></ProjectCoordinatorLayout>} />
      <Route path="/project-coordinator/payments"  element={<ProjectCoordinatorLayout><Payment /></ProjectCoordinatorLayout>} />
      <Route path="/project-coordinator/incidents" element={<ProjectCoordinatorLayout><AppShell /></ProjectCoordinatorLayout>} />

      {/* TIMESHEET */}
      <Route path="/timesheet" element={<ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR, ...PROJECT_ROLES]}><CEOLayout><Timesheet /></CEOLayout></ProtectedRoute>} />

      {/* FALLBACK */}
      <Route path="*" element={<h2>Page Not Found</h2>} />

    </Routes>
        </NotificationProvider>

  );
};

export default AppRoutes;