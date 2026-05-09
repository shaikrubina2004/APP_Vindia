import { Routes, Route } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";
import ClientDashboard from "../pages/Client/ClientDashboard";
import AppShell from "../components/incidents/AppShell";
import RFIPage from "../pages/StructuralEngineer/RFI";
import RFIDetailPage from "../pages/StructuralEngineer/RFIDetails";

function ClientRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ClientLayout />}>
        {" "}
        {/* ✅ layout wraps as parent */}
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="incidents" element={<AppShell />} />
        <Route path="rfi" element={<RFIPage />} />
        <Route path="rfi/:id" element={<RFIDetailPage />} />
      </Route>
    </Routes>
  );
}

export default ClientRoutes;
