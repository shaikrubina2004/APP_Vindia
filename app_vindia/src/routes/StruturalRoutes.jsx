// src/routes/StructuralRoutes.jsx

import { Routes, Route } from "react-router-dom";
import StructuralEngineerLayout from "../layouts/StructuralEngineerLayout";

import Dashboard from "../pages/structural/Dashboard";
import Projects from "../pages/structural/Projects";
import Drawings from "../pages/structural/Drawings";
import Analysis from "../pages/structural/Analysis";
import BOQ from "../pages/structural/BOQ";
import RFI from "../pages/structural/RFI";
import Approvals from "../pages/structural/Approvals";
import Reports from "../pages/structural/Reports";
import Coordination from "../pages/structural/Coordination";

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