// apps/client/src/pages/Board.tsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Canvas } from "../pages/Canvas";
import  { Toolbar } from "../pages/Toolbar";
import { boardApi } from "../api/board.api";
import { useBoardStore } from "../store/board.store";
import { useSocket } from "../hooks/useSocket";
import type { BoardElement } from "../types";

export const Board = () => {
  const { id: boardId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setElements, reset, isLoading, setLoading } = useBoardStore();

  // socket connection + emit helpers
  const {
    emitAddElement,
    emitUpdateElement,
    emitDeleteElement,
    emitCursorMove,
  } = useSocket(boardId!);

  // load initial board data from REST API
  const { data, error } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => boardApi.getBoard(boardId!).then((r) => r.data.board),
    enabled: !!boardId,
  });

  useEffect(() => {
    if (data?.elements) {
      setElements(data.elements);
    }
  }, [data]);

  // cleanup when leaving board
  useEffect(() => {
    return () => reset();
  }, [boardId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Board not found or access denied</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-blue-500 hover:underline text-sm"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-100 relative">
      {/* top bar */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-sm font-medium text-gray-700">
            {data?.title || "Loading..."}
          </h1>
        </div>

        {/* online users avatars */}
        <div className="flex items-center gap-1">
          {useBoardStore.getState().onlineUsers.map((user) => (
            <div
              key={user.userId}
              title={user.email}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: user.color }}
            >
              {user.email[0].toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* toolbar */}
      <Toolbar />

      {/* canvas */}
      <div className="pt-10">
        <Canvas
          boardId={boardId!}
          onElementAdd={(el: BoardElement) => emitAddElement(el)}
          onElementUpdate={(id, changes) => emitUpdateElement(id, changes)}
          onElementDelete={(id) => emitDeleteElement(id)}
          onCursorMove={(x, y) => emitCursorMove(x, y)}
        />
      </div>
    </div>
  );
};
