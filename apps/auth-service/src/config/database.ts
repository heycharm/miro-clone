import { Sequelize } from "sequelize";
import { env } from "./env";

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: "postgres",
  logging: env.NODE_ENV === "development" ? console.log : false,
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
});

export const connectDB = async () => {
  await sequelize.authenticate();
  console.log("[auth-service] PostgreSQL connected");
};
