import { Routes, Route } from "react-router-dom";
import StructuralEngineerLayout from "../layouts/StructuralEngineerLayout";

import Dashboard from "../pages/Structural Engineer/StructuralEngineerDashboard";
import Projects from "../pages/Structural Engineer/Projects";
import Drawings from "../pages/Structural Engineer/Drawings";
import BOQ from "../pages/Structural Engineer/BOQ";
import RFI from "../pages/Structural Engineer/RFI";
import SEDailyUpdates from "../pages/Structural Engineer/SEDailyUpdates";
import AppShell from "../components/incidents/AppShell";

function StructuralRoutes() {
  return (
    <Routes>
      <Route path="/" element={<StructuralEngineerLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="drawings" element={<Drawings />} />
        <Route path="boq" element={<BOQ />} />
        <Route path="rfi" element={<RFI />} />
        <Route path="incidents" element={<AppShell />} />
        <Route path="daily-updates" element={<SEDailyUpdates />} />
      </Route>
    </Routes>
  );
}

export default StructuralRoutes;