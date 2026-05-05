// FILE PATH: src/routes/StructuralRoutes.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import NotificationsPage from "../pages/StructuralEngineer/NotificationsPage";
import StructuralEngineerLayout from "../layouts/StructuralEngineerLayout";
import Dashboard from "../pages/StructuralEngineer/StructuralEngineerDashboard";
import RFIPage from "../pages/StructuralEngineer/RFI";
import RFIDetailPage from "../pages/StructuralEngineer/RFIDetails";
import SEDailyUpdates from "../pages/StructuralEngineer/SEDailyUpdates";
import AppShell from "../components/incidents/AppShell";
import SharedDrawingPage from "../components/project/SharedDrawingPage";
import MEPUpload from "../pages/MEP Engineer/MEPUploads";
import MEPCoordination from "../pages/MEP Engineer/MEPCoordination";

function StructuralRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StructuralEngineerLayout />}>
        {/* Default redirect */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Core pages */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="shared/drawings" element={<SharedDrawingPage />} />
        <Route path="rfi" element={<RFIPage />} />
        <Route path="rfi/:id" element={<RFIDetailPage />} />

        <Route path="incidents" element={<AppShell />} />
        <Route path="daily-updates" element={<SEDailyUpdates />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="coordination" element={<MEPCoordination />} />
        <Route path="upload" element={<MEPUpload />} />
      </Route>
    </Routes>
  );
}

export default StructuralRoutes;
