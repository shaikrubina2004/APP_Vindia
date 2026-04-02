import { Routes, Route } from "react-router-dom";

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

import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

import CEOLayout from "../layouts/CEOLayout";
import HRLayout from "../layouts/HRLayout";
import Timesheet from "../pages/timesheet/Timesheet";
import ProjectManagerLayout from "../layouts/ProjectManagerLayout";

const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

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
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
            <ProjectManagerLayout>
              <ProjectManagement />
            </ProjectManagerLayout>
          </ProtectedRoute>
        }
      />
      {/* TIMESHEET */}
      <Route
        path="/timesheet"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}>
            <CEOLayout>
              <Timesheet />
            </CEOLayout>
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

      {/* FALLBACK */}
      <Route path="*" element={<h2>Page Not Found</h2>} />
    </Routes>
  );
};

export default AppRoutes;
