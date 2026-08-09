// apps/auth-service/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { tokenService } from "../services/token.service";
import { registerSchema, loginSchema } from "@miro/shared";

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation Failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { name, email, password } = parsed.data;

      const existing = await User.findOne({
        where: { email },
      });
      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const user = await User.create({
        name,
        email,
        password,
        provider: "local",
      });

      const payload = { userId: user.id, email: user.email };
      const accessToken = tokenService.generateAccessToken(payload);
      const refreshToken = tokenService.generateRefreshToken(payload);

      await user.update({ refreshToken });

      return res.status(201).json({
        message: "Registration Successful",
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password } = parsed.data;

      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({
          message: "Invalid Crentials",
        });
      }

      const valid = await user.comparePassword(password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const payload = { userId: user.id, email: user.email };
      const accessToken = tokenService.generateAccessToken(payload);
      const refreshToken = tokenService.generateRefreshToken(payload);

      await user.update({ refreshToken });

      return res.status(200).json({
        message: "Login successful",
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({
          messgae: "Refresh Token Required",
        });
      }

      const decoded = tokenService.verifyToken(refreshToken);

      const user = await User.findOne({
        where: { id: decoded.userId, refreshToken },
      });
      if (!user) {
        return res.status(401).json({ message: "Invalid refresh Token" });
      }

      const payload = { userId: user.id, email: user.email };
      const newAccessToken = tokenService.generateAccessToken(payload);
      const newRefreshToken = tokenService.generateRefreshToken(payload);

      await user.update({ refreshToken: newRefreshToken });

      return res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      if (
        (err as Error).name === "JsonWebTokenError" ||
        (err as Error).name === "TokenExpiredError"
      ) {
        return res
          .status(401)
          .json({ message: "Inavalid or Expired Refresh Token" });
      }
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await User.update({ refreshToken: null }, { where: { refreshToken } });
      }

      return res.status(200).json({
        message: "Logged Out Successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  // apps/auth-service/src/controllers/auth.controller.ts
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      console.log("LOOKING FOR USER ID:", userId); // 👈 add this

      if (!userId) {
        return res.status(401).json({ message: "User ID missing from token" });
      }

      const user = await User.findByPk(userId);

      console.log("FOUND USER:", user ? user.id : "null"); // 👈 add this

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({ user: user.toSafeObject() });
    } catch (err) {
      next(err);
    }
  },
  // apps/auth-service/src/controllers/auth.controller.ts
  // add this to authController

  async getUserByEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.query as { email: string };
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const user = await User.findOne({
        where: { email },
        attributes: ["id", "name", "email", "avatar"],
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        userId: user.id,
        name: user.name,
        email: user.email,
      });
    } catch (err) {
      next(err);
    }
  },
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.query as { userId: string };
      if (!userId) {
        return res.status(400).json({ message: "userId required" });
      }

      const user = await User.findByPk(userId, {
        attributes: ["id", "name", "email", "avatar"],
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        userId: user.id,
        name: user.name,
        email: user.email,
      });
    } catch (err) {
      next(err);
    }
  },
};
