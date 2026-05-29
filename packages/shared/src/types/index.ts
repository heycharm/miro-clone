// packages/shared/src/types/index.ts

export type ElementType =
  | "rect"
  | "circle"
  | "text"
  | "image"
  | "arrow"
  | "sticky";

export type BoardRole = "owner" | "editor" | "viewer";

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
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
