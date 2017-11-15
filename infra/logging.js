'use strict';

const Promise = require('bluebird');
const logger  = require('cf-logs').Logger("codefresh");
const cflogs  = require('cf-logs');


class Logging {

    constructor() {

    }

    init(config) {
        return Promise.resolve()
            .then(() => {
                this.config = config;
                cflogs.init(this.config.logger);

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