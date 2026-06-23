// src/migrations/xxxx-create-elements-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('elements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      board_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'boards', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('rect', 'circle', 'text', 'image', 'arrow', 'sticky'),
        allowNull: false,
      },
      x: { type: Sequelize.FLOAT, allowNull: false },
      y: { type: Sequelize.FLOAT, allowNull: false },
      width: { type: Sequelize.FLOAT, allowNull: false },
      height: { type: Sequelize.FLOAT, allowNull: false },
      rotation: { type: Sequelize.FLOAT, defaultValue: 0 },
      z_index: { type: Sequelize.INTEGER, defaultValue: 0 },
      properties: {
        /**
         * JSONB in Postgres — binary JSON
         * Faster than JSON, supports GIN indexes for querying inside the JSON
         * Use this whenever you have flexible/dynamic fields on a model
         */
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('elements', ['board_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('elements');
  },
};