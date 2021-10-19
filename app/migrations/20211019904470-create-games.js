'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
      return queryInterface.createTable("games", {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        start_time: Sequelize.DATE,
        end_time: Sequelize.DATE,
        score: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        is_hacked: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        created_at: Sequelize.DATE,
        updated_at: Sequelize.DATE
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('games');
  }
};
