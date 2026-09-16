import axios from "axios";

const ITEMS_API = axios.create({ baseURL: "http://localhost:5000/api/inventory/items" });
const TXN_API = axios.create({ baseURL: "http://localhost:5000/api/inventory" });
const GRN_API = axios.create({ baseURL: "http://localhost:5000/api/goods-receipts" });

[ITEMS_API, TXN_API, GRN_API].forEach((api) => {
  api.interceptors.request.use((req) => {
    const token = localStorage.getItem("token");
    if (token) req.headers.Authorization = `Bearer ${token}`;
    return req;
  });
});

/* Item Master */
export const getItems = (params) => ITEMS_API.get("/", { params });
export const getItem = (id) => ITEMS_API.get(`/${id}`);
export const createItem = (data) => ITEMS_API.post("/", data);
export const updateItem = (id, data) => ITEMS_API.put(`/${id}`, data);
export const deleteItem = (id) => ITEMS_API.delete(`/${id}`);
export const getLowStockItems = () => ITEMS_API.get("/low-stock");

/* Stock register / ledger */
export const getStockRegister = (params) => TXN_API.get("/stock-register", { params });
export const getTransactions = (params) => TXN_API.get("/transactions", { params });

/* Stock movements */
export const issueStock = (data) => TXN_API.post("/issue", data);
export const returnStock = (data) => TXN_API.post("/return", data);
export const transferStock = (data) => TXN_API.post("/transfer", data);
export const adjustStock = (data) => TXN_API.post("/adjustment", data);

/* Dashboard */
export const getInventoryDashboard = () => TXN_API.get("/dashboard");

/* Goods Receipt */
export const getGoodsReceipts = () => GRN_API.get("/");
export const getGoodsReceipt = (id) => GRN_API.get(`/${id}`);
export const createGoodsReceipt = (data) => GRN_API.post("/", data);