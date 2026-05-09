// src/routes/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

// Returns the correct home dashboard for each role.
// Mirrors getDashboardRoute in utils/dashboardRouter.js
const getRoleDashboard = (role) => {
  switch (role) {
    case "ceo":
      return "/dashboard";

    case "hr":
      return "/hr";

    case "site_engineer":
      return "/site-engineer/dashboard";

    case "project_manager":
      return "/pm/team";

    case "quantity_surveyor":
      return "/quantity-surveyor/dashboard";

    case "mep_engineer":
      return "/mep/dashboard";

    case "architect":
      return "/architect/dashboard";

    case "structural_engineer":
      return "/structural-engineer/dashboard";

    case "planning_engineer":
      return "/planning-engineer/dashboard";

    case "qc_engineer":
      return "/qc/dashboard";

    case "safety_officer":
      return "/safety/dashboard";

    case "project_coordinator":
      return "/project-coordinator/dashboard";

    case "business_development_analyst":
      return "/business-development/dashboard";

    // NEW ROLES
    case "digital_marketing":
      return "/digital-marketing/dashboard";
    case "client":
      return "/client/dashboard";

    case "3d_visualizer":
      return "/3d-visualizer/dashboard";

    case "finance_manager":
      return "/finance-manager/dashboard";

    default:
      return "/";
  }
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // Not logged in → back to sign in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Role not allowed → redirect to their own dashboard
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
