import { Routes, Route } from "react-router-dom";

import FinanceManagerDashboard from "../pages/Finance/FinanceManagerDashboard";
import InvoiceManagement from "../pages/Finance/InvoiceManagement";
import BudgetPlanning from "../pages/Finance/BudgetPlanning";
import PaymentTracking from "../pages/Finance/PaymentTracking";
import ExpenseTracking from "../pages/Finance/ExpenseTracking";
import CostReporting from "../pages/Finance/CostReporting";
import VendorManagement from "../pages/Finance/VendorManagement";
import FinanceDailyUpdate from "../pages/Finance/FinanceDailyUpdate";
import ReceivablesPayables from "../pages/Finance/ReceivablesPayables";

import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

const AccountantRoutes = () => (
  <Routes>
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <FinanceManagerDashboard />
        </ProtectedRoute>
      }
    />

    <Route
      path="/invoices"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <InvoiceManagement />
        </ProtectedRoute>
      }
    />

    <Route
      path="/budget"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <BudgetPlanning />
        </ProtectedRoute>
      }
    />

    <Route
      path="/payments"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <PaymentTracking />
        </ProtectedRoute>
      }
    />

    <Route
      path="/expenses"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <ExpenseTracking />
        </ProtectedRoute>
      }
    />

    <Route
      path="/cost-analysis"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <CostReporting />
        </ProtectedRoute>
      }
    />

    <Route
      path="/vendors"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <VendorManagement />
        </ProtectedRoute>
      }
    />

    <Route
      path="/receivables-payables"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <ReceivablesPayables />
        </ProtectedRoute>
      }
    />

    <Route
      path="/daily-update"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <FinanceDailyUpdate />
        </ProtectedRoute>
      }
    />
  </Routes>
);

export default AccountantRoutes;