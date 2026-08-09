import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);
// apps/auth-service/src/routes/auth.routes.ts
router.get('/user-by-email', authController.getUserByEmail);
router.get("/user-by-id", authController.getUserById);

export default router