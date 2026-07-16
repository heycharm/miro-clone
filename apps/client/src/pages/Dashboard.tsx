// apps/client/src/pages/Dashboard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "../api/board.api";
import { useAuthStore } from "../store/auth.store";
import type { Board } from "../types";
import { authApi } from "../api/auth.api";

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  /**
   * useQuery — React Query's data fetching hook
   *
   * Benefits over plain useEffect + useState:
   * - Automatic caching (same query won't refetch for 5 mins)
   * - Background refetching (data stays fresh)
   * - Loading/error states built in
   * - Automatic retry on network failure
   * - Deduplication (multiple components using same query = one request)
   */
  const { data, isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: () => boardApi.getMyBoards().then((r) => r.data.boards),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => boardApi.createBoard({ title }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate(`/board/${res.data.board.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => boardApi.deleteBoard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken") || "";
    await authApi.logout(refreshToken).catch(() => {});
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Miro Clone</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-700">My Boards</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Board
          </button>
        </div>

        {/* Create board modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-medium text-gray-800 mb-4">New Board</h3>
              <input
                autoFocus
                type="text"
                placeholder="Board title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim()) {
                    createMutation.mutate(title.trim());
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setTitle("");
                  }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate(title.trim())}
                  disabled={!title.trim() || createMutation.isPending}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Board grid */}
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">
            Loading boards...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.map((board: Board) => (
              <div
                key={board.id}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/board/${board.id}`)}
              >
                {/* thumbnail placeholder */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg h-32 mb-3 flex items-center justify-center">
                  <span className="text-3xl">🎨</span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800 text-sm truncate">
                      {board.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {board.role}
                    </p>
                  </div>
                  {board.role === "owner" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this board?")) {
                          deleteMutation.mutate(board.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
