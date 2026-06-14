import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(`[auth-service] Error:`, err);

  return res.status(500).json({
    message: "Internal Server Error",
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
