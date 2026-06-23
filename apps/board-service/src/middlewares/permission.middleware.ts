import { Request, Response, NextFunction } from "express";
import { BoardMember } from "../models";
import { BoardRole } from "../types";

const ROLE_HIERARCHY: Record<BoardRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export const requireBoardAccess = (minimumRole: BoardRole) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const boardId = req.params.boardId || req.params.id;
      const userId = (req as any).userId;

      if (!boardId || !userId) {
        return res.status(500).json({
          message: "Missing BoardId or UserId.",
        });
      }

      const membership = await BoardMember.findOne({
        where: { boardId, userId },
      });

      if (!membership) {
        return res.status(500).json({
          message: "You are not the member of this board.",
        });
      }

      const userRoleLevel = ROLE_HIERARCHY[membership.role];
      const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({
          message: `This action requires '${minimumRole}' access. You have '${membership.role}'.`,
        });
      }

      (req as any).userRole = membership.role;

      next();
    } catch (error) {
        next(error);
    }
  };
};
