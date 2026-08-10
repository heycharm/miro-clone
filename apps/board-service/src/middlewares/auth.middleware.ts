import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../types";

// apps/board-service/src/middlewares/auth.middleware.ts
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // temporarily log the secret being used
    console.log('[board-auth] JWT_SECRET being used:', env.JWT_SECRET);
    console.log('[board-auth] Token first 30 chars:', token.slice(0, 30));

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    console.log('[board-auth] ✅ Decoded:', decoded.email);

    (req as any).userId = decoded.userId;
    (req as any).email  = decoded.email;
    next();
  } catch (err) {
    console.error('[board-auth] ❌ Error:', (err as Error).message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};