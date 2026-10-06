import { Routes, Route, Navigate } from "react-router-dom";
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

// Support - client-scoped pages (the shared internal incident/RFI consoles gave a client
// access to every project and to internal actions)
import ClientIncidents from "../pages/Client/ClientIncidents";
import ClientRFI from "../pages/Client/ClientRFI";

function ClientRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ClientLayout />}>
        {/* Overview */}
        <Route index element={<Navigate to="dashboard" replace />} />
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
        <Route path="drawings" element={<SharedFile />} />
        <Route path="shared-files" element={<SharedFile />} />

        {/* Support */}
        <Route path="incidents" element={<ClientIncidents />} />
        <Route path="rfi" element={<ClientRFI />} />
        <Route path="rfi/:id" element={<ClientRFI />} />

        {/* Unknown client URL -> dashboard (it used to render a blank page) */}
        <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default ClientRoutes;
