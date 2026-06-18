import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";


export class BoardMember extends Model {
  declare boardId: string;
  declare userId: string;
  declare role: "owner" | "editor" | "viewer";
  declare invitedBy: string;
  declare createdAt: Date;
}

BoardMember.init(
  {
    boardId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("owner", "editor", "viewer"),
      defaultValue: "viewer",
      allowNull: false,
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "BoardMember",
    tableName: "board_members",
    indexes: [
      {
        unique: true,
        fields: ["boardId", "userId"],
      },
    ],
  },
);
