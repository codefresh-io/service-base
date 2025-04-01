const EventEmitter = require('events');
const Promise = require('bluebird');

class ProcessEvents extends EventEmitter {
    /**
     * starts listening on process events
     * @param config
     */
    init(config) {
        const logger = require('cf-logs').Logger('codefresh:infra:process-events'); // eslint-disable-line
        return Promise.resolve()
            .then(() => {
                this.config = config;

                // graceful shutdown
                process.on('SIGTERM', () => {
                    logger.info('SIGTERM received');
                    this.emit('SIGTERM');
                });

                process.on('SIGINT', () => {
                    logger.info('SIGINT received');
                    this.emit('SIGINT');
                });

                process.on('unhandledRejection', (err) => {
                    logger.error(`Unhandled rejection ${err.stack}`);
                });

                process.on('uncaughtException', (err) => {
                    logger.error(`Uncaught Exception: ${err.stack}`);
                });
            });
    }
}

module.exports = new ProcessEvents();
