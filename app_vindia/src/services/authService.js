import axios from "axios";

export const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// signup
export const signup = (data) => {
  return API.post("/auth/signup", data);
};

// login
export const login = (data) => {
  return API.post("/auth/login", data);
};