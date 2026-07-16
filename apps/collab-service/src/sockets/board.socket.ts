// apps/collab-service/src/sockets/board.socket.ts
import { Server, Socket } from "socket.io";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { publisher, subscriber } from "../config/redis";
import { ydocManager } from "../services/ydoc.manager";
import { presenceManager } from "../services/presence.manager";

/**
 * Socket.io events for our board collaboration
 *
 * JOIN_BOARD    → user joins a board room
 * LEAVE_BOARD   → user leaves
 * ELEMENT_ADD   → new element created
 * ELEMENT_UPDATE → element moved/resized/styled
 * ELEMENT_DELETE → element removed
 * CURSOR_MOVE   → user cursor position update
 * YDOC_SYNC     → Y.js document sync (binary protocol)
 * YDOC_UPDATE   → Y.js incremental update (binary)
 */

const EVENTS = {
  JOIN_BOARD: "board:join",
  LEAVE_BOARD: "board:leave",
  ELEMENT_ADD: "element:add",
  ELEMENT_UPDATE: "element:update",
  ELEMENT_DELETE: "element:delete",
  CURSOR_MOVE: "cursor:move",
  YDOC_SYNC: "ydoc:sync",
  YDOC_UPDATE: "ydoc:update",

  // server → client
  BOARD_STATE: "board:state",
  ELEMENT_ADDED: "element:added",
  ELEMENT_UPDATED: "element:updated",
  ELEMENT_DELETED: "element:deleted",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  CURSOR_UPDATED: "cursor:updated",
  USERS_LIST: "users:list",
} as const;

