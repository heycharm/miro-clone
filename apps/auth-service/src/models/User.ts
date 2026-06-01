import { DataTypes, Model, Optional } from "sequelize";
import bcrypt from "bcryptjs";
import { sequelize } from "../config/database";

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  provider: "local" | "google";
  providerId: string;
  refreshToken: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "password" | "avatar" | "providerId" | "refreshToken" | 'email'
>;
