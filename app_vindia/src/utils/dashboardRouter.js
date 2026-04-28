import { ROLES } from "../roles";

export const getDashboardRoute = (role) => {
  const r = role?.toLowerCase(); // 🔥 safety

  switch (r) {
    case ROLES.CEO:
      return "/dashboard";

    case ROLES.HR:
    case ROLES.HR_MANAGER: // ✅ added
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

    // ✅ NEW ROLES

    case ROLES.CLIENT:
      return "client/dashboard"; // or create "/client/dashboard" later

    case ROLES.SOFTWARE_ENGINEER:
      return "softwareEngineer/dashboard"; // or "/it/dashboard" if you create one

    case ROLES.TESTER:
      return "tester/dashboard"; // same as above

    default:
      return "/";
  }
};
