import { Routes, Route } from "react-router-dom";
import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";
import Dashboard from "../pages/Dashboard";

import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

import FinancePage from "../pages/FinancePage";
import MarketingPage from "../pages/MarketingPage";
import CEOPanel from "../pages/CEOPanel";
import UserManagement from "../pages/UserManagement";

const AppRoutes = () => {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Dashboard - All Logged In Users */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.CEO,
              ROLES.BDA,
              ROLES.FINANCE,
              ROLES.MARKETING,
              ROLES.CLIENT,
              ROLES.SITE_ENGINEER,
              ROLES.EMPLOYEE,
            ]}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* CEO Only */}
      <Route
        path="/ceo"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
            <CEOPanel />
          </ProtectedRoute>
        }
      />

      {/* CEO - User Management */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {/* Finance & CEO */}
      <Route
        path="/finance"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE, ROLES.CEO]}>
            <FinancePage />
          </ProtectedRoute>
        }
      />

      {/* Marketing & CEO */}
      <Route
        path="/marketing"
        element={
          <ProtectedRoute allowedRoles={[ROLES.MARKETING, ROLES.CEO]}>
            <MarketingPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<h2>Page Not Found</h2>} />

    </Routes>
  );
};

export default AppRoutes;