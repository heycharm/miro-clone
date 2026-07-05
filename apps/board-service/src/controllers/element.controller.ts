// apps/board-service/src/controllers/element.controller.ts
import { Request, Response, NextFunction } from "express";
import { Element } from "../models";
import { createElement, updateElement } from "../types";

export const elementController = {
  // GET /boards/:boardId/elements
  async getElements(req: Request, res: Response, next: NextFunction) {
    try {
      const { boardId } = req.params;

      const elements = await Element.findAll({
        where: { boardId },
        /**
         * order by zIndex so the canvas renders elements
         * in the correct stacking order (lower zIndex = behind)
         */
        order: [["zIndex", "ASC"]],
      });

      return res.status(200).json({ elements });
    } catch (err) {
      next(err);
    }
  },

  // POST /boards/:boardId/elements
  async createElement(req: Request, res: Response, next: NextFunction) {
    try {
        const boardId= req.params.boardId as string
      const parsed = createElement.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const element = await Element.create({
        ...parsed.data,
        boardId,
        createdBy: (req as any).userId,
      });

      return res.status(201).json({ element });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /boards/:boardId/elements/:elementId
  async updateElement(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateElement.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const element = await Element.findOne({
        where: {
          id: req.params.elementId,
          boardId: req.params.boardId,
        },
      });

      if (!element) {
        return res.status(404).json({ message: "Element not found" });
      }

      /**
       * For properties we do a deep merge instead of overwrite
       * This means PATCH { properties: { fill: 'red' } } only
       * updates fill, not the entire properties object
       * Without this, updating one property wipes out all others
       */
      const updatedProperties = parsed.data.properties
        ? { ...element.properties, ...parsed.data.properties }
        : element.properties;

      await element.update({
        ...parsed.data,
        properties: updatedProperties,
        updatedBy: (req as any).userId,
      });

      return res.status(200).json({ element });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /boards/:boardId/elements/:elementId
  async deleteElement(req: Request, res: Response, next: NextFunction) {
    try {
      const element = await Element.findOne({
        where: {
          id: req.params.elementId,
          boardId: req.params.boardId,
        },
      });

      if (!element) {
        return res.status(404).json({ message: "Element not found" });
      }

      await element.destroy();

      return res.status(200).json({ message: "Element deleted" });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /boards/:boardId/elements — bulk delete (for multi-select delete)
  async bulkDeleteElements(req: Request, res: Response, next: NextFunction) {
    try {
      const { elementIds } = req.body as { elementIds: string[] };

      if (!Array.isArray(elementIds) || elementIds.length === 0) {
        return res.status(400).json({ message: "elementIds array required" });
      }

      const { Op } = require("sequelize");

      await Element.destroy({
        where: {
          id: { [Op.in]: elementIds },
          boardId: req.params.boardId,
        },
      });

      return res.status(200).json({ message: "Elements deleted" });
    } catch (err) {
      next(err);
    }
  },
};
