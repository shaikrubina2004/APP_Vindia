// ===== FILE: APP_Vindia/app_vindia/src/services/operationsWbsService.js =====
import api from "./api";

const operationsWbsService = {
  // Operations Manager read-only WBS project list.
  getProjects: () => api.get("/operations/wbs/projects"),

  // Operations Manager read-only WBS + operational rollups.
  getProjectWbs: (projectId) =>
    api.get(`/operations/wbs/${projectId}`),

  // Site Engineer WBS reference data.
  getProjectWbsTree: (projectId) =>
    api.get(`/wbs/${projectId}`),
};

export default operationsWbsService;
