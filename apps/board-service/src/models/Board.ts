// apps/board-service/src/models/Board.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface BoardAttributes {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isPublic: boolean;
  ownerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type BoardCreationAttributes = Optional<
  BoardAttributes,
  'id' | 'description' | 'thumbnail' | 'isPublic'
>;

export class Board extends Model<BoardAttributes, BoardCreationAttributes> {
  declare id: string;
  declare title: string;
  declare description: string | null;
  declare thumbnail: string | null;
  declare isPublic: boolean;
  declare ownerId: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Board.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      /**
       * field — tells Sequelize the actual DB column name
       * Our migration created it as is_public (snake_case)
       * but our JS code uses isPublic (camelCase)
       * This mapping bridges the two
       */
      field: 'is_public',
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'owner_id',   // maps ownerId → owner_id in DB
    },
  },
  {
    sequelize,
    modelName: 'Board',
    tableName: 'boards',
    /**
     * underscored: true — tells Sequelize to automatically
     * convert ALL camelCase column names to snake_case
     * createdAt → created_at, updatedAt → updated_at
     * So you don't have to add field: for every column
     */
    underscored: true,
  }
);