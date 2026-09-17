import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { ROLES } from "../roles";

import OperationsManagerDashboard from "../pages/Operations/OperationsManagerDashboard";

const OperationsManagerRoutes = () => {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              ROLES.OPERATIONS_MANAGER,
            ]}
          >
            <OperationsManagerDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default OperationsManagerRoutes;