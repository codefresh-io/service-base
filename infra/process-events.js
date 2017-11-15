'use strict';

const EventEmitter = require('events');
const Promise      = require('bluebird');
const redis        = require('redis');
const logger       = require('cf-logs').Logger('codefresh:infra:process-events');

class ProcessEvents extends EventEmitter {

    constructor() {
        super();
    }

    /**
     * starts listening on process events
     * @param config
     */
    init(config) {
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
