import { Routes, Route } from "react-router-dom";

import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";

import Dashboard from "../pages/ceo/Dashboard";
import CEOPanel from "../pages/ceo/CEOPanel";
import UserManagement from "../pages/ceo/UserManagement";

import HRDashboard from "../pages/hr/HRDashboard";
import Employees from "../pages/hr/Employees";
import AddEmployee from "../pages/hr/AddEmployee"; // ✅ correct
import Attendance from "../pages/hr/Attendance";
import Leaves from "../pages/hr/Leaves";
import Payroll from "../pages/hr/Payroll";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";
import Travel from "../pages/hr/Travel";

import CEOLayout from "../layouts/CEOLayout";
import HRLayout from "../layouts/HRLayout";

const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
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

      {/* CEO PANEL */}
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

      {/* USER MANAGEMENT */}
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

      {/* ✅ ADD EMPLOYEE (FIXED) */}
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