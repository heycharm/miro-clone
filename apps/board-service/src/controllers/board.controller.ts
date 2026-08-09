import { Request, Response, NextFunction } from "express";
import { Board, BoardMember, Element } from "../models";
import {
  createBoardSchema,
  updateBoardSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../types";
import { env } from '../config/env';

export const boardController = {
  async getMyBoards(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      const memberships = await BoardMember.findAll({
        where: { userId },
        include: [
          {
            model: Board,
            as: "Board", // ← capital B, matches association in models/index.ts
          },
        ],
      });

      const boards = memberships
        .filter((m: any) => m.Board !== null)
        .map((m: any) => ({
          ...m.Board.toJSON(),
          role: m.role,
        }));

      return res.status(200).json({ boards });
    } catch (err) {
      next(err);
    }
  },

  async createBoard(req: Request, res: Response, nxt: NextFunction) {
    try {
      const parsed = createBoardSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation Failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      const userId = (req as any).userId;
      const { title, description, isPublic } = parsed.data;
      const { sequelize } = Board;
      const board = await sequelize!.transaction(async (t) => {
        const newBoard = await Board.create(
          { title, description, isPublic, ownerId: userId },
          { transaction: t },
        );

        // creator automatically becomes the owner
        await BoardMember.create(
          {
            boardId: newBoard.id,
            userId,
            role: "owner",
            invitedBy: userId,
          },
          { transaction: t },
        );

        return newBoard;
      });

      return res.status(201).json({
        message: "Board created",
        board: { ...board.toJSON(), role: "owner" },
      });
    } catch (err) {
      nxt(err);
    }
  },

  async getBoard(req: Request, res: Response, nxt: NextFunction) {
    try {
      const id = req.params.id as string;

      const board = await Board.findByPk(id, {
        include: [
          { model: Element, as: "elements" },
          { model: BoardMember, as: "members" },
        ],
      });

      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      return res.status(200).json({
        board: {
          ...board.toJSON(),
          role: (req as any).userRole,
        },
      });
    } catch (error) {
      nxt(error);
    }
  },

  async updateBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const parsed = updateBoardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const board = await Board.findByPk(id);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      await board.update(parsed.data);

      return res.status(200).json({ message: "Board updated", board });
    } catch (err) {
      next(err);
    }
  },

  async deleteBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const board = await Board.findByPk(id);
      if (!board) {
        return res.status(404).json({ message: "Board not found" });
      }

      /**
       * Because we set onDelete: 'CASCADE' in the migration,
       * deleting the board automatically deletes:
       * - all board_members rows for this board
       * - all elements rows for this board
       * No need to manually delete them — Postgres handles it
       */
      await board.destroy();

      return res.status(200).json({ message: "Board deleted" });
    } catch (err) {
      next(err);
    }
  },

  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = inviteMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      /**
       * Problem: we have an email but BoardMember needs a userId
       * The user data lives in auth-service's database — not ours
       * So we call auth-service to resolve email → userId
       *
       * This is a synchronous inter-service HTTP call
       * In Phase 5 we'll add async event-based communication via Redis
       * for non-critical cross-service operations
       */
      const { email, role } = parsed.data;
      const boardId = req.params.id;
      const invitedBy = (req as any).userId;

      // call auth-service to get userId from email
      const response = await fetch(
        `${env.AUTH_SERVICE_URL}/auth/user-by-email?email=${email}`,
      );

      if (!response.ok) {
        return res.status(404).json({ message: "User not found" });
      }

      const { userId } = (await response.json()) as { userId: string };

      // check if already a member
      const existing = await BoardMember.findOne({
        where: { boardId, userId },
      });

      if (existing) {
        return res.status(409).json({ message: "User is already a member" });
      }

      const member = await BoardMember.create({
        boardId,
        userId,
        role,
        invitedBy,
      });

      return res.status(201).json({ message: "Member invited", member });
    } catch (err) {
      next(err);
    }
  },

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateMemberRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { id: boardId, userId } = req.params;

      // prevent changing owner's role
      const member = await BoardMember.findOne({ where: { boardId, userId } });
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      if (member.role === "owner") {
        return res.status(403).json({ message: "Cannot change owner role" });
      }

      await member.update({ role: parsed.data.role });

      return res.status(200).json({ message: "Role updated", member });
    } catch (err) {
      next(err);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: boardId, userId } = req.params;
      const requesterId = (req as any).userId;

      const member = await BoardMember.findOne({ where: { boardId, userId } });
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // owners cannot be removed — board must be deleted instead
      if (member.role === "owner") {
        return res.status(403).json({ message: "Cannot remove board owner" });
      }

      // members can remove themselves (leave board)
      // owners can remove anyone else — checked by requireBoardAccess('owner') on route
      if (requesterId !== userId && (req as any).userRole !== "owner") {
        return res.status(403).json({ message: "Not authorized" });
      }

      await member.destroy();

      return res.status(200).json({ message: "Member removed" });
    } catch (err) {
      next(err);
    }
  },

  // apps/board-service/src/controllers/board.controller.ts
  // add this function to boardController

  // apps/board-service/src/controllers/board.controller.ts

  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await BoardMember.findAll({
        where: { boardId: req.params.id },
      });

      /**
       * Enrich each member with their name/email from auth-service
       * BoardMember only stores userId — no name or email
       * We call auth-service to get that info
       *
       * Promise.allSettled — runs all fetches in parallel
       * If one fails it doesn't crash the whole request
       * Failed ones just show userId as fallback
       */
      const enriched = await Promise.allSettled(
        members.map(async (member) => {
          try {
            const response = await fetch(
              `${env.AUTH_SERVICE_URL}/auth/user-by-id?userId=${member.userId}`,
            );
            const data = (await response.json()) as any;
            return {
              ...member.toJSON(),
              name: data.name || "Unknown",
              email: data.email || member.userId,
            };
          } catch {
            // if auth-service call fails, just return userId as fallback
            return {
              ...member.toJSON(),
              name: "Unknown",
              email: member.userId,
            };
          }
        }),
      );

      const result = enriched.map((r) =>
        r.status === "fulfilled" ? r.value : { error: true },
      );

      return res.status(200).json({ members: result });
    } catch (err) {
      next(err);
    }
  },
};
