const winston = require('winston'),
    WinstonCloudWatch = require('winston-cloudwatch');

const config = require('../../config');

winston.add(new WinstonCloudWatch({
  logGroupName: `game-be-${config.env}`,
  logStreamName: 'general',
  awsAccessKeyId: config.awsAccessKey,
  awsSecretKey: config.awsSecretKey,
  awsRegion: config.awsRegion
}));



module.exports = {
    error: function(message){
        winston.error(message)
    },
    info: function(message){
        winston.info(message)
    }
}
