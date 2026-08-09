// apps/board-service/src/routes/board.routes.ts
import { Router } from "express";
import { boardController } from "../controllers/board.controller";
import { elementController } from "../controllers/element.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireBoardAccess } from "../middlewares/permission.middleware";

const router = Router();

/**
 * All routes require authentication — authenticate runs first
 * Then requireBoardAccess checks the user's role on that specific board
 *
 * Route structure follows REST conventions:
 * GET    /boards          → list
 * POST   /boards          → create
 * GET    /boards/:id      → read one
 * PATCH  /boards/:id      → update
 * DELETE /boards/:id      → delete
 */

// Board routes
router.get("/", authenticate, boardController.getMyBoards);
router.post("/", authenticate, boardController.createBoard);

router.get(
  "/:id",
  authenticate,
  requireBoardAccess("viewer"),
  boardController.getBoard,
);
router.patch(
  "/:id",
  authenticate,
  requireBoardAccess("editor"),
  boardController.updateBoard,
);
router.delete(
  "/:id",
  authenticate,
  requireBoardAccess("owner"),
  boardController.deleteBoard,
);

// Member routes
router.post(
  "/:id/members",
  authenticate,
  requireBoardAccess("owner"),
  boardController.inviteMember,
);
router.patch(
  "/:id/members/:userId",
  authenticate,
  requireBoardAccess("owner"),
  boardController.updateMemberRole,
);
router.delete(
  "/:id/members/:userId",
  authenticate,
  requireBoardAccess("owner"),
  boardController.removeMember,
);

// Element routes — nested under board
router.get(
  "/:boardId/elements",
  authenticate,
  requireBoardAccess("viewer"),
  elementController.getElements,
);
router.post(
  "/:boardId/elements",
  authenticate,
  requireBoardAccess("editor"),
  elementController.createElement,
);
router.patch(
  "/:boardId/elements/:elementId",
  authenticate,
  requireBoardAccess("editor"),
  elementController.updateElement,
);
router.delete(
  "/:boardId/elements/:elementId",
  authenticate,
  requireBoardAccess("editor"),
  elementController.deleteElement,
);
router.delete(
  "/:boardId/elements",
  authenticate,
  requireBoardAccess("editor"),
  elementController.bulkDeleteElements,
);
// add this line with other member routes
router.get(
  "/:id/members",
  authenticate,
  requireBoardAccess("viewer"),
  boardController.getMembers,
);

export default router;
