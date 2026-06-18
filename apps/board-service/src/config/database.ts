// apps/board-service/src/config/database.ts
import { Sequelize } from "sequelize";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: "postgres",
  logging: isProduction ? false : console.log,
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  dialectOptions: isProduction
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

export const connectDB = async () => {
  await sequelize.authenticate();
  console.log("[board-service] PostgreSQL connected");
};
