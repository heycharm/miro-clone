// apps/api-gateway/src/config/proxy.ts
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { env } from "./env";

/**
 * http-proxy-middleware forwards incoming requests to the target service
 * and pipes the response back to the client
 *
 * The client never knows it's talking to multiple services —
 * it only ever sees api-gateway on port 4000
 *
 * changeOrigin: true — rewrites the Host header to match the target
 * Without this, the receiving service sees the original host (gateway)
 * instead of its own host, which can cause routing issues
 *
 * on.error — if the target service is down, we return a clean error
 * instead of letting the proxy crash or hang the request
 */

const proxyOptions = (
  target: string,
  pathRewrite?: Record<string, string>,
): Options => ({
  target,
  changeOrigin: true,
  pathRewrite,
  on: {
    error: (err, req, res: any) => {
      console.error(`[api-gateway] Proxy error → ${target}:`, err.message);
      res.status(502).json({
        message: "Service temporarily unavailable",
        service: target,
      });
    },
    proxyReq: (proxyReq, req: any) => {
      /**
       * Forward the original client IP to downstream services
       * Useful for logging and per-user rate limiting in services
       * X-Forwarded-For is the standard header for this
       */
      proxyReq.setHeader("X-Forwarded-For", req.ip || "");
      proxyReq.setHeader("X-Gateway-Secret", process.env.GATEWAY_SECRET || "");
    },
  },
});

export const authProxy = createProxyMiddleware(
  proxyOptions(env.AUTH_SERVICE_URL, {
    "^/api/auth": "/auth", // /api/auth/login → /auth/login on auth-service
  }),
);

export const boardProxy = createProxyMiddleware(
  proxyOptions(env.BOARD_SERVICE_URL, {
    "^/api/boards": "/boards", // /api/boards → /boards on board-service
  }),
);

export const collabProxy = createProxyMiddleware({
  target: env.COLLAB_SERVICE_URL,
  changeOrigin: true,
  /**
   * ws: true — enables WebSocket proxying
   * Regular HTTP proxying doesn't work for WebSockets
   * because WS uses a persistent connection after the initial
   * HTTP upgrade handshake. This tells the proxy to handle that.
   */
  ws: true,
  pathRewrite: {
    "^/api/collab": "",
  },
  on: {
    error: (err, req, res: any) => {
      console.error("[api-gateway] Collab proxy error:", err.message);
      if (res.writeHead) {
        res.status(502).json({ message: "Collab service unavailable" });
      }
    },
  },
});
