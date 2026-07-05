// apps/board-service/src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error("[board-service] Error:", err);
  return res.status(500).json({
    message: "Internal server error",
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
