// ===== FILE: APP_Vindia/app_vindia/src/services/employeeDocumentService.js =====
import api from "./api";

const D = "/employee-documents";

const employeeDocumentService = {
  getByEmployee: (employeeId) => api.get(`${D}/employee/${employeeId}`),
  upload: (formData) =>
    api.post(D, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  delete: (id) => api.delete(`${D}/${id}`),
};

export default employeeDocumentService;