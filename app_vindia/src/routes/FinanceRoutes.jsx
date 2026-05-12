// src/routes/FinanceRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";
import FinanceManagerLayout from "../layouts/FinanceManagerLayout";

import {
  FinanceManagerDashboard,
  InvoiceManagement,
  BudgetPlanning,
  CostReporting,
  ExpenseTracking,
  PaymentTracking,
} from "../pages/Finance";

const FinanceLayout = ({ children }) => (
  <ProtectedRoute allowedRoles={[ROLES.FINANCE_MANAGER, ROLES.CEO]}>
    <FinanceManagerLayout>{children}</FinanceManagerLayout>
  </ProtectedRoute>
);

export default function FinanceRoutes() {
  return (
    <Routes>
      <Route path="dashboard"     element={<FinanceLayout><FinanceManagerDashboard /></FinanceLayout>} />
      <Route path="invoices"      element={<FinanceLayout><InvoiceManagement /></FinanceLayout>} />
      <Route path="budget"        element={<FinanceLayout><BudgetPlanning /></FinanceLayout>} />
      <Route path="payments"      element={<FinanceLayout><PaymentTracking /></FinanceLayout>} />
      <Route path="expenses"      element={<FinanceLayout><ExpenseTracking /></FinanceLayout>} />
      <Route path="cost-analysis" element={<FinanceLayout><CostReporting /></FinanceLayout>} />
      <Route path="*" element={<Navigate to="/finance-manager/dashboard" replace />} />
    </Routes>
  );
}