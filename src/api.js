import axios from "axios";

// Dynamically set baseURL depending on environment
const baseURL =
  process.env.NODE_ENV === "development"
    ? "http://192.168.10.87:8000/api" // Laravel backend during local dev
    : "/api"; // In production, let the server (Nginx/Apache) handle it

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach token automatically
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
