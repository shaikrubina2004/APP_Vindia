// src/routes/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  // If not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If role not allowed
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // If everything is valid
  return children;
};

export default ProtectedRoute;