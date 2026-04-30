import { Routes, Route, Navigate } from "react-router-dom";
import StructuralEngineerLayout from "../layouts/StructuralEngineerLayout";
import Dashboard from "../pages/Structural Engineer/StructuralEngineerDashboard";
import Drawings from "../pages/Structural Engineer/Drawings";
import RFI from "../pages/Structural Engineer/RFI";
import SEDailyUpdates from "../pages/Structural Engineer/SEDailyUpdates";
import MEPUploads from "../pages/MEP Engineer/MEPUploads";
import AppShell from "../components/incidents/AppShell";
import SharedDrawingPage from "../components/project/SharedDrawingPage";

function StructuralRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StructuralEngineerLayout />}>
        {/* Redirect bare /structural-engineer to dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="shared/drawings" element={<SharedDrawingPage />} />
        <Route path="rfi" element={<RFI />} />
        <Route path="incidents" element={<AppShell />} />
        <Route path="daily-updates" element={<SEDailyUpdates />} />
        <Route path="upload" element={<MEPUploads />} />
      </Route>
    </Routes>
  );
}

export default StructuralRoutes;
