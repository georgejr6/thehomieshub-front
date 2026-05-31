import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/homieshub";

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const TOKEN_KEY = "access_token";

/* ---------- helpers ---------- */

const safe = (v, fallback = "") =>
  typeof v === "string" && v.trim().length ? v.trim() : fallback;

const normalizeUser = (raw) => {
  if (!raw) return null;

  const email = safe(raw.email);
  const emailName = email ? email.split("@")[0] : "User";

  const username = safe(raw.username, emailName);
  // Use displayName (user-chosen) over real OAuth name. Fall back to username, never expose raw.name.
  const name = safe(raw.displayName) || username;

  const avatar =
    safe(raw.avatar) ||
    safe(raw.avatarUrl) ||
    safe(raw.avatar_url) ||
    null;

  const tier =
    safe(raw.tier) ||
    (raw?.subscription?.isActive ? "Premium" : "Free");

  return {
    ...raw,
    name,
    username,
    avatar,
    tier,
  };
};

/* ---------- provider ---------- */

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDiscordPrompt, setShowDiscordPrompt] = useState(false);

  // forces refresh when token changes
  const [tokenVersion, setTokenVersion] = useState(0);

  const setToken = (token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    setTokenVersion(v => v + 1);
  };

  const refreshMe = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const resp = await api.get("/auth/me");
      const raw =
        resp?.data?.result?.user ||
        resp?.data?.user ||
        null;

      const normalized = normalizeUser(raw);
      setUser(normalized);
      return normalized;
    } catch {
      setUser(null);
      setToken(null);
      return null;
    }
  };

  /** 🔑 use this after login/register */
  const setAccessToken = async (token) => {
    setToken(token);
    const u = await refreshMe();
    if (u && !localStorage.getItem('hh_onboarding_done')) {
      // Only show for accounts created after onboarding shipped (2026-03-22).
      // Existing users get silently skipped so they never see it unexpectedly.
      const SHIP_DATE = new Date('2026-03-22T00:00:00Z');
      const isExistingUser = !u.createdAt || new Date(u.createdAt) < SHIP_DATE;
      if (isExistingUser) {
        localStorage.setItem('hh_onboarding_done', '1');
      } else {
        setShowOnboarding(true);
      }
    }
    // Show Discord connect prompt after login if not linked and user hasn't dismissed forever
    if (u && !u.discordUsername && localStorage.getItem('hh_discord_prompt') !== 'never') {
      setTimeout(() => setShowDiscordPrompt(true), 1500);
    }
    return u;
  };

  const startTutorial = () => setShowOnboarding(true);
  const stopTutorial = () => {
    localStorage.setItem('hh_onboarding_done', '1');
    setShowOnboarding(false);
  };

  // initial + token-change load
  useEffect(() => {
    (async () => {
      await refreshMe();
      setLoading(false);
    })();
  }, [tokenVersion]);

  const signOut = () => {
    setUser(null);
    setToken(null);
  };

  const signIn = async (provider, payload) => {
    if (provider === "token") {
      return await setAccessToken(payload?.access_token);
    }

    // keep admin mock if still used
    if (provider === "admin") {
      const admin = normalizeUser({
        name: "Admin User",
        username: "admin",
        email: "admin@homieshub.com",
        avatarUrl: "https://avatar.vercel.sh/admin.png",
        tier: "Premium",
        isAdmin: true,
      });
      setUser(admin);
      return admin;
    }

    return await refreshMe();
  };

  const updateUserTier = (tier) => {
    if (!user) return;
    setUser(prev => normalizeUser({ ...prev, tier }));
  };

  const isPremium = useMemo(() => {
    if (!user) return false;
    if (user.subscription?.isActive) return true;
    if ((user.tags || []).includes('member')) return true;
    return user.tier !== "Free";
  }, [user]);

  const value = {
    user,
    loading,

    signIn,
    signOut,
    refreshMe,
    setAccessToken,

    updateUserTier,
    isPremium,

    triggerLockedFeature: () => setIsLockedModalOpen(true),
    isLockedModalOpen,
    setIsLockedModalOpen,
    handleUpgradeRedirect: async () => true,

    showOnboarding,
    startTutorial,
    stopTutorial,

    showDiscordPrompt,
    dismissDiscordPrompt: () => setShowDiscordPrompt(false),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
