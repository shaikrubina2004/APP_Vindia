import api from "./api";
import procurementService from "./procurementService";
import { getLogisticsDashboard } from "./logisticsService";
import { getInventoryDashboard } from "./inventoryService";

const operationsService = {
  // Legacy/current dashboard contract retained for existing screens.
  async getLegacyDashboard() {
    const [requests, purchaseOrders, logistics, inventory, dailyUpdates] =
      await Promise.allSettled([
        api.get("/material-request/department"),
        procurementService.getAllPurchaseOrders(),
        getLogisticsDashboard(),
        getInventoryDashboard(),
        api.get("/ops-daily-updates", { params: { status: "pending", role_code: "all" } }),
      ]);
    const value = (result, fallback) =>
      result.status === "fulfilled" ? result.value?.data ?? fallback : fallback;
    const requestRows = value(requests, []);
    const poRows = value(purchaseOrders, []);
    const logisticsData = value(logistics, { kpis: {}, recent: [] });
    const inventoryData = value(inventory, {});
    const dailyData = value(dailyUpdates, { data: [] });
    return {
      requests: Array.isArray(requestRows) ? requestRows : [],
      purchaseOrders: Array.isArray(poRows) ? poRows : [],
      logistics: logisticsData?.kpis || {},
      recentDeliveries: logisticsData?.recent || [],
      inventory: inventoryData || {},
      pendingDailyUpdates: Array.isArray(dailyData?.data) ? dailyData.data : [],
      sourceStatus: { requests: requests.status, purchaseOrders: purchaseOrders.status, logistics: logistics.status, inventory: inventory.status, dailyUpdates: dailyUpdates.status },
    };
  },

  // New Operations Manager control tower.
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
