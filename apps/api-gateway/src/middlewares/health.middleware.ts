// apps/api-gateway/src/middlewares/health.middleware.ts
import { Request, Response } from "express";
import { env } from "../config/env";

/**
 * Aggregated health check — gateway pings all services
 * and returns their status in one response
 *
 * This is useful for:
 * - Monitoring dashboards (is everything up?)
 * - Railway/Render health check endpoints
 * - Debugging which service is down
 *
 * We use Promise.allSettled instead of Promise.all because:
 * Promise.all    → if ONE service is down, the whole check fails
 * Promise.allSettled → checks ALL services, reports each individually
 */
export const healthCheck = async (_req: Request, res: Response) => {
  const services = [
    { name: "auth-service", url: `${env.AUTH_SERVICE_URL}/health` },
    { name: "board-service", url: `${env.BOARD_SERVICE_URL}/health` },
    { name: "collab-service", url: `${env.COLLAB_SERVICE_URL}/health` },
  ];

  const results = await Promise.allSettled(
    services.map(async (service) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

      try {
        const response = await fetch(service.url, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        return {
          name: service.name,
          status: response.ok ? "healthy" : "unhealthy",
          code: response.status,
        };
      } catch {
        clearTimeout(timeout);
        return { name: service.name, status: "unreachable", code: 0 };
      }
    }),
  );

  const statuses = results.map((r) =>
    r.status === "fulfilled" ? r.value : { name: "unknown", status: "error" },
  );

  const allHealthy = statuses.every((s) => s.status === "healthy");

  return res.status(allHealthy ? 200 : 207).json({
    gateway: "healthy",
    services: statuses,
    timestamp: new Date().toISOString(),
  });
};
