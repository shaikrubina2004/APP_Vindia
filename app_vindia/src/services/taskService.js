import api from "./api";

// 🎯 CREATE TASK
export const createTask = async (taskData) => {
  const res = await api.post("/tasks", taskData);
  return res.data;
};