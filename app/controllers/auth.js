const to = require('await-to-js').to,
    _ = require('lodash'),
    jwt = require('jwt-simple'),
    { Op } = require("sequelize"),
    requestPromise = require("request-promise");

const config = require('@config'),
    helper = require('@utils/helper'),
    logger = require('@utils/logger'),
    models = require('@models');

const jwtSecret = config.jwtSecret;

module.exports = {
    /**
     * formOne - validate username, password and return jwt token
     * @param {OBJECT} credential - contains username and password
     */
     login: function(request){
        return new Promise(async (resolve, reject) => {
            let { phone, email } = request.body;
            let isNewUser = false, user;
            phone ? phone = phone.toString(): null;

            // validation
            let validation = signinValidation(request.body);
            if(!validation.success) return resolve(validation);

            // get user by email/phone
            let [error, response] = await to(getUser(email, phone));
            if(error) return helper.logErrorAndRespond('signin > getuser > ', error, reject);

            if(!response.success) return resolve(response);
            user = response.user;

            if(!user) {

              let [e, newuser] = await to(models.users.create({
                email: email || "",
                phone: phone || "",
              }));
              if(e) return helper.logErrorAndRespond('signin > create new user > ', e, reject);
              user = newuser;
              isNewUser = true;
            }

            // get user and format it
            [error, user] = await to(getUserAndFormat(user.id));
            if(error) return helper.logErrorAndRespond('signin > getUserAndFormat > ', error, reject);


            // create token and send it
            let payload = { id: user.id, email: email, phone: phone };
            let token = jwt.encode(payload, jwtSecret);
            // resolve({ status: 200, message: 'Login success', token, isNewUser, user });
            resolve({ status: 200, message: 'Login success', token, user });
        });
    },
    /**
     * formTwo - validate and update profile information
     * @param {OBJECT} credential - contains username and password
     */
    signUp: function(request){
      return new Promise(async (resolve, reject) => {
        let { name, email = "", phone = "", isSubscribe: is_subscribe } = request.body;
        let error, response, user_id;

        // validation
        let validate = signupValidation(request.body);
        if(!validate.success) return resolve(validate);

        // user already exists validation
        [error, response] = await to(checkUserExists(phone, email));
        if(error) return helper.logErrorAndRespond('checkuserexists > ', error, reject);

        if(!response.success) return resolve(response);

        if(!response.user){
            // update user details
            let [err, newUser] = await to(models.users.create({
              name,
              email,
              phone,
              is_subscribe
            }));
            if(err) return helper.logErrorAndRespond('signup > update user > ', err, reject);
            user_id = newUser.id;
        }else user_id = response.user.id;

        console.log("user_id is ", user_id);
       
        // create token and send it
        let payload = { id: user_id, email: email ? email : response.user?.email, phone: phone ? phone:response.user?.phone };
        let token = jwt.encode(payload, jwtSecret);
        // resolve({ status: 200, message: 'Login success', token, isNewUser, user });
        resolve({ status: 200, message: 'Login success', token, user: payload });
      });
    },
    /**
     * validate - validate whether given token is authorized or not
     * @param {OBJECT} req - contains headers, body and etc.,
     * @param {OBJECT} res - contains response fields
     * @param {FUNCTION} next - next function like callback
     * @param {BOOLEAN} isAllowed - special way - public leaderboard visit
     */
    validate: async function(req, res, next, isAllowed=false){

      console.log('Cookies: ', req.cookies.token)
      logger.info('Cookies: ', req.cookies.token)

        // Cookies that have been signed
        // server side validation
        if(!req.cookies.token && !isAllowed) return res.status(401).json({ success: false, message: "Authentication required" });
        
        // allow user to access 
        if(!req.cookies.token && isAllowed) return next();

        let token = req.cookies.token
        // let token = req.headers.authorization.replace('Bearer ', '');
        // if(!token) return res.status(401).json({ success: false, message: "Invalid token" });

        // decode token
        let data = decodeJwtToken(token);
        if(!data.success) return res.status(403).json({ success: false, message: "Invalid token" });

        // verify
        // let [error, user] = await to(models.users.findOne({ where: { id: data.id, email: data.email, phone: data.phone, store_name: data.store_name } }));
        let [error, user] = await to(models.users.findOne({ where: { id: data.id } }));
        if(error) {
            logger.error(`validate > user token > ${error.toString()}`);
            return error;
        }
        if(!user) return res.status(403).json({ success: false, message: "Invalid token" });
        user = user.get({ plain: true });

        // success - bind user data and open gate
        req.user = user;
        next();
    },
    /**
     * verify - google recaptcha verification
     * @param {OBJECT} req - contains request info such as header body
     * @param {OBJECT} res - contains response object
     * @param {FUNCTION} next - next function like callback invoke callback function
     */
    verify: async function(req, res, next){
        // disable google recaptcha
        return next();
        console.log("google verify", req.body.token);
        logger.info("google verify", req.body.token);

        // bypass google recaptcha in postman only for dev use
        if(config.env === "local" && req.body.krdsbypass) return next();

        // required validation
        if(!req.body.token) {
            logger.error("Token required to verify google recaptcha")
            return res.status(400).json({ success: false, message: "Token required to verify google recaptcha" });
        };

        // google recaptcha v2 invisible check
        let [error, isRobot] = await to(helper.iAmNotRobot(req.body.token));
        if(error) {
            logger.error(`Google recaptcha error > ${error}`);
            return res.status(500).json({ success: false, message: "Google Recaptcha error" });
        }

        if(!isRobot.success) {
            logger.error(`Google recaptcha deny response > ${JSON.stringify(isRobot)}`);
            return res.status(403).json({ success: false, message: "Google Recaptcha blocked you" });
        }
        // google recaptcha passed
        next();
    },
     /**
     * profile - get user profile
     * @param {OBJECT} request
     */
    profile: function(request){
      return new Promise(async (resolve, reject) => {
        let [error, user] = await to(getUserAndFormat(request.user.id));
        if(error) return helper.logErrorAndRespond('profile > getUserAndFormat > ', error, reject);
        // user.isNewUser =  user.highScore ? false: true;
        resolve({ success: true, status: 200, user },)
      })
    }
};

