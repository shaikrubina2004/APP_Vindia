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

export const fetchTeamLeaves = (status = "") => {
  return API.get("/leaves/team", {
    params: status ? { status } : {},
  });
};

// ✅ Fetch by status (dynamic)
export const fetchLeavesByStatus = (status) => {
  return API.get(`/leaves?status=${status}`);
};

// Update status
export const updateLeaveStatus = (leaveId, status, comment = "") => {
  return API.put(`/leaves/${leaveId}/status`, { status, comment });
};
export const fetchMyLeaveBalance = () => API.get("/leaves/me/balance");
