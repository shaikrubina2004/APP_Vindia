// src/routes/FinanceRoutes.jsx

import { Routes, Route } from "react-router-dom";

/* ── FINANCE COMPONENTS ──────────────────────────────────── */
import FinanceManagerDashboard from "../pages/Finance/FinanceManagerDashboard";
import InvoiceManagement from "../pages/Finance/InvoiceManagement";
import BudgetPlanning from "../pages/Finance/BudgetPlanning";
import PaymentTracking from "../pages/Finance/PaymentTracking";
import ExpenseTracking from "../pages/Finance/ExpenseTracking";
import CostReporting from "../pages/Finance/CostReporting";
import VendorManagement from "../pages/Finance/VendorManagement";
import FinanceSettings from "../pages/Finance/FinanceSettings";

import FinanceDailyUpdate from "../pages/Finance/FinanceDailyUpdate";
import FinanceDailyUpdateReview from "../pages/Finance/FinanceDailyUpdateReview";

// Add this only if the file exists
// import AccountantDailyUpdate from "../pages/Finance/AccountantDailyUpdate";

import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

const ACCOUNTANT_ACCESS = [
  ROLES.ACCOUNTANT,
  ROLES.FINANCE_MANAGER,
  ROLES.CEO,
];

const MANAGER_ACCESS = [
  ROLES.FINANCE_MANAGER,
  ROLES.CEO,
];

const FINANCE_MANAGER_ONLY = [
  ROLES.FINANCE_MANAGER,
];

const FinanceRoutes = () => {
  return (
    <Routes>
      {/* =====================================================
          DASHBOARD
      ====================================================== */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={MANAGER_ACCESS}>
            <FinanceManagerDashboard />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          INVOICES
          Accountant can view/create/update status.
          Manager can delete according to backend permissions.
      ====================================================== */}
      <Route
        path="/invoices"
        element={
          <ProtectedRoute allowedRoles={ACCOUNTANT_ACCESS}>
            <InvoiceManagement />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          BUDGET MANAGEMENT
      ====================================================== */}
      <Route
        path="/budget"
        element={
          <ProtectedRoute allowedRoles={ACCOUNTANT_ACCESS}>
            <BudgetPlanning />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          PAYMENTS
      ====================================================== */}
      <Route
        path="/payments"
        element={
          <ProtectedRoute allowedRoles={ACCOUNTANT_ACCESS}>
            <PaymentTracking />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EXPENSES
      ====================================================== */}
      <Route
        path="/expenses"
        element={
          <ProtectedRoute allowedRoles={ACCOUNTANT_ACCESS}>
            <ExpenseTracking />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          COST REPORTING
      ====================================================== */}
      <Route
        path="/cost-analysis"
        element={
          <ProtectedRoute allowedRoles={ACCOUNTANT_ACCESS}>
            <CostReporting />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          VENDORS
      ====================================================== */}
      <Route
        path="/vendors"
        element={
          <ProtectedRoute allowedRoles={ACCOUNTANT_ACCESS}>
            <VendorManagement />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          SETTINGS
          Backend allows only Finance Manager and CEO.
      ====================================================== */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={MANAGER_ACCESS}>
            <FinanceSettings />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          FINANCE MANAGER DAILY UPDATE
          Finance Manager submits own update.
      ====================================================== */}
      <Route
        path="/daily-update"
        element={
          <ProtectedRoute allowedRoles={FINANCE_MANAGER_ONLY}>
            <FinanceDailyUpdate />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ACCOUNTANT DAILY UPDATE REVIEW
          Finance Manager reviews accountant submissions.
      ====================================================== */}
      <Route
        path="/daily-updates/review"
        element={
          <ProtectedRoute allowedRoles={FINANCE_MANAGER_ONLY}>
            <FinanceDailyUpdateReview />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          ACCOUNTANT DAILY UPDATE
          Uncomment only after creating the component.
      ====================================================== */}
      {/*
      <Route
        path="/accountant/daily-update"
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ACCOUNTANT]}
          >
            <AccountantDailyUpdate />
          </ProtectedRoute>
        }
      />
      */}
    </Routes>
  );
};

export default FinanceRoutes;