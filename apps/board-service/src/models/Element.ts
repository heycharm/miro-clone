import { sequelize } from "../config/database";
import { DataTypes, Model, Optional } from "sequelize";

interface ElementAttributes {
  id: string;
  boardId: string;
  type: "rect" | "circle" | "text" | "image" | "arrow" | "sticky";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;

  properties: Record<string, unknown>;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type ElementCreationAttributes = Omit<
  //ON claude  -- Optional<>
  ElementAttributes,
  "id" | "rotation" | "zIndex" | "updatedBy"
>;

export class Element extends Model<
  ElementAttributes,
  ElementCreationAttributes
> {
  declare id: string;
  declare boardId: string;
  declare type: string;
  declare x: number;
  declare y: number;
  declare width: number;
  declare height: number;
  declare rotation: number;
  declare zIndex: number;
  declare properties: Record<string, unknown>;
  declare createdBy: string;
  declare updatedBy: string | null;
}

Element.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    boardId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        "rect",
        "circle",
        "text",
        "image",
        "arrow",
        "sticky",
      ),
      allowNull: false,
    },
    x: { type: DataTypes.FLOAT, allowNull: false },
    y: { type: DataTypes.FLOAT, allowNull: false },
    width: { type: DataTypes.FLOAT, allowNull: false },
    height: { type: DataTypes.FLOAT, allowNull: false },
    rotation: { type: DataTypes.FLOAT, defaultValue: 0 },
    zIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
    properties: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Element",
    tableName: "elements",
    indexes: [
      {
        /**
         * Index on boardId — every element query filters by boardId first
         * Without this index, loading a board with 1000 elements
         * does a full table scan. With it, Postgres jumps straight
         * to the right rows. Critical for performance.
         */
        fields: ["boardId"],
      },
    ],
  },
);
