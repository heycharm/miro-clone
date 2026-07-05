import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("4000"),
  AUTH_SERVICE_URL: z.string().default("http://localhost:3001"),
  BOARD_SERVICE_URL: z.string().default("http://localhost:3002"),
  COLLAB_SERVICE_URL: z.string().default("http://localhost:3003"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
});

export const env = schema.parse(process.env);
