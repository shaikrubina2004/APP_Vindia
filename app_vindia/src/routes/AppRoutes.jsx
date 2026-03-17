import { Routes, Route } from "react-router-dom";

import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";

/* Layouts */
import CEOLayout from "../layouts/CEOLayout";
import HRLayout from "../layouts/HRLayout";

/* CEO Pages */
import Dashboard from "../pages/ceo/Dashboard";
import CEOPanel from "../pages/ceo/CEOPanel";
import UserManagement from "../pages/ceo/UserManagement";

/* HR Pages */
import HRDashboard from "../pages/hr/HRDashboard";
import Employees from "../pages/hr/Employees";
import Attendance from "../pages/hr/Attendance";
import Leaves from "../pages/hr/Leaves";

/* WBS Page */
import WbsPage from "../pages/projects/WbsPage";

/* Auth */
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

function AppRoutes() {

  return (

    <Routes>

      {/* PUBLIC ROUTES */}

      <Route path="/" element={<SignIn />} />

      <Route path="/signup" element={<SignUp />} />


      {/* CEO DASHBOARD */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
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


      {/* WBS MANAGEMENT */}

      <Route
        path="/wbs"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
            <CEOLayout>
              <WbsPage />
            </CEOLayout>
          </ProtectedRoute>
        }
      />


      {/* HR MODULE */}

      <Route
        path="/hr"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}>
            <HRLayout>
              <HRDashboard />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/employees"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}>
            <HRLayout>
              <Employees />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/attendance"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}>
            <HRLayout>
              <Attendance />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/leaves"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}>
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

}

export default AppRoutes;