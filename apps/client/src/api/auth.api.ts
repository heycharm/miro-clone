// src/api/auth.api.ts
import api from "./axios";
import type { User } from "../types";

export const authApi = {
  register: (d: { name: string; email: string; password: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/register",
      d,
    ),
  login: (d: { email: string; password: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/login",
      d,
    ),
  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
  me: () => api.get<{ user: User }>("/auth/me"),
};
