const router = require("express").Router(),
  to = require('await-to-js').to,
  basicAuth = require('express-basic-auth');

const authController = require("@controllers/auth"),
  gameController = require('@controllers/game');


// authentication for particular route to view report details
const staticUserAuth = basicAuth({
  users: {
    'admin': 'password'
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
 * /profile - update user profile
 */
router.post("/authenticate", async (req, res) => {
  let [error, response] = await to(authController.authenticate(req));
  if(error) return res.status(500).json({ success: false, message: 'Something went wrong' });
  if(response.status === 200) res.setHeader('Set-Cookie', `token=${response.token}; HttpOnly`);
  return res.status(response.status).json(response);
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

/**
 * /logout - logout
 */
router.get('/logout', (req, res)=>{
  res.setHeader("Set-Cookie", `token=; HttpOnly;`);
  res.json({ message: "Logout success" });
});


module.exports = router;
