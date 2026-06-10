// apps/auth-service/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { tokenService } from "../services/token.service";
import { registerSchema, loginSchema } from "@miro/shared";

