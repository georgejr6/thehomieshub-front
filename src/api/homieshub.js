import axios from "axios";
import { apiErrorCode, BLOCKED_MESSAGE, safeAppealUrl } from "@/lib/apiErrors";
import { toast } from "@/components/ui/use-toast";

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

// The server refuses content to non-members (402 membership_required) and
// everything to banned accounts (403 code "banned" + appealUrl; older bodies
// error "account_banned"). Broadcast both so the app can show the
// members-only / banned screens instead of broken pages. Content across a
// block is 403 code "blocked": one friendly toast instead of a broken page.
let lastBlockedToast = 0;
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const code = apiErrorCode(err);
    if (status === 402 && code === 'membership_required') { window.__hhMembershipRequired = true; window.dispatchEvent(new CustomEvent('hh:membership-required')); }
    // Sticky flags too: these can fire during the first /auth/me, before the
    // screens mount. Announced once — later 403s don't re-fire it.
    if (status === 403 && code === 'banned' && !window.__hhAccountBanned) {
      window.__hhAccountBanned = true;
      window.__hhBanAppealUrl = safeAppealUrl(err.response.data?.appealUrl);
      window.dispatchEvent(new CustomEvent('hh:account-banned'));
    }
    if (status === 403 && code === 'blocked' && Date.now() - lastBlockedToast > 5000) {
      lastBlockedToast = Date.now();
      toast({ title: "Not available", description: BLOCKED_MESSAGE });
    }
    return Promise.reject(err);
  }
);

export default api;