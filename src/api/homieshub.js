import axios from "axios";

const api = axios.create({
  // baseURL: "https://7e44af3754f6.ngrok-free.app/api",
  // baseURL: "http://localhost:8800/api",
  // VITE_API_URL lets a local build point at a local/staging backend.
  baseURL: import.meta.env.VITE_API_URL || "https://backend.thehomies.app/api",
  withCredentials: false, // we use Bearer tokens, no cookies needed
});

// attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;