import axios from "axios";

const API = "http://localhost:5000/api/dashboard";

export const getDashboardData = async () => {
  const res = await axios.get(API);
  return res.data;
};