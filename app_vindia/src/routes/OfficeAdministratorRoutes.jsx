// ===== FILE: APP_Vindia/app_vindia/src/routes/OfficeAdministratorRoutes.jsx =====
// Mounted in AppRoutes at  /operations/administrator/*  (role + layout applied there).
import { Routes, Route, Navigate } from "react-router-dom";

import OfficeAdministratorDashboard from "../pages/Operations/administrator/OfficeAdministratorDashboard";
import OfficeRequests from "../pages/Operations/administrator/OfficeRequests";
import OfficeAdminModule from "../pages/Operations/administrator/OfficeAdminModule";
import Visitors from "../pages/Operations/administrator/Visitors";
import Assets from "../pages/Operations/administrator/Assets";
import OfficeDailyUpdate from "../pages/Operations/administrator/OfficeDailyUpdate";
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
