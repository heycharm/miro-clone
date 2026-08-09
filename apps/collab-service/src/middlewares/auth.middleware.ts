// apps/collab-service/src/middlewares/auth.middleware.ts
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface JwtPayload {
  userId: string;
  email: string;
}

export const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    /**
     * Try all three places the token could be:
     * 1. socket.handshake.auth.token  — set by our useSocket hook
     * 2. socket.handshake.headers.authorization — set by some clients
     * 3. socket.handshake.query.token — fallback query param
     */
    const fromAuth = socket.handshake.auth?.token;
    const fromHeader = socket.handshake.headers?.authorization;
    const fromQuery = socket.handshake.query?.token as string;

    const raw = fromAuth || fromHeader || fromQuery;

    console.log("[collab] Auth attempt:");
    console.log(
      "  fromAuth:  ",
      fromAuth ? fromAuth.slice(0, 30) + "..." : "none",
    );
    console.log(
      "  fromHeader:",
      fromHeader ? fromHeader.slice(0, 30) + "..." : "none",
    );
    console.log(
      "  fromQuery: ",
      fromQuery ? fromQuery.slice(0, 30) + "..." : "none",
    );

    if (!raw) {
      console.error("[collab] No token found in any location");
      return next(new Error("Authentication token required"));
    }

    // strip Bearer prefix if present
    const token = raw
      .toString()
      .replace(/^Bearer\s+/i, "")
      .trim();
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;

    console.log("[collab] ✅ Socket authenticated for user:", decoded.email);
    next();
  } catch (err) {
    const message = (err as Error).message;
    console.error("[collab] ❌ Socket auth failed:", message);

    if (message.includes("expired")) {
      return next(new Error("Token expired — please refresh the page"));
    }
    return next(new Error("Invalid token"));
  }
};
