// apps/client/src/hooks/useSocket.ts

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useBoardStore } from "@/store/board.store";
import type { BoardElement, UserPresence } from "@/types";

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

export const useSocket = (boardId: string) => {
  const socketRef = useRef<Socket | null>(null);

  const {
    addElement,
    updateElement,
    deleteElement,
    setOnlineUsers,
    updateUserCursor,
    removeUser,
  } = useBoardStore();

  useEffect(() => {
    if (!boardId) return;

    /**
     * Read token directly from localStorage
     * This is more reliable than reading from Zustand
     * because Zustand state might not be hydrated yet
     * when this effect first runs
     */
    const token = localStorage.getItem("accessToken");

    if (!token) {
      console.error("[socket] No access token found in localStorage");
      return;
    }

    console.log("[socket] Connecting with token:", token.slice(0, 20) + "...");

    const COLLAB_URL =
      import.meta.env.VITE_COLLAB_URL || "http://localhost:3003";

    const socket = io(COLLAB_URL, {
      /**
       * Send token in both auth and query
       * so the server can find it regardless of how it reads it
       */
      auth: { token: `Bearer ${token}` },
      query: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[socket] ✅ Connected:", socket.id);
      socket.emit(EVENTS.JOIN_BOARD, boardId);
      console.log("[socket] Joined board:", boardId);
    });

    socket.on("connect_error", (err) => {
      console.error("[socket] ❌ Error:", err.message);
    });

socket.on(
  EVENTS.BOARD_STATE,
  (data: { elements: Record<string, BoardElement>; users: UserPresence[] }) => {
    /**
     * Deduplicate users by userId before setting
     * Server might send duplicates if presence wasn't cleaned up properly
     */
    const uniqueUsers = data.users.filter(
      (user, index, self) =>
        index === self.findIndex((u) => u.userId === user.userId),
    );
    setOnlineUsers(uniqueUsers);
  },
);

    socket.on(
      EVENTS.ELEMENT_ADDED,
      ({ element }: { element: BoardElement }) => {
        console.log("[socket] Element added by another user:", element.id);
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

    socket.on(EVENTS.USER_JOINED, ({ user }: { user: UserPresence }) => {
      const current = useBoardStore.getState().onlineUsers;

      /**
       * Check if user already exists before adding
       * Without this check, every re-render or reconnect
       * adds a duplicate entry for the same user
       */
      const alreadyExists = current.some((u) => u.userId === user.userId);
      if (!alreadyExists) {
        setOnlineUsers([...current, user]);
      }
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

    return () => {
      socket.emit(EVENTS.LEAVE_BOARD, boardId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId]); // ← only re-run if boardId changes

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

  let cursorThrottle: ReturnType<typeof setTimeout> | null = null;
  const emitCursorMove = (x: number, y: number) => {
    if (cursorThrottle) return;
    cursorThrottle = setTimeout(() => {
      socketRef.current?.emit(EVENTS.CURSOR_MOVE, { boardId, x, y });
      cursorThrottle = null;
    }, 50);
  };

  return {
    emitAddElement,
    emitUpdateElement,
    emitDeleteElement,
    emitCursorMove,
    isConnected: socketRef.current?.connected ?? false,
  };
};