/**
 * signinValidation - required and type validation
 * @param {OBJECT} data - request body
 */
function signinValidation(data){
    console.log(data)
    let { email, phone } = data;
    phone ? phone = phone.toString(): null;
    if(!phone && !email) return { success: false, status: 400, message: "phone or email required" };
    if(email && !helper.validateEmail(email)) return { success: false, status: 400, message: "Invalid email address" };
    if(phone && phone.toString().length < 11) return { success: false, status: 400, message: "Invalid phone number" };
    return { success: true };
}


/**
 * signupValidation - required and type validation
 * @param {OBJECT} data - request body
 */
function signupValidation(data){
  let { name, email, phone = "", isSubscribe: is_subscribe } = data;
  if(!email || !phone) return { success: false, status: 400, message:  "Phone and Email required" };
  if(email && !helper.validateEmail(email)) return { success: false, status: 400, message: "Invalid email address" };
  if(phone && phone.toString().length < 11) return { success: false, status: 400, message: "Invalid phone number" };
  return { success: true };
}

/**
 * checkModification - check email or phone number modified
 * @param {OBJECT} user
 * @param {STRING} phone
 * @param {STRING} email
 * @returns
 */
function checkModification(user, phone, email){
  return new Promise(async (resolve, reject) => {
    if(phone && user.phone && user.phone != phone.toString()) return { success: false, status: 400, message: "Cannot modify phone number" };

    if(email && user.email && user.email != email) return { success: false, status: 400, message: "Cannot modify email address" };

    return { success: true };
  })
}

/**
 * checkUserExists - check user already exits
 * @param {STRING} phone
 * @param {STRING} email
 * @returns
 */
function checkUserExists(phone, email){
  return new Promise(async (resolve, reject) => {
    let [error, user] = await to(models.users.findOne({ 
      attributes: ["id", "name", "email", "phone"],
      where: { 
        [Op.or]: [
          { email: email },
          { phone: phone }
        ]
      },
    }));
    if(error) return reject(error);
    console.log("user->", user);
    if(!user) return resolve({ success: true, user: null });

    // user already registered but email/phone mismatch
    if(user.email != email) return resolve({ success: false, status: 400, message: "email_invalid" });
    if(user.phone != phone) return resolve({ success: false, status: 400, message: "phone_invalid" });
  
    return resolve({ success: true, user })
  });
}

/**
 * getUser - get user by store name, email or phone number
 * @param {STRING} email
 * @param {STRING} phone
 */
function getUser(email, phone){
    return new Promise(async (resolve, reject) => {
      let isBoth = (email && phone) ? true : false, error, user, response;
      let condition = {
          where: {  }
      }
      // constructing query condition
      if(isBoth){
        condition.where.email = email;
        condition.where.phone = phone;
      }else if(email) condition.where.email = email;
      else condition.where.phone = phone;

      // get user from database
      [error, user] = await to(models.users.findOne(condition));
      if(error) return helper.logErrorAndRespond('getUser > find one > ', error, reject);
      if(!user) {
        if(isBoth){

          // get user by email
          [error, response] = await to(getUser(email));
          if(error) return helper.logErrorAndRespond('getUser > find one email> ', error, reject);

          // user exists dont allow becuase email and phone mismatch
          if(response && response.user) return resolve({ success: false, status: 400, message: "email_registered" });

          // get user by phone
          [error, response] = await to(getUser(undefined, phone));
          if(error) return helper.logErrorAndRespond('getUser > find one phone > ', error, reject);

          // user exists dont allow becuase email and phone mismatch
          if(response && response.user) return resolve({ success: false, status: 400, message: "phone_registered" });
          return resolve({ success: true, user: null, status: 200 });

        }

        // else part
        logger.error(`User not found - ${JSON.stringify(condition)}`);
        return resolve({ success: true, user: null, status: 200 });
      }

      user = user.get({ plain: true });
      return resolve({ success: true, user, status: 200});
    });
}

/**
 * decodeJwtToken - decode jwt token and return data
 * @param {STRING} token
 */
function decodeJwtToken(token){
    try{
        // decode token
        let data = jwt.decode(token, jwtSecret);
        return Object.assign({ success: true }, data);
    }catch(e){
        console.log(e);
        return { success: false, error: e.toString() };
    }
}


/**
 * getUserAndFormat - get user from db and format response
 * @param {Number} id
 * @returns
 */
function getUserAndFormat(id){
  return models.users.findOne({
    where: { id },
    attributes: ["id", "name", "email", "phone"],
    raw: true,
  });
}
