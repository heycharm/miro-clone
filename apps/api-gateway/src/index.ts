// apps/api-gateway/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const BOARD_SERVICE_URL =
  process.env.BOARD_SERVICE_URL || "http://localhost:3002";
const COLLAB_SERVICE_URL =
  process.env.COLLAB_SERVICE_URL || "http://localhost:3003";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(morgan("dev"));

// ── Health ────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

// ── Proxy routes ──────────────────────────────────────────────────────────

/**
 * pathRewrite removes the /api prefix before forwarding
 * /api/auth/login → /auth/login on auth-service
 * /api/boards     → /boards on board-service
 */
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/auth/" }, // ← / becomes /auth/
    on: {
      error: (err, _req, res: any) => {
        console.error("[gateway] Auth proxy error:", err.message);
        res.status(502).json({ message: "Auth service unavailable" });
      },
    },
  }),
);

app.use(
  "/api/boards",
  createProxyMiddleware({
    target: BOARD_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/": "/boards/" }, // ← / becomes /boards/
    on: {
      error: (err, _req, res: any) => {
        console.error("[gateway] Board proxy error:", err.message);
        res.status(502).json({ message: "Board service unavailable" });
      },
    },
  }),
);

app.use(
  "/api/collab",
  createProxyMiddleware({
    target: COLLAB_SERVICE_URL,
    changeOrigin: true,
    ws: true,
    pathRewrite: { "^/api/collab": "" },
    on: {
      error: (err, _req, res: any) => {
        console.error("[gateway] Collab proxy error:", err.message);
        if (res.status)
          res.status(502).json({ message: "Collab service unavailable" });
      },
    },
  }),
);

// ── 404 — fix: use specific path instead of wildcard * ───────────────────
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[api-gateway] Running on port ${PORT}`);
});

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/api/collab")) {
    console.log("[gateway] WebSocket upgrade for collab");
  }
});

export default server;
