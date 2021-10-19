const express = require('express'),
  app = express(),
  path = require('path'),
  bodyParser = require('body-parser'),
  cors = require('cors'),
  cookieParser = require('cookie-parser'),
  helmet = require("helmet");

const routes = require('./app/routes'),
  logger = require('./app/utils/logger'),
  config = require('./config'),
  modelAssociations = require('./app/modelAssociations');

modelAssociations();

app.use(express.static(path.join(__dirname, 'public')));
// view engine setup
app.set('views', path.join(__dirname+'/app', 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({ limit: "200kb" }));
app.use(bodyParser.urlencoded({ extended: false, limit: "200kb" }));

app.use(cors({
  origin: function (origin, callback) {
    // bypass the requests with no origin (like curl requests, mobile apps, etc )
    if (!origin) return callback(null, true);

    if (config.allowedDomains.indexOf(origin) === -1) {
      let error = new Error(`This site ${origin} does not have an access. Only specific domains are allowed to access it.`);
      error.statusCode = 403;
      return callback(error, false);
    }
    return callback(null, true);
  }
}));
// app.use(cors());
app.use(cookieParser())
app.use(helmet.hidePoweredBy());


app.use('/', routes);

logger.info("App started");
logger.info(`Port - ${config.appPort}`)

app.listen(3000, '0.0.0.0', function() {
   console.log('listening on *:3000');
   logger.info("listening on *:3000");
});
