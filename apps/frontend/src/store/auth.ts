import { create } from "zustand";
import { ApiError, apiRequest } from "../lib/http";
import { usePlaybackStore } from "./playbackStore";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
  profiles: Array<{ id: string; name: string; type: "ADULT" | "KIDS" }>;
}

type CurrentUserResponse = { user: AuthUser };
type CsrfResponse = { csrfToken: string };

interface AuthState {
  user: AuthUser | null;
  profileId: string | null;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfileId: (profileId: string | null) => void;
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

function resetLocalAuth(set: (state: Partial<AuthState>) => void) {
  csrfToken = null;
  localStorage.removeItem("streamforge:auth:user");
  localStorage.removeItem("streamforge:auth:profileId");
  set({ user: null, profileId: null });
  usePlaybackStore.getState().loadUserData();
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profileId: null,
  initialized: false,
  setUser: (user) => {
    if (user) {
      localStorage.setItem("streamforge:auth:user", JSON.stringify(user));
    } else {
      localStorage.removeItem("streamforge:auth:user");
    }
    set({ user });
    usePlaybackStore.getState().loadUserData();
  },
  setProfileId: (profileId) => {
    if (profileId) localStorage.setItem("streamforge:auth:profileId", profileId);
    else localStorage.removeItem("streamforge:auth:profileId");
    set({ profileId });
    usePlaybackStore.getState().loadUserData();
  },
  initialize: async () => {
    // Fast path: try to restore from localStorage first for instant UI
    const cachedUserStr = localStorage.getItem("streamforge:auth:user");
    if (cachedUserStr) {
      try {
        const cachedUser = JSON.parse(cachedUserStr) as AuthUser;
        if (cachedUser.id?.startsWith("offline-")) {
          throw new Error("Reject legacy offline user");
        }
        const profileId = localStorage.getItem("streamforge:auth:profileId") || cachedUser.username;
        // Show cached user immediately while we verify with backend
        set({ user: cachedUser, profileId, initialized: true });
        usePlaybackStore.getState().loadUserData();

        // Background verify: try to refresh from backend
        try {
          const user = await authApi.getCurrentUser();
          localStorage.setItem("streamforge:auth:user", JSON.stringify(user));
          set({ user });
        } catch (error) {
          // If token verification fails (e.g. 401 Unauthorized), clean up session
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            resetLocalAuth(set);
          }
        }
        return;
      } catch {
        // Invalid cached data, fall through to normal flow
        localStorage.removeItem("streamforge:auth:user");
      }
    }

    // Normal flow: try to authenticate with backend
    try {
      const user = await authApi.getCurrentUser();
      const profileId = localStorage.getItem("streamforge:auth:profileId") || user.username;
      localStorage.setItem("streamforge:auth:user", JSON.stringify(user));
      set({ user, profileId, initialized: true });
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
  async register(email: string, username: string, password: string): Promise<AuthUser> {
    const token = await ensureCsrfToken(true);
    await apiRequest<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ email, username, password })
    });
    const user = await this.getCurrentUser();
    useAuthStore.getState().setUser(user);
    return user;
  },
  async getCurrentUser(): Promise<AuthUser> {
    const data = await protectedRequest<CurrentUserResponse>("/users/me", { method: "GET" });
    return data.user;
  },
  request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return protectedRequest<T>(path, options);
  }
};
