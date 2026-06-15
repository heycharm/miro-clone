import { string, z } from "zod";

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export type BoardRole = "owner" | "editor" | "viewer";

export type ElementType =
  | "rect"
  | "circle"
  | "text"
  | "image"
  | "arrow"
  | "sticky";

export const createBoardSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export const createElement = z.object({
  type: z.enum(["rect", "circle", "text", "image", "arrow", "sticky"]),
  x: z.number(),
  y: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
  rotation: z.number().default(0),
  zIndex: z.number().default(0),
  properties: z.record(z.string(), z.unknown()).default({}),
});

export const updateElement = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().min(1).optional(),
  height: z.number().min(1).optional(),
  rotation: z.number().optional(),
  zIndex: z.number().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateElementInput = z.infer<typeof createElement>;
export type UpdateElementInput = z.infer<typeof updateElement>; 