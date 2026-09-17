import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

import OfficeAdministratorDashboard from "../pages/Operations/OfficeAdministratorDashboard";

const OfficeAdministratorRoutes = () => {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.OFFICE_ADMINISTRATOR,
            ]}
          >
            <OfficeAdministratorDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default OfficeAdministratorRoutes;