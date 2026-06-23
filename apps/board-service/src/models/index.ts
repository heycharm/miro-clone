// apps/board-service/src/models/index.ts
import { Board } from "./Board";
import { BoardMember } from "./BoardMember";
import { Element } from "./Element";

/**
 * Associations tell Sequelize how models relate
 * so you can do Board.findOne({ include: [Element] })
 * and get everything in one query instead of two
 */
Board.hasMany(BoardMember, {
  foreignKey: "boardId",
  as: "members",
  onDelete: "CASCADE",
});
BoardMember.belongsTo(Board, { foreignKey: "boardId" });

Board.hasMany(Element, {
  foreignKey: "boardId",
  as: "elements",
  onDelete: "CASCADE",
});
Element.belongsTo(Board, { foreignKey: "boardId" });

export { Board, BoardMember, Element };
