// apps/collab-service/src/middlewares/auth.middleware.ts
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Socket.io middleware works differently from Express middleware
 *
 * Express middleware: (req, res, next)
 * Socket.io middleware: (socket, next)
 *
 * The socket object contains everything about the connection:
 * socket.handshake.auth  → auth data sent by client during connection
 * socket.handshake.query → query params in the connection URL
 * socket.data            → where we store custom data (like userId)
 *
 * We verify the JWT here during the WebSocket handshake
 * so every subsequent socket event is already authenticated
 * No need to verify on every event — just once at connection time
 **/
export const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    /**
     * Client sends token in handshake auth:
     * socket = io('http://localhost:3003', {
     *   auth: { token: 'Bearer eyJ...' }
     * })
     */
    const token = socket.handshake.auth?.token?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // attach user info to socket — available in all event handlers
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;

    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
};
