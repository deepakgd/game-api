'use strict'

const fs = require('fs'),
  path = require('path'),
  Sequelize = require('sequelize');

var basename = path.basename(module.filename)
const config = require('../../config/db');

var db = {}

var sequelize = new Sequelize(config.database, config.username, config.password, config)

//Log connection status
sequelize.authenticate()
  .then(function (errors) {
    if (errors) {
      console.log(errors)
    } else {
      console.log("Successfully connected to db")
    }
  })

fs
  .readdirSync(__dirname)
  .filter(function (file) {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
  })
  .forEach(function (file) {
    // var model = sequelize['import'](path.join(__dirname, file))
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)

    // default below code available for all project
    db[model.name] = model;
  })

Object.keys(db).forEach(function (modelName) {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
