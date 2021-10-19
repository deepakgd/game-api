module.exports = (sequelize, DataTypes) => {
  var games = sequelize.define("games", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      start_time: DataTypes.DATE,
      end_time: DataTypes.DATE,
      score: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      is_hacked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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

  return games;
};
