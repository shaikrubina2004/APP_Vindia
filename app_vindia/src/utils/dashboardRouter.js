// src/utils/dashboardRouter.js
import { ROLES } from "../roles";

export const getDashboardRoute = (role) => {
  // FIX: was `user.role?.toLowerCase()` — user doesn't exist here.
  // The parameter IS the role string, so use it directly.
  const r = role?.toLowerCase().replace(/\s+/g, "_");

  switch (r) {
    case ROLES.CEO:
      return "/dashboard";

    case ROLES.HR:
    case ROLES.HR_MANAGER:
      return "/hr";

    case ROLES.PROJECT_MANAGER:
      return "/project-manager/dashboard";

    case ROLES.PROJECT_COORDINATOR:
      return "/project-coordinator/dashboard";

    case ROLES.SITE_ENGINEER:
      return "/site-engineer/dashboard";

    case ROLES.QUANTITY_SURVEYOR:
      return "/quantity-surveyor/dashboard";

    case ROLES.STRUCTURAL_ENGINEER:
      return "/structural-engineer/dashboard";

    case ROLES.MEP_ENGINEER:
      return "/mep/dashboard";

    case ROLES.PLANNING_ENGINEER:
      return "/planning-engineer/dashboard";

    case ROLES.SAFETY_OFFICER:
      return "/safety/dashboard";

    case ROLES.QC_ENGINEER:
      return "/qc/dashboard";

    case ROLES.ARCHITECT:
      return "/architect/dashboard";

    case ROLES.BDA:
      return "/business-development/dashboard";

    case ROLES.CLIENT:
      return "/client/dashboard";

    case ROLES.SOFTWARE_ENGINEER:
      return "/softwareEngineer/dashboard";

    case ROLES.TESTER:
      return "/tester/dashboard";

    case ROLES.DIGITAL_MARKETING:
      return "/digital-marketing/dashboard";

    case ROLES.THREE_D_VISUALIZER:
      return "/3d-visualizer/dashboard";

    case ROLES.FINANCE_MANAGER:
      return "/finance-manager/dashboard";

    default:
      return "/";
  }
};
