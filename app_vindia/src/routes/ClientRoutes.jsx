import { Routes, Route } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";

// Dashboard
import ClientDashboard from "../pages/Client/ClientDashboard";

// Progress
import ClientMilestone from "../pages/Client/ClientMilestone";
import SitePhotos from "../pages/Client/SitePhotos";
import DailyLogs from "../pages/Client/DailyLogs";

// Finance
import Invoice from "../pages/Client/Invoice";
import BoqEstimate from "../pages/Client/BoqEstimate";
import ClientPayment from "../pages/Client/ClientPayment";

// Documents
import Approval from "../pages/Client/Approval";
import SharedFile from "../pages/Client/SharedFile";

// Support (shared)
import AppShell from "../components/incidents/AppShell";
import RFIPage from "../pages/StructuralEngineer/RFI";
import RFIDetailPage from "../pages/StructuralEngineer/RFIDetails";

function ClientRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ClientLayout />}>
        {/* Overview */}
        <Route path="dashboard" element={<ClientDashboard />} />

        {/* Progress */}
        <Route path="milestones" element={<ClientMilestone />} />
        <Route path="site-photos" element={<SitePhotos />} />
        <Route path="daily-logs" element={<DailyLogs />} />

        {/* Finance */}
        <Route path="invoices" element={<Invoice />} />
        <Route path="boq" element={<BoqEstimate />} />
        <Route path="payments" element={<ClientPayment />} />

        {/* Documents */}
        <Route path="approvals" element={<Approval />} />
        <Route path="shared-files" element={<SharedFile />} />

        {/* Support */}
        <Route path="incidents" element={<AppShell />} />
        <Route path="rfi" element={<RFIPage />} />
        <Route path="rfi/:id" element={<RFIDetailPage />} />
      </Route>
    </Routes>
  );
}

export default ClientRoutes;
