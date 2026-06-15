import {DataTypes, Model, Optional} from  'sequelize'
import {sequelize} from  '../config/database'

interface BoardAttributes {
    id: string;
    title: string;
    description: string |null ;
    thumbnail: string | null ;

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
