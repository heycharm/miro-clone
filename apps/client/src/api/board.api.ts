// apps/client/src/api/board.api.ts
import api from "./axios";
import type { Board, BoardElement } from "../types/index";

export const boardApi = {
  getMyBoards: () => api.get<{ boards: Board[] }>("/boards"),

  createBoard: (data: {
    title: string;
    description?: string;
    isPublic?: boolean;
  }) => api.post<{ board: Board }>("/boards", data),

  getBoard: (id: string) =>
    api.get<{ board: Board & { elements: BoardElement[] } }>(`/boards/${id}`),

  updateBoard: (id: string, data: Partial<Board>) =>
    api.patch<{ board: Board }>(`/boards/${id}`, data),

  deleteBoard: (id: string) => api.delete(`/boards/${id}`),

  // elements
  createElement: (boardId: string, data: Partial<BoardElement>) =>
    api.post<{ element: BoardElement }>(`/boards/${boardId}/elements`, data),

  updateElement: (
    boardId: string,
    elementId: string,
    data: Partial<BoardElement>,
  ) =>
    api.patch<{ element: BoardElement }>(
      `/boards/${boardId}/elements/${elementId}`,
      data,
    ),

  deleteElement: (boardId: string, elementId: string) =>
    api.delete(`/boards/${boardId}/elements/${elementId}`),
};
