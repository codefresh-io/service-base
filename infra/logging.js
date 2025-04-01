const Promise = require('bluebird');
const cflogs = require('cf-logs');
const { name: serviceName } = require('./config');

let logger;

class Logging {
    getLogger(namespace) { // eslint-disable-line
        return cflogs.Logger(`codefresh:${serviceName}${namespace ? `:${namespace}` : ''}`);
    }

    init(config) { // eslint-disable-line
        return Promise.resolve()
            .then(() => {
                cflogs.init(config.logger);
                logger = cflogs.Logger('codefresh');
                // override the default console.log
                console.log = (message) => {
                    logger.log('info', message);
                };
                console.error = (message) => {
                    logger.log('error', message);
                };
            });
    }

    stop() { // eslint-disable-line
        return Promise.resolve();
    }
}

module.exports = new Logging();
