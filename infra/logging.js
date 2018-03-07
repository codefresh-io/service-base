'use strict';

const Promise = require('bluebird');
const cflogs  = require('cf-logs');
let logger;

class Logging {

    constructor() {

    }

    init(config) {
        return Promise.resolve()
            .then(() => {
                cflogs.init(config.logger);
                logger = cflogs.Logger("codefresh");
                // override the default console.log
                console.log   = function (message) {
                    logger.log('info', message);
                };
                console.error = function (message) {
                    logger.log('error', message);
                };
            });
    }

    stop() {
        return Promise.resolve();
    }
}


module.exports = new Logging();