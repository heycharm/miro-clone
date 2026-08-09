// apps/board-service/src/models/BoardMember.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class BoardMember extends Model {
  declare boardId: string;
  declare userId: string;
  declare role: "owner" | "editor" | "viewer";
  declare invitedBy: string;
}

BoardMember.init(
  {
    boardId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "board_id",
      primaryKey: true, // ← composite primary key part 1
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      primaryKey: true, // ← composite primary key part 2
    },
    role: {
      type: DataTypes.ENUM("owner", "editor", "viewer"),
      defaultValue: "viewer",
      allowNull: false,
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "invited_by",
    },
  },
  {
    sequelize,
    modelName: "BoardMember",
    tableName: "board_members",
    underscored: true,
  },
);
