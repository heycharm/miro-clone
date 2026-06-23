// src/migrations/xxxx-create-boards-table.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('boards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      thumbnail: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      owner_id: {
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

    await queryInterface.addIndex('boards', ['owner_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('boards');
  },
};