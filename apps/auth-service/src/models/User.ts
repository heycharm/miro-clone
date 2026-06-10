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
  "id" | "password" | "avatar" | "providerId" | "refreshToken" | "email"
>;

export class User extends Model<UserAttributes, UserCreationAttributes> {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password: string | null;
  declare avatar: string | null;
  declare provider: "local" | "google";
  declare providerId: string | null;

  async comparePassword(plain: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(plain, this.password);
  }
  toSafeObject() {
    const { password, refreshToken, ...safe } = this.toJSON() as UserAttributes;
    return safe;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider: {
      type: DataTypes.ENUM("local", "google"),
      defaultValue: "local",
    },
    providerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password") && user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  },
);
