// apps/board-service/src/models/Element.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ElementAttributes {
  id: string;
  boardId: string;
  type: 'rect' | 'circle' | 'text' | 'image' | 'arrow' | 'sticky' | 'pen';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  properties: Record<string, unknown>;
  createdBy: string;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type ElementCreationAttributes = Optional<
  ElementAttributes,
  'id' | 'rotation' | 'zIndex' | 'updatedBy'
>;

export class Element extends Model<ElementAttributes, ElementCreationAttributes> {
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
      field: "board_id",
    },
    type: {
      type: DataTypes.ENUM(
        "rect",
        "circle",
        "text",
        "image",
        "arrow",
        "sticky",
        "pen",
      ),
      allowNull: false,
    },
    x: { type: DataTypes.FLOAT, allowNull: false },
    y: { type: DataTypes.FLOAT, allowNull: false },
    width: { type: DataTypes.FLOAT, allowNull: false },
    height: { type: DataTypes.FLOAT, allowNull: false },
    rotation: { type: DataTypes.FLOAT, defaultValue: 0 },
    zIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "z_index",
    },
    properties: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "updated_by",
    },
  },
  {
    sequelize,
    modelName: "Element",
    tableName: "elements",
    underscored: true,
    indexes: [{ fields: ["board_id"] }],
  },
);