const router = require("express").Router(),
  to = require('await-to-js').to,
  basicAuth = require('express-basic-auth');

const authController = require("@controllers/auth"),
  gameController = require('@controllers/game');


// authentication for particular route to view report details
const staticUserAuth = basicAuth({
  users: {
    'admin': 'krds@krds@123'
  },
  challenge: true
});


/**
 * / - show home page
 */
router.get("/", (req, res) => {
  return res.render('index');
});


/**
 * /signin - validate and create jwt token based on name and phone/email
 */
 router.post("/signin", async (req, res) => {
  let [error, response] = await to(authController.login(req));
  if(error) return res.status(500).json({ success: false, message: 'Something went wrong' });

  let data = { success: (response.status === 200)?true:false, message: response.message, isNewUser: response.isNewUser }
  if(response.status === 200) res.setHeader('Set-Cookie', `token=${response.token}; HttpOnly`);
  if(response.status === 200 && response.user) data = Object.assign(data, response.user);
  return res.status(response.status).json(data);
});

/**
 * /profile - update user profile
 */
router.put("/profile", authController.validate, async (req, res) => {
  let [error, response] = await to(authController.signUp(req));
  if(error) return res.status(500).json({ success: false, message: 'Something went wrong' });
  return res.status(response.status).json({ success: (response.status === 200)?true:false, message: response.message, coupon: response.coupon });
});


/**
 * /profile - update user profile
 */
 router.get("/profile", authController.validate, async (req, res) => {
  let [error, response] = await to(authController.profile(req));
  if(error) return res.status(500).json({ success: false, message: 'Something went wrong' });
  let data = { success: (response.status === 200)?true:false, message: response.message };
  if(response.success && response.user) data = Object.assign(data, response.user);
  return res.status(response.status).json(data);
});


/**
 * /save - validate and save game
 */
 router.post("/save", authController.validate, async (req, res) => {
  let [error, response] = await to(gameController.save(req));
  if(error) return res.status(500).json({ success: false, message: 'Something went wrong' });
  return res.status(response.status).json(response);
});


/**
 * /showscore - show user scores and rank details
 */
 router.get("/showscore", authController.validate, async (req, res) => {
  let [error, response] = await to(gameController.showScore(req));
  if(error) return res.status(500).json({ success: false, message: 'Something went wrong' });
  return res.status(response.status).json({ success: (response.status === 200)?true:false, message: response.message, data: response.data });
})


/**
 * /leaderboard - show user scores and rank details
 */
 router.get("/leaderboard", (req, res, next) => authController.validate(req, res, next, true), async (req, res) => {
  let [error, response] = await to(gameController.leaderboard(req));
  if(error) return res.status(500).json({ success: false, message: 'Something went wrong' });
  return res.status(response.status).json({ success: (response.status === 200)?true:false, message: response.message, data: response.data, redirect: response.redirect });
})


/**
 * /report/download - download report by start date and end date
 */
 router.get("/report/download", staticUserAuth, async (req, res) => {
  gameController.downloadReportByDate(req, res);
});


module.exports = router;
