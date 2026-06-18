// apps/board-service/src/config/env.ts
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3002"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  AUTH_SERVICE_URL: z.string().default("http://localhost:3001"),
});

export const env = schema.parse(process.env);
