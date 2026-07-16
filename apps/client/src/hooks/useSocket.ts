// apps/client/src/hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useBoardStore } from "../store/board.store";
import { useAuthStore } from "../store/auth.store";
import type { BoardElement, UserPresence } from "../types";

const EVENTS = {
  JOIN_BOARD: "board:join",
  LEAVE_BOARD: "board:leave",
  ELEMENT_ADD: "element:add",
  ELEMENT_UPDATE: "element:update",
  ELEMENT_DELETE: "element:delete",
  CURSOR_MOVE: "cursor:move",
  BOARD_STATE: "board:state",
  ELEMENT_ADDED: "element:added",
  ELEMENT_UPDATED: "element:updated",
  ELEMENT_DELETED: "element:deleted",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  CURSOR_UPDATED: "cursor:updated",
};

/**
 * useSocket — custom hook that manages the entire Socket.io lifecycle
 *
 * Custom hooks let you extract stateful logic from components
 * so the component just calls useSocket(boardId) and gets back
 * emit functions — it doesn't need to know anything about Socket.io
 *
 * useRef for the socket — NOT useState
 * Why? Socket is a side effect, not UI state
 * Changing the socket ref should not trigger a re-render
 * useRef persists across renders without causing them
 */
export const useSocket = (boardId: string) => {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();
  const {
    setElements,
    addElement,
    updateElement,
    deleteElement,
    setOnlineUsers,
    updateUserCursor,
    removeUser,
  } = useBoardStore();

  useEffect(() => {
    if (!boardId || !accessToken) return;

    /**
     * Connect to collab-service
     * auth.token → picked up by our authenticateSocket middleware
     */
    const socket = io(import.meta.env.VITE_COLLAB_URL, {
      auth: { token: `Bearer ${accessToken}` },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // ── Connection events ────────────────────────────────────────────────
    socket.on("connect", () => {
      console.log("[socket] Connected:", socket.id);
      socket.emit(EVENTS.JOIN_BOARD, boardId);
    });

    socket.on("connect_error", (err) => {
      console.error("[socket] Connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[socket] Disconnected:", reason);
    });

    // ── Board state (initial load) ───────────────────────────────────────
    socket.on(
      EVENTS.BOARD_STATE,
      (data: {
        elements: Record<string, BoardElement>;
        users: UserPresence[];
      }) => {
        setElements(Object.values(data.elements));
        setOnlineUsers(data.users);
      },
    );

    // ── Element events ───────────────────────────────────────────────────
    socket.on(
      EVENTS.ELEMENT_ADDED,
      ({ element }: { element: BoardElement }) => {
        addElement(element);
      },
    );

    socket.on(
      EVENTS.ELEMENT_UPDATED,
      ({
        elementId,
        changes,
      }: {
        elementId: string;
        changes: Partial<BoardElement>;
      }) => {
        updateElement(elementId, changes);
      },
    );

    socket.on(
      EVENTS.ELEMENT_DELETED,
      ({ elementId }: { elementId: string }) => {
        deleteElement(elementId);
      },
    );

    // ── Presence events ──────────────────────────────────────────────────
    socket.on(EVENTS.USER_JOINED, ({ user }: { user: UserPresence }) => {
      setOnlineUsers([...useBoardStore.getState().onlineUsers, user]);
    });

    socket.on(EVENTS.USER_LEFT, ({ userId }: { userId: string }) => {
      removeUser(userId);
    });

    socket.on(
      EVENTS.CURSOR_UPDATED,
      ({
        userId,
        cursor,
      }: {
        userId: string;
        cursor: { x: number; y: number };
      }) => {
        updateUserCursor(userId, cursor);
      },
    );

    // ── Cleanup ──────────────────────────────────────────────────────────
    /**
     * useEffect cleanup runs when:
     * 1. The component unmounts (user leaves the board page)
     * 2. boardId changes (user navigates to a different board)
     *
     * We must disconnect the socket to:
     * - Free the connection on the server
     * - Prevent memory leaks
     * - Trigger the disconnect handler that cleans up presence
     */
    return () => {
      socket.emit(EVENTS.LEAVE_BOARD, boardId);
      socket.disconnect();
    };
  }, [boardId, accessToken]);

  // ── Emit helpers ─────────────────────────────────────────────────────────
  /**
   * These functions are what components call to send events
   * They abstract away the socket — components don't need to
   * know anything about Socket.io, just call emitAddElement(data)
   */
  const emitAddElement = (element: BoardElement) => {
    socketRef.current?.emit(EVENTS.ELEMENT_ADD, { boardId, element });
  };

  const emitUpdateElement = (
    elementId: string,
    changes: Partial<BoardElement>,
  ) => {
    socketRef.current?.emit(EVENTS.ELEMENT_UPDATE, {
      boardId,
      elementId,
      changes,
    });
  };

  const emitDeleteElement = (elementId: string) => {
    socketRef.current?.emit(EVENTS.ELEMENT_DELETE, { boardId, elementId });
  };

  const emitCursorMove = (x: number, y: number) => {
    socketRef.current?.emit(EVENTS.CURSOR_MOVE, { boardId, x, y });
  };

  return {
    emitAddElement,
    emitUpdateElement,
    emitDeleteElement,
    emitCursorMove,
    socket: socketRef.current,
  };
};
