const to = require("await-to-js").to,
  moment = require("moment-timezone"),
  _ = require("lodash"),
  Json2csvTransform = require("json2csv").Transform,
  fs = require("fs"),
  sequelize = require("sequelize"),
  Op = sequelize.Op;

const config = require("../../config"),
  logger = require("../utils/logger"),
  helper = require("../utils/helper"),
  models = require("../models");

/**
 * save - validate and save game score details in database
 * @param {OBJECT} request - contains star, end time, score and user details
 */
exports.save = (request) => {
  return new Promise(async (resolve, reject) => {
    let error,
      response,
      isHacked = false;

    let { startTime: start_time, endTime: end_time, score } = request.body;

    let { id: user_id, store_name } = request.user;

    // request body validation
    if (!start_time || !end_time || score === undefined || score === "" || score === null) return resolve({
      status: 400,
      message: "Start time, end time and score required",
    });

    // check valid game or not
    if (!validateGame(start_time, end_time, score)) {
      isHacked = true;

      // mark user as hacker
      [error, response] = await to(models.users.update({ is_hacker: true }, { where: { id: user_id } }));
      if (error) return helper.logErrorAndRespond(`save > update as hacker > `, error, reject);
    }

    // save game score
    [error, response] = await to(models.games.create({
        start_time: moment(start_time),
        end_time: moment(end_time),
        score: score,
        user_id: user_id,
        is_hacked: isHacked,
        store_name: store_name,
      })
    );
    if (error) return helper.logErrorAndRespond("save > create > ", error, reject);

    return resolve({ success: true, status: 200, message: "Game saved successfully", score: score });
  });
};

exports.showScore = (request) => {
  return new Promise(async (resolve, reject) => {
    let { id: user_id } = request.user;
    let { date } = request.query; // date=2021-10-19

    let startDate = moment.tz(date, "YYYY-MM-DD", config.timezone).utc().format();
    let endDate =  moment.tz(date, "YYYY-MM-DD" , config.timezone).endOf('day').utc().format();

    console.log(startDate, endDate);
    logger.info(`Date filter - start date - ${startDate} - endDate - ${endDate}`);

    let [error, games] = await to(models.games.findAll({
      // get today played games
      where: { created_at: { [Op.gte]: startDate, [Op.lte]: endDate } },
      // group by user_id
      group: ["user_id"],
      // get today's max score of user and merge user details by alias/rename
      attributes: ["user_id", [sequelize.fn('max', sequelize.col('score')), "highScore"], [sequelize.col('user.name'), 'name'], [sequelize.col('user.email'), 'email']],
      // include user details
      include: [{
        model: models.users,
        as: 'user',
        attributes: []
      }],
      // order by high score  in descending order
      order: [[[sequelize.col("highScore"), "DESC"]]],
      // get raw data - this will give included data as user.name user.email etc.,
      raw: true
    }));
    if (error) return helper.logErrorAndRespond("get games  > ", error, reject);

    if(!date) return resolve({ status: 400, success: false,  message: "Date required" });

    if(games.length === 0) return resolve({ status: 200, success: true,  message: "No games found" });

    games.forEach(game=>game.isCurrentUser = (game.user_id === user_id));

    resolve({ success: true, status: 200, data: games });

  })
}


exports.leaderboard = (request) => {
  return new Promise(async (resolve, reject) => {
    let { id: user_id, store_name, first_name, high_score } = request.user;

    if (!first_name && !high_score) return resolve({
        status: 400,
        success: false,
        message: "To view leadeboard you have to update your profile and play atleast one game",
        redirect: true,
      });

    let [error, games] = await to(
      models.users.findAll({
        where: {
          [Op.and]: [
            { high_score: { [Op.ne]: null } },
            { high_score: { [Op.ne]: "" } },
            { first_name: { [Op.ne]: "" } },
            { first_name: { [Op.ne]: null } },
            { store_name }
          ]
        },
        order: [
          ["high_score", "DESC"]
        ],
        attributes: ["id", ["first_name", "firstName"], ["high_score", "highScore"]],
        // limit: 5
      })
    );
    if (error)
      return helper.logErrorAndRespond("get all games > ", error, reject);

    if (games && games.length > 0)
      games = helper.sequelizeToJson("Array", games);

    // mark currentuser for highlight in front end
    let currentUser, currentUserIndex, result;
    result = games.map((game, index)=>{
      game.rank = index + 1;
      console.log(game.id)
      if(game.id === user_id) {
        game.isCurrentUser = true;
        currentUser = Object.assign({}, game);
        currentUserIndex = index;
      }else game.isCurrentUser = false;
      return game;
    });

    result = result.slice(0, 5);

    console.log(currentUserIndex, currentUser,"--->", user_id)

    // current user not in top 5
    if(currentUserIndex >= 5) {
      result.push(currentUser);
    }

    return resolve({
      status: 200,
      message: "Success",
      redirect: false,
      data: result,
    });
  });
};


/**
 * downloadReport - download report from database
 */
 exports.downloadReportByDate = async (req, res) =>{
  let { date } = req.query; // date=2021-10-19
  if(!date) return resolve({ status: 400, success: false,  message: "Date required" });

  let startDate = moment.tz(date, "YYYY-MM-DD", config.timezone).utc().format();
  let endDate =  moment.tz(date, "YYYY-MM-DD" , config.timezone).endOf('day').utc().format();

  console.log(startDate, endDate);
  logger.info(`Date filter - start date - ${startDate} - endDate - ${endDate}`);

  let [error, games] = await to(models.games.findAll({
    // get today played games
    where: { created_at: { [Op.gte]: startDate, [Op.lte]: endDate } },
    // group by user_id
    group: ["user_id"],
    // get today's max score of user and merge user details by alias/rename
    attributes: [[sequelize.col('user.name'), 'name'], [sequelize.col('user.email'), 'email'], [sequelize.col('user.phone'), 'phone'],[sequelize.fn('max', sequelize.col('score')), "highScore"]],
    // include user details
    include: [{
      model: models.users,
      as: 'user',
      attributes: []
    }],
    // order by high score  in descending order
    order: [[[sequelize.col("highScore"), "DESC"]]],
    // get raw data - this will give included data as user.name user.email etc.,
    raw: true
  }));
  if (error) return helper.logErrorAndRespond("downloadReportByDate  > ", error, reject);

  if(games.length === 0) return resolve({ status: 200, success: true,  message: "No games found" });

  games.forEach((game, index)=>{
    game.s_no = index + 1;
    game.date = date;
  });

  let fields = ["s_no", "date", "name", "email", "phone", "highScore"]

  // convert json object to csv file
  let [err, destination] = await to(helper.jsonToCsv(games, 'report', fields));
  if(err) return res.status(500).json({ success: false, message: "Something went wrong. Please try again after some time" });

  res.download(destination);

};

/**
 * validateGame - validate whether game play is valid or not
 * @param {STRING} start - start date
 * @param {STRING} end - end date
 * @param {INT} score - game score
 */
function validateGame(start, end, score) {
  console.log(start, end);
  // let difference = moment(end).diff(moment(start), "seconds");
  // console.log(difference);
  // if (difference < 5 || difference > 30) return false;
  if (score <= config.game.maxScore) return true;
  return false;
}
