// ===== FILE: APP_Vindia/app_vindia/src/routes/OperationsManagerRoutes.jsx =====
// Mounted in AppRoutes at  /operations/manager/*  (role + layout applied there).
// Owner: Developer 3. Adding a manager screen = one line here + one menu entry.
import { Routes, Route, Navigate } from "react-router-dom";

import OperationsManagerDashboard from "../pages/operations/manager/OperationsManagerDashboard";
import ApprovalsCenter from "../pages/operations/manager/ApprovalsCenter";
import MaterialRequestsOverview from "../pages/operations/manager/MaterialRequestsOverview";
import ProcurementOverview from "../pages/operations/manager/ProcurementOverview";
import LogisticsOverview from "../pages/operations/manager/LogisticsOverview";
import InventoryOverview from "../pages/operations/manager/InventoryOverview";
import OperationsReports from "../pages/operations/manager/OperationsReports";
import OperationsDailyUpdatesReview from "../pages/operations/manager/OperationsDailyUpdatesReview";
import VendorsView from "../pages/operations/procurement/VendorsView";
import OfficeRequests from "../pages/operations/administrator/OfficeRequests";
import AppShell from "../components/incidents/AppShell";

export default function OperationsManagerRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<OperationsManagerDashboard />} />
      <Route path="approvals" element={<ApprovalsCenter />} />
      <Route path="material-requests" element={<MaterialRequestsOverview />} />
      <Route path="procurement" element={<ProcurementOverview />} />
      <Route path="logistics" element={<LogisticsOverview />} />
      <Route path="inventory" element={<InventoryOverview />} />
      <Route path="vendors" element={<VendorsView />} />
      <Route path="administration" element={<OfficeRequests title="Office Administration" managerMode />} />
      <Route path="daily-updates" element={<OperationsDailyUpdatesReview />} />
      <Route path="reports" element={<OperationsReports />} />
      <Route path="incidents" element={<AppShell key="opsmgr-incidents" />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
