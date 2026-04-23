import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

// GET ALL PROJECTS
export const getProjects = () => {
  return API.get("/projects");
};