export const registerBoardHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId as string;
  const email = socket.data.email as string;

  // ── JOIN BOARD ────────────────────────────────────────────────────────────
  socket.on(EVENTS.JOIN_BOARD, async (boardId: string) => {
    try {
      /**
       * Socket.io rooms — a room is just a named channel
       * socket.join(boardId) adds this socket to that room
       * io.to(boardId).emit(...) sends to EVERYONE in that room
       * socket.to(boardId).emit(...) sends to everyone EXCEPT sender
       *
       * Rooms are perfect for board collaboration:
       * each board is a room, only members of that board get updates
       */
      await socket.join(boardId);

      // track this user's presence on this board
      const presence = presenceManager.join(boardId, { userId, email });

      // get or create the Y.Doc for this board
      const doc = ydocManager.getOrCreate(boardId);
      const elements = doc.getMap("elements");

      /**
       * Send current board state to the newly joined user
       * They need to know:
       * 1. All current elements on the canvas
       * 2. Who else is currently online
       */
      socket.emit(EVENTS.BOARD_STATE, {
        elements: Object.fromEntries(elements.entries()),
        users: presenceManager.getAll(boardId),
      });

      // tell everyone else this user joined
      socket.to(boardId).emit(EVENTS.USER_JOINED, { user: presence });

      console.log(`[collab] User ${userId} joined board ${boardId}`);

      /**
       * Subscribe to Redis channel for this board
       *
       * Why Redis pub/sub here?
       * Imagine you have 3 collab-service instances running (horizontal scaling)
       * User A connects to instance 1
       * User B connects to instance 2
       *
       * When User A updates an element, instance 1 knows about it
       * But instance 2 doesn't — so User B never sees the update
       *
       * Redis pub/sub solves this:
       * Instance 1 publishes the update to Redis
       * All instances (including instance 2) subscribed to that board
       * receive the message and forward it to their connected users
       *
       * This is how you scale real-time apps horizontally
       */
      const channel = `board:${boardId}`;
      await subscriber.subscribe(channel);
    } catch (err) {
      console.error("[collab] Join board error:", err);
      socket.emit("error", { message: "Failed to join board" });
    }
  });

  // ── ELEMENT ADD ───────────────────────────────────────────────────────────
  socket.on(
    EVENTS.ELEMENT_ADD,
    async (data: { boardId: string; element: Record<string, unknown> }) => {
      try {
        const { boardId, element } = data;
        const doc = ydocManager.getOrCreate(boardId);
        const elements = doc.getMap("elements");

        /**
         * Y.Doc.transact — batch multiple changes into one atomic update
         *
         * Without transact: each change triggers a separate sync event
         * With transact: all changes inside are bundled into ONE update
         *
         * This is important for performance — adding an element with
         * 10 properties would normally fire 10 sync events
         * With transact it fires just 1
         */
        doc.transact(() => {
          elements.set(element.id as string, element);
        });

        /**
         * Publish to Redis so other collab-service instances
         * can forward this update to their connected users
         *
         * We encode the action type and data as JSON
         * In production you'd use a more efficient binary format
         */
        await publisher.publish(
          `board:${boardId}`,
          JSON.stringify({
            type: EVENTS.ELEMENT_ADDED,
            element,
            userId,
            boardId,
          }),
        );

        // also emit directly to THIS instance's connected users
        socket.to(boardId).emit(EVENTS.ELEMENT_ADDED, { element, userId });
      } catch (err) {
        console.error("[collab] Element add error:", err);
      }
    },
  );

  // ── ELEMENT UPDATE ────────────────────────────────────────────────────────
  socket.on(
    EVENTS.ELEMENT_UPDATE,
    async (data: {
      boardId: string;
      elementId: string;
      changes: Record<string, unknown>;
    }) => {
      try {
        const { boardId, elementId, changes } = data;
        const doc = ydocManager.getOrCreate(boardId);
        const elements = doc.getMap("elements");

        doc.transact(() => {
          const existing = elements.get(elementId) as
            | Record<string, unknown>
            | undefined;
          if (existing) {
            /**
             * Deep merge — only update the changed properties
             * Not replace the entire element
             *
             * This is critical for conflict resolution:
             * If User A moves the element (changes x, y)
             * and User B resizes it (changes width, height)
             * simultaneously — both changes should survive
             *
             * If we replaced the whole element, one user's
             * changes would overwrite the other's
             */
            elements.set(elementId, {
              ...existing,
              ...changes,
              updatedBy: userId,
            });
          }
        });

        await publisher.publish(
          `board:${boardId}`,
          JSON.stringify({
            type: EVENTS.ELEMENT_UPDATED,
            elementId,
            changes,
            userId,
            boardId,
          }),
        );

        socket
          .to(boardId)
          .emit(EVENTS.ELEMENT_UPDATED, { elementId, changes, userId });
      } catch (err) {
        console.error("[collab] Element update error:", err);
      }
    },
  );

  // ── ELEMENT DELETE ────────────────────────────────────────────────────────
  socket.on(
    EVENTS.ELEMENT_DELETE,
    async (data: { boardId: string; elementId: string }) => {
      try {
        const { boardId, elementId } = data;
        const doc = ydocManager.getOrCreate(boardId);
        const elements = doc.getMap("elements");

        doc.transact(() => {
          elements.delete(elementId);
        });

        await publisher.publish(
          `board:${boardId}`,
          JSON.stringify({
            type: EVENTS.ELEMENT_DELETED,
            elementId,
            userId,
            boardId,
          }),
        );

        socket.to(boardId).emit(EVENTS.ELEMENT_DELETED, { elementId, userId });
      } catch (err) {
        console.error("[collab] Element delete error:", err);
      }
    },
  );

  // ── CURSOR MOVE ───────────────────────────────────────────────────────────
  socket.on(
    EVENTS.CURSOR_MOVE,
    (data: { boardId: string; x: number; y: number }) => {
      /**
       * Cursor updates are high frequency — up to 60 per second
       * We do NOT persist these to DB or Y.js doc
       * They are ephemeral — only matter while the user is connected
       *
       * We also do NOT publish to Redis for cursor moves
       * because the latency of Redis pub/sub adds 1-5ms
       * and cursor moves need to feel instant
       *
       * Instead we broadcast directly within this Socket.io instance
       * This means cursors only sync within one server instance
       * which is acceptable — cursors are purely cosmetic
       */
      const { boardId, x, y } = data;

      presenceManager.updateCursor(boardId, userId, { x, y });

      socket.to(boardId).emit(EVENTS.CURSOR_UPDATED, {
        userId,
        cursor: { x, y },
      });
    },
  );

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on("disconnect", async () => {
    /**
     * When a user disconnects we need to:
     * 1. Remove them from presence tracking
     * 2. Tell other users they left
     * 3. Unsubscribe from Redis channels if no users left on this instance
     *
     * socket.rooms contains all rooms this socket was in
     * We need to clean up presence for all of them
     */
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);

    for (const boardId of rooms) {
      presenceManager.leave(boardId, userId);

      socket.to(boardId).emit(EVENTS.USER_LEFT, { userId });

      // check if anyone is still on this board on this instance
      const remaining = presenceManager.getAll(boardId);
      if (remaining.length === 0) {
        await subscriber.unsubscribe(`board:${boardId}`);
        console.log(
          `[collab] No users left on board ${boardId}, unsubscribed from Redis`,
        );
      }
    }

    console.log(`[collab] User ${userId} disconnected`);
  });
};

/**
 * Redis subscriber message handler
 *
 * When another collab-service instance publishes a message,
 * this handler receives it and forwards to local connected users
 *
 * This is the bridge between Redis pub/sub and Socket.io rooms
 */
export const setupRedisSubscriber = (io: Server) => {
  subscriber.on("message", (channel: string, message: string) => {
    try {
      const boardId = channel.replace("board:", "");
      const data = JSON.parse(message);

      /**
       * Forward the message to all users in this board room
       * on THIS server instance
       *
       * io.to(boardId) — targets the Socket.io room
       * We use io.to instead of socket.to because this handler
       * is outside the socket context — it's a Redis callback
       */
      io.to(boardId).emit(data.type, data);
    } catch (err) {
      console.error("[collab] Redis message error:", err);
    }
  });
};
