// apps/collab-service/src/index.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { authenticateSocket } from "./middlewares/auth.middleware";
import {
  registerBoardHandlers,
  setupRedisSubscriber,
} from "./sockets/board.socket";

const app = express();
const server = createServer(app);

/**
 * Why createServer(app) instead of app.listen()?
 *
 * Socket.io needs access to the raw HTTP server
 * to intercept the WebSocket upgrade handshake
 *
 * app.listen() creates an HTTP server internally but
 * doesn't give you a reference to it
 *
 * createServer(app) creates the server and gives you
 * the reference — then you attach Socket.io to it
 * Then server.listen() starts everything together
 */

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
  /**
   * transports — how Socket.io connects to the server
   *
   * 'websocket' → persistent WS connection, best performance
   * 'polling'   → HTTP long polling fallback
   *
   * We list websocket first — Socket.io tries it first
   * Falls back to polling if WS is blocked (some corporate firewalls)
   * This is why Socket.io is better than raw WebSockets for production
   */
  transports: ["websocket", "polling"],
  /**
   * pingTimeout/pingInterval — keep-alive heartbeat
   *
   * Server pings client every 10s
   * If client doesn't respond within 5s, considered disconnected
   * Prevents ghost connections (user closed laptop without proper disconnect)
   */
  pingTimeout: 5000,
  pingInterval: 10000,
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "collab-service" });
});

// ── Socket.io middleware ───────────────────────────────────────────────────
/**
 * io.use() registers middleware for ALL socket connections
 * Runs once when client first connects (during handshake)
 * If next() is called with an Error, connection is rejected
 */
io.use(authenticateSocket);

// ── Socket.io connection handler ──────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(
    `[collab] New connection: ${socket.id} (user: ${socket.data.userId})`,
  );

  // register all event handlers for this socket
  registerBoardHandlers(io, socket);
});

// ── Redis subscriber setup ─────────────────────────────────────────────────
setupRedisSubscriber(io);

// ── Start server ───────────────────────────────────────────────────────────
server.listen(env.PORT, () => {
  console.log(`[collab-service] Running on port ${env.PORT}`);
});

export { io };
