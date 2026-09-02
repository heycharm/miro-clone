// src/pages/Dashboard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Layers,
  LogOut,
  LayoutGrid,
  Clock,
  Globe,
  Lock,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { boardApi } from "@/api/board.api";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import type { Board } from "@/types";

/**
 * BoardCard — individual board card with hover actions
 * Separated into its own component so it can manage its own hover state
 * without re-rendering the whole grid
 */
const BoardCard = ({
  board,
  onOpen,
  onDelete,
}: {
  board: Board;
  onOpen: () => void;
  onDelete: () => void;
}) => {
  const GRADIENTS = [
    "from-blue-500 to-indigo-600",
    "from-violet-500 to-purple-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-teal-500 to-cyan-600",
    "from-green-500 to-emerald-600",
  ];

  // pick a consistent gradient based on board id
  const gradient = GRADIENTS[board.id.charCodeAt(0) % GRADIENTS.length];

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <Card
      className="group bg-slate-800/60 border-slate-700/50 hover:border-slate-500/70 transition-all duration-200 hover:shadow-xl hover:shadow-black/20 cursor-pointer overflow-hidden"
      onClick={onOpen}
    >
      {/* thumbnail */}
      <div
        className={`h-36 bg-gradient-to-br ${gradient} relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Layers className="w-10 h-10 text-white/30" />
        </div>

        {/* hover overlay with actions */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            size="sm"
            className="bg-white text-slate-900 hover:bg-slate-100 rounded-sm  font-medium"
            onClick={onOpen}
          >
            Open board
          </Button>
        </div>
      </div>

      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-white text-sm leading-tight truncate flex-1">
            {board.title}
          </h3>

          {/* dropdown menu — stop propagation so card click doesn't fire */}
          <DropdownMenu>
            <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-slate-800 border-slate-700 text-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={onOpen}
                className="hover:bg-slate-700 cursor-pointer"
              >
                Open
              </DropdownMenuItem>
              {board.role === "owner" && (
                <>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardFooter className="px-4 pb-3 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Clock className="w-3 h-3" />
          <span>{timeAgo(board.updatedAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {board.isPublic ? (
            <Globe className="w-3 h-3 text-slate-500" />
          ) : (
            <Lock className="w-3 h-3 text-slate-500" />
          )}
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0 h-5 bg-slate-700 text-slate-400 border-0 capitalize"
          >
            {board.role}
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
};

/**
 * BoardSkeleton — shown while boards are loading
 * Mimics the shape of BoardCard so the layout doesn't jump
 */
const BoardSkeleton = () => (
  <Card className="bg-slate-800/60 border-slate-700/50 overflow-hidden">
    <Skeleton className="h-36 bg-slate-700/50 rounded-none" />
    <CardContent className="p-4 space-y-2">
      <Skeleton className="h-4 w-3/4 bg-slate-700/50" />
      <Skeleton className="h-3 w-1/2 bg-slate-700/50" />
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: () => boardApi.getMyBoards().then((r) => r.data.boards),
  });

  const createMutation = useMutation({
    mutationFn: () => boardApi.createBoard({ title, description, isPublic }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      navigate(`/board/${res.data.board.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => boardApi.deleteBoard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });

  const handleLogout = async () => {
    const rt = localStorage.getItem("refreshToken") || "";
    await authApi.logout(rt).catch(() => {});
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-slate-800/80 backdrop-blur border-r border-slate-700/50 flex flex-col z-20">
        {/* logo */}
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight">
            Canvasly
          </span>
        </div>

        <Separator className="bg-slate-700/50" />

        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-700/60 text-white text-sm font-medium">
            <LayoutGrid className="w-4 h-4" />
            All boards
          </div>
        </nav>

        {/* user info at bottom */}
        <div className="p-3 border-t border-slate-700/50">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/60 transition-colors text-left">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                    {user?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-52 bg-slate-800 border-slate-700 text-slate-200"
            >
              {/* <DropdownMenuSeparator className="bg-slate-700" /> */}
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-60">
        {/* top bar */}
        <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">My Boards</h1>
            <p className="text-slate-400 text-sm">
              {data?.length ?? 0} board{data?.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            New board
          </Button>
        </header>

        <div className="px-8 py-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <BoardSkeleton key={i} />
              ))}
            </div>
          ) : data?.length === 0 ? (
            /* empty state */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
                <Layers className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-white font-medium mb-1">No boards yet</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-xs">
                Create your first board to start collaborating in real time
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Create first board
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {data?.map((board: Board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onOpen={() => navigate(`/board/${board.id}`)}
                  onDelete={() => {
                    if (
                      confirm(`Delete "${board.title}"? This cannot be undone.`)
                    ) {
                      deleteMutation.mutate(board.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create board dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">New board</DialogTitle>
            <DialogDescription className="text-slate-400">
              Give your board a name to get started.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Board title</Label>
              <Input
                autoFocus
                placeholder="e.g. Product roadmap"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim())
                    createMutation.mutate();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">
                Description <span className="text-slate-500">(optional)</span>
              </Label>
              <Input
                placeholder="What's this board for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            {/* public toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border ">
              <div className="flex items-center gap-2.5">
                {isPublic ? (
                  <Globe className="w-4 h-4 text-blue-400" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {isPublic ? "Public" : "Private"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isPublic
                      ? "Anyone with the link can view"
                      : "Only invited members"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  isPublic ? "bg-blue-600" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                    isPublic ? "left-5" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="text-white hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                "Create board"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
