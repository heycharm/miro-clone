import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

// health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

// route → service
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
  }),
);
app.use(
  "/api/boards",
  createProxyMiddleware({
    target: process.env.BOARD_SERVICE_URL,
    changeOrigin: true,
  }),
);

app.listen(PORT, () => console.log(`[api-gateway] Running on port ${PORT}`));
