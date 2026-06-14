import axios from "axios";

// MyConsent.me backend. Same Central Billing token as the rest of the app
// (shared SSO via backend.viddy.cloud), so the user is already authenticated.
const myconsent = axios.create({
  baseURL: "https://backend.myconsent.me/api",
  withCredentials: false,
});

myconsent.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default myconsent;
