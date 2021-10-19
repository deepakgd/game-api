const models = require("./models");

module.exports = () => {
    models.users.hasMany(models.games, { foreignKey: "user_id", as: "games" });
    models.games.belongsTo(models.users, { sourceKey: "user_id", targetKey: "id", foreignKey: "user_id", as: "user" });
};
