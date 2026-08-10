// apps/auth-service/src/services/token.service.ts
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { JwtPayload } from "@miro/shared";

export const tokenService = {
  generateAccessToken(payload: JwtPayload): string {
    console.log("[auth] Signing with secret:", env.JWT_SECRET);
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1d" });
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
