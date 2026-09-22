import { Routes, Route } from "react-router-dom";

import AccountantDashboard from "../pages/Accountant/AccountantDashboard";

// Decision 1: these 6 now use dedicated Accountant pages calling
// /api/accountant/* instead of reusing the Finance Manager JSX files
// (which stay wired to /api/finance/* and are untouched).
import AccountantInvoices from "../pages/Accountant/AccountantInvoices";
import AccountantBudget from "../pages/Accountant/AccountantBudget";
import AccountantPayments from "../pages/Accountant/AccountantPayments";
import AccountantExpenses from "../pages/Accountant/AccountantExpenses";
import AccountantCostAnalysis from "../pages/Accountant/AccountantCostAnalysis";
import AccountantVendors from "../pages/Accountant/AccountantVendors";

// Receivables/Payables and Daily Update: no equivalent Accountant-only
// risk was found on these (read-only report; daily-update backend
// already scopes Finance-Manager-only actions itself), so they keep
// reusing the existing Finance pages, per the audit's own findings.
import FinanceDailyUpdate from "../pages/Finance/FinanceDailyUpdate";
import ReceivablesPayables from "../pages/Finance/ReceivablesPayables";

// New accounting-core modules (Group 2)
import ChartOfAccounts from "../pages/Accountant/ChartOfAccounts";
import JournalEntries from "../pages/Accountant/JournalEntries";
import GeneralLedger from "../pages/Accountant/GeneralLedger";
import BankReconciliation from "../pages/Accountant/BankReconciliation";
import TaxRegister from "../pages/Accountant/TaxRegister";
import PettyCash from "../pages/Accountant/PettyCash";
import AccountantReports from "../pages/Accountant/AccountantReports";

import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

// Journal Entries, Chart of Accounts, Ledger, Bank Reconciliation,
// Petty Cash, and Reports need to be reachable by Finance Manager too
// (to approve/post/reverse/reconcile) — each of those pages already
// gates its own FM-only buttons internally. Accountant's other pages
// stay Accountant-only, unchanged from before.
const ACCOUNTANT_AND_FM = [ROLES.ACCOUNTANT, ROLES.FINANCE_MANAGER, ROLES.CEO];

const AccountantRoutes = () => (
  <Routes>
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <AccountantDashboard />
        </ProtectedRoute>
      }
    />

    <Route
      path="/invoices"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <AccountantInvoices />
        </ProtectedRoute>
      }
    />

    <Route
      path="/budget"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <AccountantBudget />
        </ProtectedRoute>
      }
    />

    <Route
      path="/payments"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <AccountantPayments />
        </ProtectedRoute>
      }
    />

    <Route
      path="/expenses"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <AccountantExpenses />
        </ProtectedRoute>
      }
    />

    <Route
      path="/cost-analysis"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <AccountantCostAnalysis />
        </ProtectedRoute>
      }
    />

    <Route
      path="/vendors"
      element={
        <ProtectedRoute
          allowedRoles={[ROLES.ACCOUNTANT]}
        >
          <AccountantVendors />
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

    <Route
      path="/journal-entries"
      element={
        <ProtectedRoute allowedRoles={ACCOUNTANT_AND_FM}>
          <JournalEntries />
        </ProtectedRoute>
      }
    />

    <Route
      path="/chart-of-accounts"
      element={
        <ProtectedRoute allowedRoles={ACCOUNTANT_AND_FM}>
          <ChartOfAccounts />
        </ProtectedRoute>
      }
    />

    <Route
      path="/general-ledger"
      element={
        <ProtectedRoute allowedRoles={ACCOUNTANT_AND_FM}>
          <GeneralLedger />
        </ProtectedRoute>
      }
    />

    <Route
      path="/bank-reconciliation"
      element={
        <ProtectedRoute allowedRoles={ACCOUNTANT_AND_FM}>
          <BankReconciliation />
        </ProtectedRoute>
      }
    />

    <Route
      path="/tax-register"
      element={
        <ProtectedRoute allowedRoles={ACCOUNTANT_AND_FM}>
          <TaxRegister />
        </ProtectedRoute>
      }
    />

    <Route
      path="/petty-cash"
      element={
        <ProtectedRoute allowedRoles={ACCOUNTANT_AND_FM}>
          <PettyCash />
        </ProtectedRoute>
      }
    />

    <Route
      path="/reports"
      element={
        <ProtectedRoute allowedRoles={ACCOUNTANT_AND_FM}>
          <AccountantReports />
        </ProtectedRoute>
      }
    />
  </Routes>
);

export default AccountantRoutes;