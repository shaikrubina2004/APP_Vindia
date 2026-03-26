import { API } from "./authService";

// Employee applies leave
export const applyLeave = (data) => {
  return API.post("/leaves", data);
};

// Employee views own leaves
export const fetchLeavesByEmployee = (employeeId) => {
  return API.get(`/leaves/employee/${employeeId}`);
};

// HR fetch all leaves
export const fetchAllLeaves = () => {
  return API.get("/leaves");
};

// HR approve / reject leave
export const updateLeaveStatus = (leaveId, status) => {
  return API.put(`/leaves/${leaveId}/status`, { status });
};