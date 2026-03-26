import { API } from "./authService";

export const fetchAttendanceByEmployee = (employeeId) => {
  return API.get(`/attendance/${employeeId}`);
};

export const saveAttendance = (data) => {
  return API.post("/attendance", data);
};