'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      avatar: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      provider: {
        type: Sequelize.ENUM('local', 'google'),
        defaultValue: 'local',
      },
      providerId: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'provider_id',
      },
      refreshToken: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'refresh_token',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    });

    await queryInterface.addIndex('users', ['email']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};