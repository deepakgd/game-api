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

    let { id: user_id, store_name, high_score } = request.user;

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

    let newHighScore = null;


    // if(!isHacked){
    //   // update high score in  user table
    //   if (!high_score) newHighScore = score;
    //   if (score > high_score) newHighScore = score;

    //   if (newHighScore) {
    //     [error, response] = await to(models.users.update({ high_score: newHighScore }, { where: { id: user_id } }));
    //     if (error) return helper.logErrorAndRespond("update high score > ", error, reject);
    //   }
    // }

    return resolve({ success: true, status: 200, message: "Game saved successfully", highScore: newHighScore ? newHighScore : high_score, currentScore: score, });
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
      where: { created_at: { [Op.gte]: startDate, [Op.lte]: endDate } },
      include: [{
        model: models.users,
        as: 'user',
        attributes: ["id", "name", "email"]
      }],
      order: [
        ["score", "DESC"]
      ],
    }));
    if (error) return helper.logErrorAndRespond("get games  > ", error, reject);

    if(!date) return resolve({ status: 400, success: false,  message: "Date required" });

    if(games.length === 0) return resolve({ status: 200, success: true,  message: "No games found" });

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
 exports.downloadReport = async (req, res) =>{
  let store_name = req.query.region;

  if(!store_name) return res.status(400).json({ success: false, message: "Region required" });
  let attributes = [["id", "user_id"], "first_name", "last_name", "email", "phone", ["way_comm", "communicate_via"], "is_hacker", ["store_name", "region"], ["store_location", "store"], "high_score", ["created_at", "signup_date"], "utm_source", "utm_medium", "utm_campaign", "utm_content", "facebook", "whats_app", "messenger", "line", "twitter", "kakao", "copy"];

  if(store_name === "uae") attributes.push('country');
  else if(store_name === "ru") {
    attributes.push('coupon');
    attributes.push('ru_client');
  }
  // get report from database
  let [error, games] = await to(models.users.findAll({
    where: { store_name },
    include: [{
      as: 'games',
      model: models.games,
      required: false
    }],
    attributes: attributes
  }));
  if(error) {
      logger.error(`downloadReport > get reports > ${error.toString()}`);
      return res.status(500).json({ success: false, message: "Something went wrong. Please try again after some time" });
  }
  games = helper.sequelizeToJson('Array', games);

  if(games.length === 0) return res.json({ success: true, message: "No data found" });

  // mark currentuser for highlight in front end
  games = games.map((game, index)=>{
    game.game_count = game.games.length
    !!game.games && delete game.games;
    // !!game.is_hacker.toString() && delete game.is_hacker;
    !!game.updated_at && delete game.updated_at;
    return game;
  });

  // convert json object to csv file
  let [err, destination] = await to(helper.jsonToCsv(games, 'report'));
  if(err) return res.status(500).json({ success: false, message: "Something went wrong. Please try again after some time" });

  res.download(destination);

};



/**
 * downloadReport - download report from database
 */
 exports.downloadReportByDate = async (req, res) =>{

  let startDateTime = req.query.startDate;
  let endDateTime = req.query.endDate;
  let store_name = req.query.region;
  let attributes = [["id", "user_id"], "first_name", "last_name", "email", "phone", ["way_comm", "communicate_via"], "is_hacker", ["store_name", "region"], ["store_location", "store"],  "high_score", ["created_at", "signup_date"], "utm_source", "utm_medium", "utm_campaign", "utm_content", "facebook", "whats_app", "messenger", "line", "twitter", "kakao", "copy"];

  if(!startDateTime || !endDateTime || !store_name) return res.status(400).json({ success: false, message: "Region, start date and end date required" });
  startDateTime = Date.parse(startDateTime);
  endDateTime = Date.parse(endDateTime);

  if(store_name === 'uae') attributes.push('country');
  else if(store_name === "ru"){
    attributes.push('coupon');
    attributes.push('ru_client');
  }

  // Date.parse will return integer for true or return NaN for invalid date
  // to validate in if condition !!Date.parse we can use this will return true for valid return false for invalid
  // if invalid date return error message
  if(!!!startDateTime) return res.status(400).json({ success: false, message: "Invalid date. Date must be in YYYY-MM-DD format" });
  if(!!!endDateTime) return res.status(400).json({ success: false, message: "Invalid date. Date must be in YYYY-MM-DD format" });

  startDateTime = moment.utc(startDateTime);
  endDateTime = moment().utc(endDateTime).endOf('day');

  console.log(startDateTime, endDateTime);
  logger.info(`startDateTime - ${startDateTime} and endDateTime - ${endDateTime}`);

  // get report from database
  let [error, games] = await to(models.users.findAll({
    where: { store_name },
    include: [{
      as: 'games',
      model: models.games,
      where: { created_at: { [Op.gte]: startDateTime, [Op.lte]: endDateTime } },
    },
  ],
  attributes: attributes
  }));
  if(error) {
      logger.error(`downloadReport > get reports > ${error.toString()}`);
      return res.status(500).json({ success: false, message: "Something went wrong. Please try again after some time" });
  }

  if(games.length === 0) return res.json({ success: true, message: "No data found" });

  // return res.json(games)
  games = helper.sequelizeToJson('Array', games);

  // mark currentuser for highlight in front end
  games = games.map((game, index)=>{
    game.game_count = game.games.length
    !!game.games && delete game.games;
    // !!game.is_hacker.toString() && delete game.is_hacker;
    !!game.updated_at && delete game.updated_at;
    return game;
  });

  // convert json object to csv file
  let [err, destination] = await to(helper.jsonToCsv(games, 'report'));
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
