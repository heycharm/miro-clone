// src/pages/Board.tsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Canvas } from "./Canvas";
import { Toolbar } from "./Toolbar";
import { boardApi } from "@/api/board.api";
import { useBoardStore } from "@/store/board.store";
import { useSocket } from "@/hooks/useSocket";
import type { BoardElement } from "@/types";
import { PropertiesPanel } from "@/components/ui/PropertiesPanel";
import { useState } from "react";
import { ShareDialog } from "@/components/ui/ShareDialog";
import { Share2 } from "lucide-react";

export const Board = () => {
  const { id: boardId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setElements, reset, onlineUsers } = useBoardStore();
  const [shareOpen, setShareOpen] = useState(false);

  const {
    emitAddElement,
    emitUpdateElement,
    emitDeleteElement,
    emitCursorMove,
  } = useSocket(boardId!);

  const { data, error, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => boardApi.getBoard(boardId!).then((r) => r.data.board),
    enabled: !!boardId,
  });
  const { isConnected } = useSocket(boardId!);

  // apps/client/src/pages/Board.tsx

  const handleElementAdd = async (el: BoardElement) => {
    try {
      // save to DB first
      const { data } = await boardApi.createElement(boardId!, {
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        zIndex: el.zIndex,
        properties: el.properties,
      });
      // emit the DB-saved element (has real id) to other users
      emitAddElement(data.element);
    } catch (err) {
      console.error("Failed to save element:", err);
    }
  };

  const handleElementUpdate = async (
    id: string,
    changes: Partial<BoardElement>,
  ) => {
    try {
      await boardApi.updateElement(boardId!, id, changes);
      emitUpdateElement(id, changes);
    } catch (err) {
      console.error("Failed to update element:", err);
    }
  };

  const handleElementDelete = async (id: string) => {
    try {
      await boardApi.deleteElement(boardId!, id);
      emitDeleteElement(id);
    } catch (err) {
      console.error("Failed to delete element:", err);
    }
  };

  useEffect(() => {
    if (data?.elements) setElements(data.elements);
  }, [data]);

  useEffect(() => () => reset(), [boardId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Layers className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-white font-medium mb-1">Board not found</p>
          <p className="text-slate-400 text-sm mb-5">
            You don't have access to this board
          </p>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-white"
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }
  const handlePropertiesUpdate = async (id: string, changes: any) => {
    useBoardStore.getState().updateElement(id, changes);
    await handleElementUpdate(id, changes);
  };

  const handlePropertiesDelete = async (id: string) => {
    useBoardStore.getState().deleteElement(id);
    useBoardStore.getState().setSelectedIds([]);
    await handleElementDelete(id);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 relative">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-20 h-12 bg-slate-900/90 backdrop-blur border-b border-slate-700/50 flex items-center px-3 gap-3">
        {/* back button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/60"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-5 bg-slate-700" />
        {/* board title */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
            <Layers className="w-3 h-3 text-white" />
          </div>
          <span className="text-white text-sm font-medium">
            {isLoading ? "Loading..." : data?.title}
          </span>
        </div>
        {/* spacer */}
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShareOpen(true)}
          className="h-8 text-slate-400 hover:text-white hover:bg-slate-700/60 gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="text-xs">Share</span>
        </Button>
        {/* // add dialog at the bottom of the JSX, before closing div: */}
        <ShareDialog
          boardId={boardId!}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          myRole={data?.role || "viewer"}
        />
        {/* online users */}
        <TooltipProvider delay={200}>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500 mr-1" />
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 5).map((user) => (
                <Tooltip key={user.userId}>
                  <TooltipTrigger>
                    <Avatar className="w-7 h-7 border-2 border-slate-900 cursor-default">
                      <AvatarFallback
                        className="text-white text-xs font-medium"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-700 border-slate-600 text-white text-xs">
                    {user.email}
                  </TooltipContent>
                </Tooltip>
              ))}
              {onlineUsers.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center">
                  <span className="text-slate-300 text-xs">
                    +{onlineUsers.length - 5}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}
            />
            <span className="text-xs text-slate-400">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div> */}
        </TooltipProvider>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Canvas */}
      <div className="pt-12 w-full h-full">
        <Canvas
          boardId={boardId!}
          onElementAdd={handleElementAdd}
          onElementUpdate={handleElementUpdate}
          onElementDelete={handleElementDelete}
          onCursorMove={(x, y) => emitCursorMove(x, y)}
        />
        <PropertiesPanel
          onUpdate={handlePropertiesUpdate}
          onDelete={handlePropertiesDelete}
        />
      </div>
    </div>
  );
};;
