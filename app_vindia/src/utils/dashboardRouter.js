import { ROLES } from "../roles";

export const getDashboardRoute = (role) => {
  switch (role) {
    case ROLES.CEO:
      return "/dashboard";

    case ROLES.HR:
      return "/hr";

    case ROLES.PROJECT_MANAGER:
      return "/project-manager/dashboard";

    case ROLES.SITE_ENGINEER:
      return "/site-engineer/dashboard";

    case ROLES.MEP_ENGINEER:
      return "/mep/dashboard";

    default:
      return "/";
  }
};
