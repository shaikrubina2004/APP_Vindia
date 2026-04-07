import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";

import Dashboard from "../pages/ceo/Dashboard";
import CEOPanel from "../pages/ceo/CEOPanel";
import UserManagement from "../pages/ceo/UserManagement";
import ProjectManagement from "../pages/ceo/ProjectManagement";

import HRDashboard from "../pages/hr/HRDashboard";
import Employees from "../pages/hr/Employees";
import AddEmployee from "../pages/hr/AddEmployee";
import EmployeeDetails from "../pages/hr/EmployeeDetails";
import Attendance from "../pages/hr/Attendance";
import Documents from "../pages/hr/Documents";
import Leaves from "../pages/hr/Leaves";
import Payroll from "../pages/hr/Payroll";
import Travel from "../pages/hr/Travel";
import SignInMobile from "../pages/SignInMobile";
import SignUpMobile from "../pages/SignUpMobile";
import MEPDashboard from "../pages/MEP Engineer/MEPDashboard";
import ProjectCoordinatorDashboard from "../pages/Project Coordinator/ProjectCoordinatorDashboard";
import SiteEngineerDashboard from "../pages/Site Engineer/SiteEngineerDashboard";
import PlanningEngineerDashboard from "../pages/Planning Engineer/PlanningEngineerDashboard";
import QCDashboard from "../pages/QC Engineer/QCDashboard";
import QuantitySurveyorDashboard from "../pages/Quality Surveyor/QuantitySurveyorDashboard";
import SafetyOfficerDashboard from "../pages/Safety Officer/SafetyOfficerDashboard";
import StructuralEngineerDashboard from "../pages/Structural Engineer/StructuralEngineerDashboard";
import StructuralEngineerLayout from "../layouts/StructuralEngineerLayout";
import ArchitectDashboard from "../pages/Architect/ArchitectDashboard";

import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

import CEOLayout from "../layouts/CEOLayout";
import HRLayout from "../layouts/HRLayout";
import Timesheet from "../pages/timesheet/Timesheet";
import ProjectManagerLayout from "../layouts/ProjectManagerLayout";
import TeamManagement from "../pages/projects/projectmanager/TeamManagement";
import Incidents from "../pages/projects/projectmanager/Incidents";
import DailyUpdates from "../pages/projects/projectmanager/DailyUpdates";
import Reports from "../pages/projects/projectmanager/Reports";
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

  const SignInWrapper = () => {
    const isMobile = useIsMobile();
    return isMobile ? <SignInMobile /> : <SignIn />;
  };

  const SignUpWrapper = () => {
    const isMobile = useIsMobile();
    return isMobile ? <SignUpMobile /> : <SignUp />;
  };
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<SignInWrapper />} />
      <Route path="/signup" element={<SignUpWrapper />} />
      {/* DASHBOARD */}
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

      {/* CEO */}
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

      {/* CEO USERS */}
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

      {/* CEO PROJECTS */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ...PROJECT_ROLES]}>
            <ProjectManagerLayout>
              <ProjectManagement />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

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
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
            <ProjectManagerLayout>
              <Incidents />
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
      {/* HR DASHBOARD */}
      <Route
        path="/hr"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <HRDashboard />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      {/* HR EMPLOYEES */}
      <Route
        path="/hr/employees"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <Employees />
            </HRLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <CEOLayout>
              <Employees />
            </CEOLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/employee/:id"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <EmployeeDetails />
            </HRLayout>
          </ProtectedRoute>
        }
      />
      {/* ADD EMPLOYEE */}
      <Route
        path="/hr/add-employee"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <AddEmployee />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      {/* HR ATTENDANCE */}
      <Route
        path="/hr/attendance"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <Attendance />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      {/* HR DOCUMENTS */}
      <Route
        path="/hr/documents"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <Documents />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      {/* CEO ATTENDANCE VIEW */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <CEOLayout>
              <Attendance />
            </CEOLayout>
          </ProtectedRoute>
        }
      />

      {/* HR PAYROLL */}
      <Route
        path="/hr/payroll"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <Payroll />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      {/* CEO PAYROLL VIEW */}
      <Route
        path="/payroll"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <CEOLayout>
              <Payroll />
            </CEOLayout>
          </ProtectedRoute>
        }
      />

      {/* HR TRAVEL */}
      <Route
        path="/hr/travel"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <Travel />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      {/* HR LEAVES */}
      <Route
        path="/hr/leaves"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR, ROLES.CEO]}>
            <HRLayout>
              <Leaves />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/project-coordinator/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PROJECT_COORDINATOR]}>
            <ProjectManagerLayout>
              <ProjectCoordinatorDashboard />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/site-engineer/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SITE_ENGINEER]}>
            <ProjectManagerLayout>
              <SiteEngineerDashboard />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/mep/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.MEP_ENGINEER]}>
            <ProjectManagerLayout>
              <MEPDashboard />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/quantity-surveyor/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.QUANTITY_SURVEYOR]}>
            <ProjectManagerLayout>
              <QuantitySurveyorDashboard />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/structural-engineer/dashboard"
        element={
          <StructuralEngineerLayout>
            <StructuralEngineerDashboard />
          </StructuralEngineerLayout>
        }
      />
      <Route
        path="/planning-engineer/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.PLANNING_ENGINEER]}>
            <ProjectManagerLayout>
              <PlanningEngineerDashboard />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/safety/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SAFETY_OFFICER]}>
            <ProjectManagerLayout>
              <SafetyOfficerDashboard />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/qc/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.QC_ENGINEER]}>
            <ProjectManagerLayout>
              <QCDashboard />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/architect/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ARCHITECT]}>
            <ProjectManagerLayout>
              <ArchitectDashboard />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/timesheet"
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.CEO,
              ROLES.HR,
              ...PROJECT_ROLES, // ✅ ADD THIS
            ]}
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
