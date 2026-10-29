// ===== FILE: APP_Vindia/app_vindia/src/routes/OfficeAdministratorRoutes.jsx =====
// Mounted in AppRoutes at  /operations/administrator/*  (role + layout applied there).
import { Routes, Route, Navigate } from "react-router-dom";

import OfficeAdministratorDashboard from "../pages/operations/administrator/OfficeAdministratorDashboard";
import OfficeRequests from "../pages/operations/administrator/OfficeRequests";
import OfficeAdminModule from "../pages/operations/administrator/OfficeAdminModule";
import Visitors from "../pages/operations/administrator/Visitors";
import Assets from "../pages/operations/administrator/Assets";
import OfficeDailyUpdate from "../pages/operations/administrator/OfficeDailyUpdate";
import AppShell from "../components/incidents/AppShell";

export default function OfficeAdministratorRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<OfficeAdministratorDashboard />} />
      <Route path="requests" element={<OfficeRequests title="Office Requests" />} />
      <Route path="supplies" element={<OfficeAdminModule module="supplies" />} />
      <Route path="facilities" element={<OfficeAdminModule module="facilities" />} />
      <Route path="visitors" element={<Visitors />} />
      <Route path="assets" element={<Assets />} />
      <Route path="daily-update" element={<OfficeDailyUpdate />} />
      <Route path="incidents" element={<AppShell key="offadm-incidents" />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
