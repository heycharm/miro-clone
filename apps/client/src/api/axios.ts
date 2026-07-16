// apps/client/src/api/axios.ts
import axios from "axios";

/**
 * Axios instance with base URL and interceptors
 *
 * Instead of typing the full URL every time:
 * axios.get('http://localhost:4000/api/boards')
 *
 * We create an instance with baseURL set:
 * api.get('/boards')   ← much cleaner
 *
 * Interceptors — functions that run on every request/response:
 * request interceptor  → adds auth token to every request automatically
 * response interceptor → handles 401 globally (redirect to login)
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

// attach token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// handle expired tokens globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    /**
     * If we get a 401 and haven't already tried to refresh:
     * 1. Call /auth/refresh with the refresh token
     * 2. Store the new access token
     * 3. Retry the original request with the new token
     *
     * This is silent token refresh — user never sees a login prompt
     * unless the refresh token itself has expired (after 7 days)
     */
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken },
        );

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        // refresh failed — clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
