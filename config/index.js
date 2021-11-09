require('dotenv').config();

const env = process.env.NODE_ENV;
const appUrl = process.env.APP_URL;

const config = {
  env: env,
  appUrl: appUrl,
  awsAccessKey: process.env.AWS_ACCESS_KEY,
  awsSecretKey: process.env.AWS_SECRET_KEY,
  awsRegion: process.env.AWS_REGION,
  app_sendgrid_api_key: process.env.SENDGRID_API_KEY,
  dbname: process.env.DB_DATABASE,
  dbUserName: process.env.DB_USERNAME,
  dbPassword: process.env.DB_PASSWORD,
  dbHost: process.env.DB_HOST,
  dbPort: process.env.DB_PORT,
  jwtSecret: 'AKIAJFV3H2GICSQM64RQ',
  appPort: process.env.APP_PORT,
  fromEmail: 'deepakgcsevpm@gmail.com',
  locales: ["en_US", "zh_CN"],
  timezone: "Asia/Shanghai", // utc + 8 hours is Asia/Shanghai
  reportEmail: '',
  game: {
    maxScore: 5000
  },
  recaptcha: {
    siteKey: '',
    secretKey: ''
  },
  allowedDomains: [
    "http://localhost:3000",
    "chrome-extension://aicmkgpgakddgnaphhhpliifpcfhicfo",
  ],
  leaderboardLimit: 10
};


switch (process.env.NODE_ENV) {
  case 'local':
    break
  case 'development':
    break
  case 'staging':
    break
  case 'production':
    break
  default:
    throw new Error("Unsupported environment:", process.env.NODE_ENV)
}

module.exports = config;
