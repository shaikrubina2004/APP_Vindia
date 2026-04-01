import { API } from "./authService";

// Apply leave
export const applyLeave = (data) => {
  return API.post("/leaves", data);
};

// Employee leaves
export const fetchLeavesByEmployee = (employeeId) => {
  return API.get(`/leaves/employee/${employeeId}`);
};

// ✅ Fetch pending (default)
export const fetchAllLeaves = () => {
  return API.get("/leaves");
};

// ✅ Fetch by status (dynamic)
export const fetchLeavesByStatus = (status) => {
  return API.get(`/leaves?status=${status}`);
};

// Update status
export const updateLeaveStatus = (leaveId, status) => {
  return API.put(`/leaves/${leaveId}/status`, { status });
};