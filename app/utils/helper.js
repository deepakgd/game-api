const request = require('request'),
    AWS = require('aws-sdk'),
    to = require('await-to-js').to,
    path = require('path'),
    sequelize = require('sequelize'),
    Op = sequelize.Op,
    Json2csvTransform = require('json2csv').Transform,
    fs = require('fs'),
    sgMail = require('@sendgrid/mail'),
    querystring = require('querystring'),
    requestPromise = require('request-promise'),
    moment = require('moment-timezone');

const config = require('../../config'),
    models = require('../models'),
    logger = require('../utils/logger');


// set api key for sendgrid
sgMail.setApiKey(config.app_sendgrid_api_key);


var self = module.exports = {
    /**
     * upsert - Sequelize insert or update data
     * @param {STRING} - table - table name
     * @param {OBJECT} - condition - condition to find record
     * @param {OBJECT} - values - values to be inserted in the table
     */
    upsert: function(table, condition, values){
        return new Promise(async (resolve, reject)=>{
            let [error, data] = await to(models[table].findOne({ where: condition }));
            if(error) return reject(error);
            if(data){
                let [err, updatedData] = await to(data.update(values));
                if(err) return reject(err);
                return resolve(updatedData);
            }else{
                let [err, createdData] = await to(models[table].create(values));
                if(err) return reject(err);
                return resolve(createdData);
            }
        })
    },
    /**
     * validateEmail - return whether given email is valid or not
     * @param {STRING} - email address
     */
    validateEmail: function(email) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    },
    /**
     * validatePhone - return whether given phone is valid or not
     * @param {STRING} - email address
     */
    validatePhone: function(phone){
      let reg = /\+86\s[0-9]{11,13}/;
      return reg.test(phone);
    },
    /**
     * Helper function - to log error in console as well as in AWS cloud logs and also send something went wrong message to end user
     * @param {STRING} method
     * @param {OBJECT} error
     * @param {OBJECT} reject
     */
    logErrorAndRespond: function(method, error, reject){
        console.log(`Error > ${method} > ${error}`)
        logger.error(`Error > ${method} > ${error}`)
        return reject(error);
    },
    /**
     * bulkUpsert - bulk create or update based on condition field
     * @param {STRING} tableName
     * @param {ARRAY} data
     * @param {ARRAY} condition
     * @param {ARRAY} fields
     */
    bulkUpsert: function(tableName, data, condition, fields){
        return new Promise(async (resolve, reject) => {
            let [error, response] = await to(models[tableName].bulkCreate(data), {
                fields: fields,
                updateOnDuplicate: condition // like ["name"]
            });
            if(error) return self.logErrorAndRespond(`bulkUpsert > ${error}`);
            return resolve('done');
        });
    },
    /**
     * jsonToCsv - convert json data to csv file
     * @param {OBJECT} data
     * @param {STRING} filename
     * */
    jsonToCsv: function(data, filename){
        return new Promise((resolve, reject) => {
            fs.writeFile(`/tmp/${filename}.json`, JSON.stringify(data),'utf8', function(err){
                if(err) return reject(err);

                const transformOpts = { highWaterMark: 16384, encoding: 'utf-8' };
                let outputPath = `/tmp/${filename}.csv`;

                const input = fs.createReadStream(`/tmp/${filename}.json`, { encoding: 'utf8' });
                const output = fs.createWriteStream(outputPath, { encoding: 'utf8' });
                const json2csv = new Json2csvTransform();

                const processor = input.pipe(json2csv).pipe(output);

                // You can also listen for events on the conversion and see how the header or the lines are coming out.
                json2csv
                .on('header', header => console.log(header))
                .on('line', line => console.log(line))
                .on('error', err => reject(err))
                .on('finish', ()=> {
                    console.log('finish');
                    setTimeout(()=>{
                        return resolve(outputPath);
                    }, 2000);
                });
            });
        });
    },
    /**
     * sendMail - send mail using send grid
     *  @param {STRING} fromEmail - from addess
     *  @param {STRING} toEmail - to address
     *  @param {STRING} subject - mail subject
     *  @param {STRING} message - mail content
     *  @param {STRING} type - message type such as html or text
     *  @param {OBJECT} file - contains name, type and path of file
     */
    sendMail: function(fromEmail, toEmail, subject, message, type, file){
        return new Promise(async (resolve, reject)=>{
            let error, response, fileContent;
            const template = {
                from: fromEmail?fromEmail:config.fromEmail,
                to: toEmail,
                subject: subject,
                category: `Clarins Circle Square - ${config.env}`
            };

            console.log(template, config.app_sendgrid_api_key)

            // content type such as text or html
            if(type === "text") template.text = message;
            else template.html = message;

            // attachment exists
            if(file){
                console.log("Attachment exists...")
                console.log(file)
                if(file.path) fileContent = fs.readFileSync(file.path).toString("base64");
                else fileContent = file.data.toString("base64");

                template.attachments = [{
                    content: fileContent,
                    filename: file.name,
                    type: file.type,
                    disposition: "attachment"
                }];
            }

            [error, response] = await to(sgMail.send(template));
            if(error){
                console.log("Error part")
                logger.error(`Send mail failed. Error -> ${error}`);
                console.log(error);
                return reject(error);
            }

            logger.info(`Mail successs - ${response}`);
            return resolve('done');
        })
    },
    /**
     * iAmNotRobot - check whether current user is robot or human
     * @param {STRING} token - google recaptcha generated token from front end
     * @param {STRING} ip - end user ip address
     */
    iAmNotRobot: (token, ip) => {
        return new Promise(async (resolve, reject) => {
            let payload = querystring.stringify({
                secret: config.recaptcha.secretKey,
                response: token
            })

            if(ip) payload.remoteip = ip;

            let options = {
                method: "POST",
                uri: 'https://www.google.com/recaptcha/api/siteverify',
                body: payload,
                headers:{
                    "content-type": 'application/x-www-form-urlencoded'
                },
                json: true // Automatically stringifies the body to JSON
            }

            logger.info(`Google recaptcha payload - ${JSON.stringify(options)}`);

            let [error, response] = await to(requestPromise(options));
            if(error) return reject(error);
            console.log(response)
            logger.info(`Google recaptcha response - ${response}`);
            return resolve(response);
        })
    },
    /**
     * sequelizeToJson -  convert sequelize object to readable json format
     * @param {STRING} type  - Array/Single/undefined
     * @param {OBJECT} data - data to convert
     */
    sequelizeToJson: function(type, data){
        if(type === "Array") {
            data = data.map(item => item.toJSON());
            return data;
        }else return data.get({ plain: true });
    },
    /**
     * jsonToCsv - convert json data to csv file
     * @param {OBJECT} data
     * @param {STRING} filename
     * */
     jsonToCsv: function(data, filename, fields=null){
      return new Promise((resolve, reject) => {
          fs.writeFile(`/tmp/${filename}.json`, JSON.stringify(data),'utf8', function(err){
              if(err) return reject(err);

              const transformOpts = { highWaterMark: 16384, encoding: 'utf-8' };
              let outputPath = `/tmp/${filename}.csv`;

              const input = fs.createReadStream(`/tmp/${filename}.json`, { encoding: 'utf8' });
              const output = fs.createWriteStream(outputPath, { encoding: 'utf8' });
              const json2csv = new Json2csvTransform({fields});

              const processor = input.pipe(json2csv).pipe(output);

              // You can also listen for events on the conversion and see how the header or the lines are coming out.
              json2csv
              .on('header', header => console.log(header))
              .on('line', line => console.log(line))
              .on('error', err => reject(err))
              .on('finish', ()=> {
                  console.log('finish');
                  setTimeout(()=>{
                      return resolve(outputPath);
                  }, 2000);
              });
          });
      });
  },
}


/**
 * Print all message in console as well as in cloudwatch log
 * @param {STRING} message
 */
function logInfo(message){
    console.log("----------------------------")
    console.log(message)
    logger.info(`${message}`);
    console.log("----------------------------")
}

/**
 * Print all error message in console as well as in cloudwatch log
 * @param {STRING} error
 */
function logError(error){
    console.log(error);
    logger.error(`ERROR FROM > ${error}`);
    self.sendMail(null, config.reportEmail, `Error - ${config.env}`, error.toString(), 'text');
}
