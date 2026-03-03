import { Routes, Route } from "react-router-dom";
import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";
import Dashboard from "../pages/Dashboard";

import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

// Example role pages (create them later)
import FinancePage from "../pages/FinancePage";
import MarketingPage from "../pages/MarketingPage";
import CEOPanel from "../pages/CEOPanel";

const AppRoutes = () => {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Dashboard - Logged in users only */}
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

    </Routes>
  );
};

export default AppRoutes;