// apps/auth-service/src/services/token.service.ts
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { JwtPayload } from "@miro/shared";

export const tokenService = {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: "15m", // short lived
    });
  },

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: "7d", // long lived
    });
  },

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  },
};
