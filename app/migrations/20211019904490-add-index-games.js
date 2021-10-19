"use strict";

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex("games", ["user_id"]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex("games", ["user_id"]);
  },
};
