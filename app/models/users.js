module.exports = (sequelize, DataTypes) => {
  var users = sequelize.define("users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      name: {
        type:  DataTypes.STRING,
        defaultValue: ""
      },
      email:{
        type: DataTypes.STRING,
        defaultValue: ""
      },
      phone:{
        type: DataTypes.STRING,
        defaultValue: ""
      },
      way_comm:{
        type: DataTypes.STRING,
        defaultValue: ""
      },
      is_hacker: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_subscribe: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      high_score: {
        type: DataTypes.INTEGER,
        defaultValue: null
      },
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE
    },
    {
      classMethods: {
        associate: function(models) {}
      }
    }
  );

  return users;
};
