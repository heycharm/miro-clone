// apps/board-service/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { connectDB } from "./config/database";
import boardRoutes from "./routes/board.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "board-service" });
});

app.use("/boards", boardRoutes);
app.use(errorMiddleware);

const start = async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`[board-service] Running on port ${env.PORT}`);
    });
  } catch (err) {
    console.error("[board-service] Failed to start:", err);
    process.exit(1);
  }
};

start();
