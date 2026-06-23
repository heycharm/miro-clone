import { Request, Response, NextFunction } from "express";
import { Board, BoardMember, Element } from "../models";
import {
  createBoardSchema,
  updateBoardSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../types";

export const boardController = {
  async getMyBoards(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      /**
       * We find all BoardMember rows for this user, then include the Board
       * This is more efficient than finding all boards and filtering
       * because the composite index on (boardId, userId) makes this fast
       */
      const memberships = await BoardMember.findAll({
        where: { userId },
        include: [{ model: Board, as: "board" }],
      });

      const boards = memberships.map((m: any) => ({
        ...m.board.toJSON(),
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
};
