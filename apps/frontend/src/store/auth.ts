import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
}

interface AuthState {
  user: AuthUser | null;
  profileId: string | null;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfileId: (profileId: string | null) => void;
  initialize: () => void;
  logout: () => void;
}

// Retrieve pre-existing users from local storage
const getUsersDb = (): Array<{ email: string; username: string; passwordHash: string; role: string }> => {
  try {
    const stored = localStorage.getItem("streamforge:users_db");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save users to local storage
const saveUsersDb = (users: any[]) => {
  localStorage.setItem("streamforge:users_db", JSON.stringify(users));
};

// Seed default admin account if not exists
const seedDefaultAdmin = () => {
  const users = getUsersDb();
  const adminExists = users.some(u => u.email === "trantxi05@gmail.com");
  if (!adminExists) {
    users.push({
      email: "trantxi05@gmail.com",
      username: "trantxi05",
      passwordHash: "Duy@1188", // Store plain or simple match for local mockup
      role: "SUPER_ADMIN"
    });
    saveUsersDb(users);
  }
};

import { usePlaybackStore } from "./playbackStore";

const getInitialUser = (): AuthUser | null => {
  try {
    const userStr = localStorage.getItem("streamforge:auth:user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const getInitialProfileId = (): string | null => {
  try {
    return localStorage.getItem("streamforge:auth:profileId");
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  profileId: getInitialProfileId(),
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
    if (profileId) {
      localStorage.setItem("streamforge:auth:profileId", profileId);
    } else {
      localStorage.removeItem("streamforge:auth:profileId");
    }
    set({ profileId });
  },
  initialize: () => {
    seedDefaultAdmin();
    try {
      const userStr = localStorage.getItem("streamforge:auth:user");
      const profileId = localStorage.getItem("streamforge:auth:profileId");
      if (userStr) {
        set({ user: JSON.parse(userStr), profileId });
      }
    } catch {
      localStorage.removeItem("streamforge:auth:user");
      localStorage.removeItem("streamforge:auth:profileId");
    }
    set({ initialized: true });
    usePlaybackStore.getState().loadUserData();
  },
  logout: () => {
    localStorage.removeItem("streamforge:auth:user");
    localStorage.removeItem("streamforge:auth:profileId");
    set({ user: null, profileId: null });
    usePlaybackStore.getState().loadUserData();
  }
}));

// Export helper to interact with simulated database
export const authApi = {
  login: async (email: string, pass: string): Promise<AuthUser> => {
    seedDefaultAdmin();
    const users = getUsersDb();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found || found.passwordHash !== pass) {
      throw new Error("Email hoặc mật khẩu không chính xác.");
    }
    return {
      id: found.email,
      email: found.email,
      username: found.username,
      role: found.role as any
    };
  },
  register: async (email: string, username: string, pass: string): Promise<AuthUser> => {
    const users = getUsersDb();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email này đã được đăng ký sử dụng.");
    }
    const newUser = {
      email,
      username,
      passwordHash: pass,
      role: "USER"
    };
    users.push(newUser);
    saveUsersDb(users);
    return {
      id: email,
      email: email,
      username: username,
      role: "USER"
    };
  }
};
