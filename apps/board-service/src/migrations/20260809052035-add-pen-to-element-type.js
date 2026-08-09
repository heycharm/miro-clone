'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_elements_type" ADD VALUE IF NOT EXISTS 'pen'`
    );
  },

  async down(queryInterface) {
    // Postgres doesn't support removing ENUM values
    // so down migration just logs a warning
    console.warn('Cannot remove enum value pen from elements type');
  },
};