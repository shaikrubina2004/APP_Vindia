import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach the logged-in user's token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// GET ALL PROJECTS
export const getProjects = () => {
  return API.get("/projects");
};

// GET MY ASSIGNED PROJECTS — scoped server-side by role
// (site_engineer/coordinator/architect/client/manager), unlike getProjects()
// above which returns every project in the company.
export const getMyProjects = () => {
  return API.get("/projects/mine");
};