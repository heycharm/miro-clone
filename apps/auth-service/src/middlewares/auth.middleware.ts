import { Request, Response, NextFunction } from "express";
import { tokenService } from "../services/token.service";
import { request } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { JwtPayload } from "@miro/shared";


// apps/auth-service/src/middlewares/auth.middleware.ts
// apps/board-service/src/middlewares/auth.middleware.ts
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    console.log('[board-auth] Header:', authHeader?.slice(0, 40));

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    console.log('[board-auth] ✅ Valid token for:', decoded.email);

    (req as any).userId = decoded.userId;
    (req as any).email  = decoded.email;

    next();
  } catch (err) {
    console.error('[board-auth] ❌ Token error:', (err as Error).message);
    if ((err as Error).name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};
