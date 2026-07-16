// apps/client/src/api/auth.api.ts
import api from "./axios";
import type { User } from "../types/index";

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/register",
      data,
    ),

  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/login",
      data,
    ),

  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),

  me: () => api.get<{ user: User }>("/auth/me"),
};
