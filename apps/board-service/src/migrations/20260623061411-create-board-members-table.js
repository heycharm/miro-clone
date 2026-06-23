// src/migrations/xxxx-create-board-members-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('board_members', {
      board_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'boards', key: 'id' },
        onDelete: 'CASCADE',
        /**
         * CASCADE means: if a board is deleted,
         * automatically delete all its member records too
         * Without this you'd get orphaned rows in board_members
         */
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('owner', 'editor', 'viewer'),
        defaultValue: 'viewer',
        allowNull: false,
      },
      invited_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // composite unique — prevents duplicate memberships
    await queryInterface.addIndex('board_members', ['board_id', 'user_id'], {
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('board_members');
  },
};