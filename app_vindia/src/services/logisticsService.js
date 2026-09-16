import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api/deliveries" });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const getDeliveries = (params) => API.get("/", { params });
export const getDelivery = (id) => API.get(`/${id}`);
export const createDelivery = (data) => API.post("/", data);
export const dispatchDelivery = (id, data) => API.put(`/${id}/dispatch`, data);
export const markInTransit = (id) => API.put(`/${id}/in-transit`);
export const markDelivered = (id, data) => API.put(`/${id}/deliver`, data);
export const markDelayed = (id, data) => API.put(`/${id}/delay`, data);
export const cancelDelivery = (id) => API.put(`/${id}/cancel`);
export const getPendingReceipts = () => API.get("/pending-receipt");
export const getLogisticsDashboard = () => API.get("/dashboard");