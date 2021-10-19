require('dotenv').config()
const config = require('./index');

// logging: console.log

module.exports = {
  logging: false,
  database: config.dbname,
  username: config.dbUserName,
  password: config.dbPassword,
  host: config.dbHost,
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscores: false,
    freezeTableName: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at'
  }

}

// disable the modification of tablenames; By default, sequelize will automatically
  // transform all passed model names (first parameter of define) into plural.
  // if you don't want that, set the following "freezeTableName: true"