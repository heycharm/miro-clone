// apps/api-gateway/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { globalLimiter, authLimiter } from "./config/rateLimiter";
import { authProxy, boardProxy, collabProxy } from "./config/proxy";
import { requestLogger } from "./middlewares/logger.middleware";
import { healthCheck } from "./middlewares/health.middleware";

const app = express();

// ── Security middleware ────────────────────────────────────────────────────
app.use(helmet());

/**
 * CORS — Cross Origin Resource Sharing
 * Controls which domains can call your API from a browser
 *
 * Without CORS config: browser blocks all requests from frontend
 * With wrong CORS config: you expose your API to any website
 *
 * credentials: true → allows cookies and Authorization headers
 * origin → only your frontend domain is allowed
 */
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Logging ────────────────────────────────────────────────────────────────
app.use(morgan("dev"));
app.use(requestLogger);

// ── Rate limiting ──────────────────────────────────────────────────────────
app.use(globalLimiter);
app.use("/api/auth", authLimiter); // stricter limit on auth routes

// ── Health check ───────────────────────────────────────────────────────────
app.get("/health", healthCheck);

// ── Proxy routes ───────────────────────────────────────────────────────────
/**
 * Order matters here — Express matches routes top to bottom
 * More specific routes go above less specific ones
 *
 * /api/auth   → auth-service:3001
 * /api/boards → board-service:3002
 * /api/collab → collab-service:3003 (WebSocket)
 */
app.use("/api/auth", authProxy);
app.use("/api/boards", boardProxy);
app.use("/api/collab", collabProxy);

// ── 404 for unmatched routes ───────────────────────────────────────────────
app.use("*", (req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  console.log(`[api-gateway] Running on port ${env.PORT}`);
});

/**
 * WebSocket upgrade handling for collab-service
 * HTTP requests are handled by Express routes above
 * But WebSocket connections start as an HTTP upgrade request
 * which Express doesn't handle — the server does
 * So we listen on the server level for 'upgrade' events
 * and forward them directly to the collab proxy
 */
server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/api/collab")) {
    (collabProxy as any).upgrade(req, socket, head);
  }
});

export default server;
