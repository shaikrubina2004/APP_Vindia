import { Routes, Route } from "react-router-dom";
import MEPLayout from "../layouts/MEPLayout";

import MEPDashboard from "../pages/MEP Engineer/MEPDashboard";
import MEPDailylog from "../pages/MEP Engineer/MEPDailylog";
import MEPDrawings from "../pages/MEP Engineer/MEPDrawings";
import MEPUploads from "../pages/MEP Engineer/MEPUploads";
import MEPVerssionControll from "../pages/MEP Engineer/MEPVerssionControll";
import MEPCoordination from "../pages/MEP Engineer/MEPCoordination";
import AppShell from "../components/incidents/AppShell";
import SharedDrawingPage from "../components/project/SharedDrawingPage";

function MEPRoutes() {
  return (
    <MEPLayout>
      <Routes>
        <Route path="dashboard" element={<MEPDashboard />} />
        <Route path="daily-log" element={<MEPDailylog />} />
        <Route path="drawings" element={<MEPDrawings />} />
        <Route path="shared/drawings" element={<SharedDrawingPage />} />
        <Route path="version-control" element={<MEPVerssionControll />} />
        <Route path="incidents" element={<AppShell />} />
        <Route path="coordination" element={<MEPCoordination />} />
        <Route path="upload" element={<MEPUploads />} />
      </Routes>
    </MEPLayout>
  );
}

export default MEPRoutes;
