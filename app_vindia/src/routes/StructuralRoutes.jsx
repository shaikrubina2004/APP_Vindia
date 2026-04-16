// src/routes/StructuralRoutes.jsx

import { Routes, Route } from "react-router-dom";
import StructuralEngineerLayout from "../layouts/StructuralEngineerLayout";

import Dashboard from "../pages/Structural Engineer/StructuralEngineerDashboard";
import Projects from "../pages/Structural Engineer/Projects";
import Drawings from "../pages/Structural Engineer/Drawings";
import Analysis from "../pages/Structural Engineer/Analysis";
import BOQ from "../pages/Structural Engineer/BOQ";
import RFI from "../pages/Structural Engineer/RFI";
import Approvals from "../pages/Structural Engineer/Approvals";
import Reports from "../pages/Structural Engineer/Reports";
import Coordination from "../pages/Structural Engineer/Coordination";

function StructuralRoutes() {
  return (
    <StructuralEngineerLayout>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="drawings" element={<Drawings />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="boq" element={<BOQ />} />
        <Route path="rfi" element={<RFI />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="coordination" element={<Coordination />} />
      </Routes>
    </StructuralEngineerLayout>
  );
}

export default StructuralRoutes;