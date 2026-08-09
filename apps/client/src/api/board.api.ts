// src/api/board.api.ts
import api from "./axios";
import type { Board, BoardElement } from "../types";

export const boardApi = {
  getMyBoards: () => api.get<{ boards: Board[] }>("/boards"),
  createBoard: (d: {
    title: string;
    description?: string;
    isPublic?: boolean;
  }) => api.post<{ board: Board }>("/boards", d),
  getBoard: (id: string) =>
    api.get<{ board: Board & { elements: BoardElement[] } }>(`/boards/${id}`),
  updateBoard: (id: string, d: Partial<Board>) =>
    api.patch<{ board: Board }>(`/boards/${id}`, d),
  deleteBoard: (id: string) => api.delete(`/boards/${id}`),
  createElement: (boardId: string, d: Partial<BoardElement>) =>
    api.post<{ element: BoardElement }>(`/boards/${boardId}/elements`, d),
  updateElement: (
    boardId: string,
    elementId: string,
    d: Partial<BoardElement>,
  ) =>
    api.patch<{ element: BoardElement }>(
      `/boards/${boardId}/elements/${elementId}`,
      d,
    ),
  deleteElement: (boardId: string, elementId: string) =>
    api.delete(`/boards/${boardId}/elements/${elementId}`),

  // apps/client/src/api/board.api.ts
// add these to the existing boardApi object

inviteMember: (boardId: string, data: { email: string; role: 'editor' | 'viewer' }) =>
  api.post(`/boards/${boardId}/members`, data),

getMembers: (boardId: string) =>
  api.get<{ members: any[] }>(`/boards/${boardId}/members`),

removeMember: (boardId: string, userId: string) =>
  api.delete(`/boards/${boardId}/members/${userId}`),

};
