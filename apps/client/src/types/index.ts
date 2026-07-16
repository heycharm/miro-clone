// apps/client/src/types/index.ts

export type ElementType =
  | "rect"
  | "circle"
  | "text"
  | "image"
  | "arrow"
  | "sticky";

export type BoardRole = "owner" | "editor" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

export interface Board {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isPublic: boolean;
  ownerId: string;
  role: BoardRole;
  createdAt: string;
  updatedAt: string;
}

export interface BoardElement {
  id: string;
  boardId: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  properties: Record<string, unknown>;
  createdBy: string;
}

export interface UserPresence {
  userId: string;
  email: string;
  cursor: { x: number; y: number } | null;
  color: string;
  joinedAt: number;
}

export type ToolType =
  | "select"
  | "rect"
  | "circle"
  | "text"
  | "sticky"
  | "arrow"
  | "pan";
