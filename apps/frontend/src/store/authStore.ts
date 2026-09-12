import { create } from "zustand";
import { ApiError, apiRequest } from "../lib/http";
import { usePlaybackStore } from "./playbackStore";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
  avatarUrl?: string;
  profiles: Array<{ id: string; name: string; type: "ADULT" | "KIDS" }>;
}

type CurrentUserResponse = { user: AuthUser };
type CsrfResponse = { csrfToken: string };

interface AuthState {
  user: AuthUser | null;
  profileId: string | null;
  avatarUrl: string | null;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfileId: (profileId: string | null) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

let csrfToken: string | null = null;
let refreshInFlight: Promise<AuthUser | null> | null = null;

// Shorter timeout for auth init to avoid long black screen
const AUTH_INIT_TIMEOUT_MS = 5_000;

async function ensureCsrfToken(force = false) {
  if (!force && csrfToken) return csrfToken;
  const data = await apiRequest<CsrfResponse>("/auth/csrf", {}, AUTH_INIT_TIMEOUT_MS);
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function protectedRequest<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const token = await ensureCsrfToken();
  try {
    return await apiRequest<T>(path, {
      ...options,
      headers: { ...options.headers, "X-CSRF-Token": token }
    });
  } catch (error) {
    if (allowRefresh && error instanceof ApiError && error.status === 401) {
      const user = await refreshAccessToken();
      if (user) return protectedRequest<T>(path, options, false);
    }
    throw error;
  }
}

async function refreshAccessToken(): Promise<AuthUser | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const token = await ensureCsrfToken(true);
        const data = await apiRequest<{ user: AuthUser }>("/auth/refresh", {
          method: "POST",
          headers: { "X-CSRF-Token": token }
        });
        return data.user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function getStoredItem(key: string): string | null {
  try {
    return localStorage.getItem(`rytoxgroup:${key}`) || localStorage.getItem(`streamforge:${key}`);
  } catch {
    return null;
  }
}
function setStoredItem(key: string, val: string) {
  try {
    localStorage.setItem(`rytoxgroup:${key}`, val);
    localStorage.setItem(`streamforge:${key}`, val);
  } catch (err) {
    console.warn("Storage quota exceeded or storage unavailable:", err);
  }
}
function removeStoredItem(key: string) {
  try {
    localStorage.removeItem(`rytoxgroup:${key}`);
    localStorage.removeItem(`streamforge:${key}`);
  } catch {}
}

function resetLocalAuth(set: (state: Partial<AuthState>) => void) {
  csrfToken = null;
  removeStoredItem("auth:user");
  removeStoredItem("auth:profileId");
  removeStoredItem("profile:avatar");
  set({ user: null, profileId: null, avatarUrl: null });
  usePlaybackStore.getState().loadUserData();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profileId: null,
  avatarUrl: getStoredItem("profile:avatar"),
  initialized: false,
  setUser: (user) => {
    if (user) {
      set((state) => {
        const mergedProfiles = (user.profiles && user.profiles.length > 0)
          ? user.profiles
          : (state.user?.profiles || []);
        const effectiveAvatar = user.avatarUrl !== undefined
          ? (user.avatarUrl || null)
          : (state.avatarUrl || null);
        
        const updatedUser: AuthUser = {
          ...user,
          avatarUrl: effectiveAvatar || undefined,
          profiles: mergedProfiles
        };

        setStoredItem("auth:user", JSON.stringify(updatedUser));
        if (effectiveAvatar) {
          setStoredItem("profile:avatar", effectiveAvatar);
        } else {
          removeStoredItem("profile:avatar");
        }

        return { user: updatedUser, avatarUrl: effectiveAvatar };
      });
    } else {
      removeStoredItem("auth:user");
      removeStoredItem("profile:avatar");
      set({ user: null, avatarUrl: null });
    }
    usePlaybackStore.getState().loadUserData();
  },
  setProfileId: (profileId) => {
    if (profileId) setStoredItem("auth:profileId", profileId);
    else removeStoredItem("auth:profileId");
    set({ profileId });
    usePlaybackStore.getState().loadUserData();
  },
  setAvatarUrl: (avatarUrl) => {
    if (avatarUrl) setStoredItem("profile:avatar", avatarUrl);
    else removeStoredItem("profile:avatar");

    set((state) => {
      const updatedUser = state.user
        ? { ...state.user, avatarUrl: avatarUrl || undefined }
        : null;
      if (updatedUser) {
        setStoredItem("auth:user", JSON.stringify(updatedUser));
      }
      return {
        avatarUrl,
        user: updatedUser
      };
    });
  },
  initialize: async () => {
    // Fast path: try to restore from localStorage first for instant UI
    const cachedUserStr = getStoredItem("auth:user");
    if (cachedUserStr) {
      try {
        const cachedUser = JSON.parse(cachedUserStr) as AuthUser;
        if (cachedUser.id?.startsWith("offline-")) {
          throw new Error("Reject legacy offline user");
        }
        const profileId = getStoredItem("auth:profileId") || cachedUser.username;
        // Show cached user immediately while we verify with backend
        set({ user: cachedUser, profileId, initialized: true });
        usePlaybackStore.getState().loadUserData();

        // Background verify: try to refresh from backend
        try {
          const user = await authApi.getCurrentUser();
          setStoredItem("auth:user", JSON.stringify(user));
          if (user.avatarUrl) {
            setStoredItem("profile:avatar", user.avatarUrl);
            set({ user, avatarUrl: user.avatarUrl });
          } else {
            set({ user });
          }
          usePlaybackStore.getState().loadUserData();
        } catch (error) {
          // If token verification fails (e.g. 401 Unauthorized), clean up session
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            resetLocalAuth(set);
          }
        }
        return;
      } catch {
        // Invalid cached data, fall through to normal flow
        removeStoredItem("auth:user");
      }
    }

    // Normal flow: try to authenticate with backend
    try {
      const user = await authApi.getCurrentUser();
      const profileId = getStoredItem("auth:profileId") || user.username;
      setStoredItem("auth:user", JSON.stringify(user));
      if (user.avatarUrl) {
        setStoredItem("profile:avatar", user.avatarUrl);
        set({ user, profileId, avatarUrl: user.avatarUrl, initialized: true });
      } else {
        set({ user, profileId, initialized: true });
      }
    } catch {
      resetLocalAuth(set);
      set({ initialized: true });
    }
    usePlaybackStore.getState().loadUserData();
  },
  logout: async () => {
    try {
      await protectedRequest<void>("/auth/logout", { method: "POST" }, false);
    } catch {
      // Local cleanup is still correct when the server session has already expired.
    } finally {
      resetLocalAuth(set);
    }
  }
}));

