// apps/auth-service/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { connectDB } from "./config/database";
import authRoutes from "./routes/auth.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "auth-service" });
});

app.use("/auth", authRoutes);


app.use("*", (req, res) => {
  console.log("UNMATCHED ROUTE:", req.method, req.originalUrl);
  res.status(404).json({ message: "Route not found" });
});
app.use(errorMiddleware); // always last

const start = async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`[auth-service] Running on port ${env.PORT}`);
    });
  } catch (err) {
    console.error("[auth-service] Failed to start:", err);
    process.exit(1);
  }
};

start();
