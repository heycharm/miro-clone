import { Request, Response, NextFunction } from "express";
import { tokenService } from "../services/token.service";
import { request } from "http";

// apps/auth-service/src/middlewares/auth.middleware.ts
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
     console.log("AUTH HEADER:", req.headers.authorization); 
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = tokenService.verifyToken(token);

    console.log('DECODED TOKEN:', decoded); // 👈 add this

    (req as any).userId = decoded.userId;
    (req as any).email  = decoded.email;

    next();
  } catch (err) {
    if ((err as Error).name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};
