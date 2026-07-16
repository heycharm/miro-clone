// apps/client/src/store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

/**
 * Zustand — lightweight state management
 *
 * Why Zustand over Redux?
 * Redux needs actions, reducers, dispatch, selectors — lots of boilerplate
 * Zustand is just a function that returns state + setters
 *
 * persist middleware — automatically saves state to localStorage
 * and rehydrates it on page refresh
 * So if you refresh the page, you're still logged in
 */

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuth: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuth: false,

      setAuth: (user, accessToken, refreshToken) => {
        // also store in localStorage for axios interceptor
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        set({ user, accessToken, refreshToken, isAuth: true });
      },

      clearAuth: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuth: false,
        });
      },
    }),
    { name: "auth-storage" },
  ),
);
