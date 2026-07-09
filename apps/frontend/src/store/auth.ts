import { create } from "zustand";
import type { AuthUser } from "@streamforge/shared-types";

interface AuthState {
  user: AuthUser | null;
  profileId: string | null;
  setUser: (user: AuthUser | null) => void;
  setProfileId: (profileId: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profileId: null,
  setUser: (user) => set({ user }),
  setProfileId: (profileId) => set({ profileId })
}));
