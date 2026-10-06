import api from "./api";

const B = "/office-admin";

const officeAdminService = {
  getDashboard: () => api.get(`${B}/dashboard`),
  getRequests: (params = {}) => api.get(`${B}/requests`, { params }),
  createRequest: (data) => api.post(`${B}/requests`, data),
  updateRequestStatus: (id, dataOrStatus, note) => {
    const body = typeof dataOrStatus === "string" ? { status: dataOrStatus, note } : dataOrStatus;
    return api.put(`${B}/requests/${id}/status`, body);
  },

  // Existing Office Administration modules remain available.
  getFacilities: () => api.get(`${B}/facilities`),
  createFacility: (data) => api.post(`${B}/facilities`, data),
  updateFacilityStatus: (id, data) => api.put(`${B}/facilities/${id}/status`, data),
  getSupplies: () => api.get(`${B}/supplies`),
  createSupply: (data) => api.post(`${B}/supplies`, data),
  transactSupply: (id, data) => api.post(`${B}/supplies/${id}/transaction`, data),

  getVisitors: (params = {}) => api.get(`${B}/visitors`, { params }),
  createVisitor: (data) => api.post(`${B}/visitors`, data),
  updateVisitorStatus: (id, data) => api.put(`${B}/visitors/${id}/status`, data),
  checkInVisitor: (id) => api.put(`${B}/visitors/${id}/check-in`),
  checkOutVisitor: (id) => api.put(`${B}/visitors/${id}/check-out`),

  getAssets: (params = {}) => api.get(`${B}/assets`, { params }),
  createAsset: (data) => api.post(`${B}/assets`, data),
  updateAsset: (id, data) => api.put(`${B}/assets/${id}`, data),
  assignAsset: (id, assigned_to_name) => api.put(`${B}/assets/${id}/assign`, { assigned_to_name }),
  updateAssetStatus: (id, status, notes) => api.put(`${B}/assets/${id}/status`, { status, notes }),
};

export default officeAdminService;
