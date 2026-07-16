// apps/client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /**
     * proxy — during development, forward API calls to avoid CORS issues
     * Vite's dev server proxies /api requests to your gateway
     * So you don't need to configure CORS for local dev
     */
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
