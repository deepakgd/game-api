"use strict";

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: Sequelize.STRING,
      phone: Sequelize.STRING,
      way_comm: Sequelize.STRING,
      is_hacker: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_subscribe: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      high_score: {
        type: Sequelize.INTEGER,
        defaultValue: null
      },
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("users");
  }
};
