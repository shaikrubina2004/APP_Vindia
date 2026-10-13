import api from "./api";

const operationsService = {
  // Operations Manager control tower.
  getDashboard: () => api.get("/operations/dashboard"),
  getApprovals: () => api.get("/operations/approvals"),
  getReports: (params = {}) => api.get("/operations/reports", { params }),

  getMaterialRequests: (params = {}) => api.get("/material-request", { params }),
  decideMaterialRequest: (id, status, reason) =>
    api.put(`/material-request/status/${id}`, { status, reason }),

  getPurchaseOrders: (params = {}) => api.get("/procurement/purchase-orders", { params }),
  getPurchaseOrder: (id) => api.get(`/procurement/purchase-orders/${id}`),
  approvePurchaseOrder: (id) => api.put(`/procurement/purchase-orders/${id}/approve`),
  rejectPurchaseOrder: (id, reason) => api.put(`/procurement/purchase-orders/${id}/reject`, { reason }),
  cancelPurchaseOrder: (id, reason) => api.put(`/procurement/purchase-orders/${id}/cancel`, { reason }),
  getProcurementDailyReports: (params = {}) => api.get("/procurement/daily-reports/all", { params }),

  getDeliveries: (params = {}) => api.get("/deliveries", { params }),
  getInventoryDashboard: () => api.get("/inventory/dashboard"),
  getStockRegister: (params = {}) => api.get("/inventory/stock-register", { params }),
  getTransactions: (params = {}) => api.get("/inventory/transactions", { params }),

  getDailyUpdates: (params = {}) => api.get("/ops-daily-updates", { params }),
  getProcurementReports: () => api.get("/procurement/daily-reports/all"),
  getNotifications: (userId) => api.get(`/operations-notifications/${userId}`),
};

export default operationsService;
