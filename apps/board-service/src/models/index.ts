// apps/board-service/src/models/index.ts
import { Board } from "./Board";
import { BoardMember } from "./BoardMember";
import { Element } from "./Element";

Board.hasMany(BoardMember, {
  foreignKey: "board_id",
  as: "members",
  onDelete: "CASCADE",
});

BoardMember.belongsTo(Board, {
  foreignKey: "board_id",
  as: "Board", // ← must be capital B
});

Board.hasMany(Element, {
  foreignKey: "board_id",
  as: "elements",
  onDelete: "CASCADE",
});

Element.belongsTo(Board, {
  foreignKey: "board_id",
});

export { Board, BoardMember, Element };
