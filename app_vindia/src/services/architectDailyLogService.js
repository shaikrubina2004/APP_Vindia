import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ONLY daily log APIs here
export const submitDailyLog = async (payload) => {
  try {
    const res = await axios.post(
      `${API_BASE}/api/architect/daily-log`,
      payload
    );
    return res.data;
  } catch (err) {
    console.error("API Error:", err.response?.data || err.message);
    throw err;
  }
};