export const authApi = {
  async login(email: string, password: string): Promise<AuthUser> {
    const token = await ensureCsrfToken(true);
    await apiRequest<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ email, password })
    });
    const user = await this.getCurrentUser();
    useAuthStore.getState().setUser(user);
    return user;
  },
  async register(email: string, username: string, password: string, otp: string): Promise<AuthUser> {
    const token = await ensureCsrfToken(true);
    await apiRequest<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ email, username, password, otp })
    });
    // Immediately log out to clear cookies set by the backend register endpoint
    try {
      await apiRequest<void>("/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": token }
      });
    } catch (e) {
      console.warn("Failed to clear cookie session after registration:", e);
    }
    return { id: "", email, username, role: "USER", profiles: [] };
  },
  async sendOtp(email: string): Promise<void> {
    const token = await ensureCsrfToken(true);
    await apiRequest<void>("/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ email })
    }, 30_000);
  },
  async sendResetCode(email: string): Promise<void> {
    const token = await ensureCsrfToken(true);
    await apiRequest<void>("/auth/send-reset-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ email })
    }, 30_000);
  },
  async verifyResetCode(email: string, code: string, newPassword: string): Promise<void> {
    const token = await ensureCsrfToken(true);
    await apiRequest<void>("/auth/verify-reset-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ email, code, newPassword })
    });
  },
  async getCurrentUser(): Promise<AuthUser> {
    const data = await protectedRequest<CurrentUserResponse>("/users/me", { method: "GET" });
    return data.user;
  },
  async updateAvatar(avatarUrl: string): Promise<AuthUser> {
    const token = await ensureCsrfToken(true);
    const data = await protectedRequest<{ user: AuthUser }>("/users/me/avatar", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ avatarUrl })
    }, false);
    useAuthStore.getState().setUser(data.user);
    return data.user;
  },
  async updateUsername(username: string): Promise<AuthUser> {
    const token = await ensureCsrfToken(true);
    const data = await protectedRequest<{ user: AuthUser }>("/users/me/username", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ username })
    }, false);
    useAuthStore.getState().setUser(data.user);
    return data.user;
  },
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = await ensureCsrfToken(true);
    await protectedRequest<{ success: boolean }>("/users/me/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ currentPassword, newPassword })
    }, false);
  },
  async sendChangeEmailOtp(newEmail: string): Promise<void> {
    const token = await ensureCsrfToken(true);
    await apiRequest<void>("/users/me/send-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ newEmail })
    }, 30_000);
  },
  async updateEmail(newEmail: string, otp: string): Promise<AuthUser> {
    const token = await ensureCsrfToken(true);
    const data = await protectedRequest<{ user: AuthUser }>("/users/me/email", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ newEmail, otp })
    }, false);
    useAuthStore.getState().setUser(data.user);
    return data.user;
  },
  request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return protectedRequest<T>(path, options);
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "rytoxgroup:profile:avatar" || e.key === "streamforge:profile:avatar") {
      const newAvatar = e.newValue || null;
      useAuthStore.setState((state) => ({
        avatarUrl: newAvatar,
        user: state.user ? { ...state.user, avatarUrl: newAvatar || undefined } : null
      }));
    }
  });
}

