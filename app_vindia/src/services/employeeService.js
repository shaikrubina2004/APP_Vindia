import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/employees",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// ✅ GET
export const getEmployees = () => API.get("/");
export const getEmployeeById = (id) => API.get(`/${id}`);
export const deleteEmployee = (id) => API.delete(`/${id}`);

// ✅ CREATE (send FormData directly)
export const createEmployee = (data) => {
  return API.post("/", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// ✅ UPDATE (send FormData directly)
export const updateEmployee = (id, data) => {
  return API.put(`/${id}`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};