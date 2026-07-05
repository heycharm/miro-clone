// apps/api-gateway/src/middlewares/logger.middleware.ts
import { Request, Response, NextFunction } from "express";

/**
 * Custom request logger
 * Morgan gives us basic logging but we want to also
 * log which service the request was routed to
 * This is useful for debugging — you can see the full
 * request journey from gateway → service in one log line
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const service = getTargetService(req.path);

    console.log(
      `[gateway] ${req.method} ${req.path} → ${service} | ${res.statusCode} | ${duration}ms`,
    );
  });

  next();
};

const getTargetService = (path: string): string => {
  if (path.startsWith("/api/auth")) return "auth-service";
  if (path.startsWith("/api/boards")) return "board-service";
  if (path.startsWith("/api/collab")) return "collab-service";
  return "unknown";
};
