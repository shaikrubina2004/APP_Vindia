import axios from "axios";

// Change this to your backend base URL
const API = axios.create({
  baseURL: "http://localhost:5000/api", 
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * GET daily log for a specific architect + project + date
 * Your frontend expects: getDailyLog(userId, projectId, date)
 */
export const getDailyLog = async (architectId, projectId, date) => {
  try {
    const res = await API.get("/architect-daily-log", {
      params: {
        architect_id: architectId,
        project_id: projectId,
        date,
      },
    });

    return res.data;
  } catch (error) {
    console.error("getDailyLog error:", error);
    throw error;
  }
};

/**
 * CREATE / UPDATE daily log (your submit button uses this)
 */
export const submitDailyLog = async (payload) => {
  try {
    const res = await API.post("/architect-daily-log", payload);
    return res.data;
  } catch (error) {
    console.error("submitDailyLog error:", error);
    throw error;
  }
};