// FILE PATH: src/routes/StructuralRoutes.jsx

import { Routes, Route, Navigate }     from "react-router-dom";
import StructuralEngineerLayout        from "../layouts/StructuralEngineerLayout";
import Dashboard                       from "../pages/Structural Engineer/StructuralEngineerDashboard";
import RFI                             from "../pages/Structural Engineer/RFI";
import SEDailyUpdates                  from "../pages/Structural Engineer/SEDailyUpdates";
import AppShell                        from "../components/incidents/AppShell";
import SharedDrawingPage               from "../components/project/SharedDrawingPage";
import SEBoq                           from "../pages/Structural Engineer/SEBoq";

function StructuralRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StructuralEngineerLayout />}>

        {/* Default redirect */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Core pages */}
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="shared/drawings" element={<SharedDrawingPage />} />
        <Route path="boq"            element={<SEBoq />} />
        <Route path="rfi"            element={<RFI />} />
        <Route path="incidents"      element={<AppShell />} />
        <Route path="daily-updates"  element={<SEDailyUpdates />} />

      </Route>
    </Routes>
  );
}

export default StructuralRoutes;