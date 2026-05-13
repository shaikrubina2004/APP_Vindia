// src/routes/FinanceRoutes.jsx
import { Routes, Route } from "react-router-dom";

/* ── FINANCE COMPONENTS ──────────────────────────────────── */
import FinanceManagerDashboard from "../pages/Finance/FinanceManagerDashboard";
import InvoiceManagement from "../pages/Finance/InvoiceManagement";
import BudgetPlanning from "../pages/Finance/BudgetPlanning";
import PaymentTracking from "../pages/Finance/PaymentTracking";
import ExpenseTracking from "../pages/Finance/ExpenseTracking";
import CostReporting from "../pages/Finance/CostReporting";
import VendorManagement from "../pages/Finance/VendorManagement"; // Create this if needed
import FinanceSettings from "../pages/Finance/FinanceSettings"; // Create this if needed

import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

/* ═══════════════════════════════════════════════════════════
   FINANCE ROUTES
════════════════════════════════════════════════════════════ */
const FinanceRoutes = () => {
  return (
    <Routes>
      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
            <FinanceManagerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Invoices */}
      <Route
        path="/invoices"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
            <InvoiceManagement />
          </ProtectedRoute>
        }
      />

      {/* Budget Management */}
      <Route
        path="/budget"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
            <BudgetPlanning />
          </ProtectedRoute>
        }
      />

      {/* Payments */}
      <Route
        path="/payments"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
            <PaymentTracking />
          </ProtectedRoute>
        }
      />

      {/* Expenses */}
      <Route
        path="/expenses"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
            <ExpenseTracking />
          </ProtectedRoute>
        }
      />

      {/* Cost Analysis */}
      <Route
        path="/cost-analysis"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
            <CostReporting />
          </ProtectedRoute>
        }
      />

      {/* Vendor Management */}
      { <Route
        path="/vendors"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
            <VendorManagement />
          </ProtectedRoute>
        }
      /> }

      {/* Settings */}
      { <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
            <FinanceSettings />
          </ProtectedRoute>
        }
      /> }
    </Routes>
  );
};

export default FinanceRoutes;