import axios from "axios";

const baseURL =
  process.env.NODE_ENV === "development"
    ? "http://10.33.167.107:8000/api" 
    : "/api"; 

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("adminToken");
  const authToken = localStorage.getItem("authToken");

  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

export default api;
