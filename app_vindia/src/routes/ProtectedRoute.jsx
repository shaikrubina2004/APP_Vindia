// src/routes/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardRoute } from "../utils/dashboardRouter";

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  const userRole = normalizeRole(user.role);
  const allowed = allowedRoles.map(normalizeRole);

  if (!allowed.includes(userRole)) {
    return <Navigate to={getDashboardRoute(userRole)} replace />;
  }

  return children;
};

export default ProtectedRoute;
