

const monitor = require('cf-monitor');

monitor.init();
const Promise = require('bluebird'); // jshint ignore:line
const config = require('./config');
const eventbus = require('./eventbus');
const mongo = require('./mongo');
const processEvents = require('./process-events');
const express = require('./express');
const logging = require('./logging');
const redis = require('./redis');
const cflogs = require('cf-logs');

let logger;

class Microservice {
    constructor() {
        this._ready = false;
        this._healty = false;
    }

    isReady() {
        return this._ready;
    }

    isHealthy() {
        return this._healty;
    }

    markAsReady() {
        logger.info('Service marked as ready');
        this._ready = true;
    }

    markAsNotReady() {
        logger.info('Service marked as not ready');
        this._ready = false;
    }
    
    markAsHealthy() {
        logger.info('Service marked as healthy');
        this._healty = true;
    }
    
    markAsUnhealthy() {
        logger.info('Service marked as unhealthy');
        this._healty = false;
    }

    init(initFn) {
        const enabledComponents = config.getConfigArray('enabledComponents');
        const opt = {
            isReady: this.isReady.bind(this),
            isHealthy: this.isHealthy.bind(this),

        };
        return logging.init(config)
            .then(() => {
                logger = cflogs.Logger('codefresh:infra:index');
                let sigintCount = 0;
                return processEvents.init(config)
                    .then(() => {
                        processEvents.on('SIGTERM', () => this.stop(30000));
                        processEvents.on('SIGINT', () => {
                            if (sigintCount >= 1) {
                                process.exit();
                            } else {
                                sigintCount++; // eslint-disable-line
                                this.stop();
                            }
                        });
                    });
            })
            .then(() => (enabledComponents.includes('mongo')) && mongo.init(config))
            .then(() => (enabledComponents.includes('eventbus')) && eventbus.init(config))
            .then(() => (enabledComponents.includes('redis')) && redis.init(config))
            .then(eventBus => express.init(config, app => initFn(app, eventbus), opt)) // eslint-disable-line
            .then(() => {
                logger.info('Initialization completed');
                this.markAsReady();
                this.markAsHealthy();
            })
            .catch((err) => {
                console.error(`Initialization error: ${err.stack}`);
                process.exit(1);
            });
    }

    // TODO need to split shutdown process in to 2 phases.
    // - first phase need to make sure to not accept any new requests/events
    // - then a decent amount of time will be given to clear all on-going contexts
    // - second phase will close all dependencies connections like mongo, postgres etc
    stop() { // eslint-disable-line
        const enabledComponents = config.getConfigArray('enabledComponents');
        const gracePeriod = config.gracePeriodTimers.totalPeriod;
        
        // time in seconds to accept incoming request after marking as not ready
        const incomingHttpRequests = config.secondsToAcceptAdditionalRequests;
        
        // time in seconds to process all on going request
        const ongoingHttpRequest = config.secondsToProcessOngoingRequests;
        
        // time in seconds to close all connection to all infra-core services
        const infraDependencies = config.secondsToCloseInfraConnections;

        logger.info(`Starting shutdown... Timeout: ${gracePeriod}`);
        const promises = [];
        if (enabledComponents.includes('mongo')) {
            logger.info('About to stop mongo');
            promises.push(mongo.stop.bind(mongo));
        }
        if (enabledComponents.includes('eventbus')) {
            logger.info('About to stop eventbus');
            promises.push(eventbus.stop.bind(eventbus));
        }
        if (enabledComponents.includes('redis')) {
            logger.info('About to stop redis');
            promises.push(redis.stop.bind(redis));
        }
        return Promise
            .resolve()
            .then(() => {
                // Lets give another incomingHttpRequests seconds to accepts requests while the service is reporting no ready status
                this.markAsNotReady();
                return Promise.resolve()
                    .delay(incomingHttpRequests);
            })
            .then(() => {
                // Wait ongoingHttpRequest seconds to process all already accepted requests before stopping listening on port
                return Promise.resolve()
                    .delay(ongoingHttpRequest)
                    .then(() => express.stop());
            })
            .then(() => {
                // Stop all connections to infra services with timeout of infraDependencies seconds
                return Promise.resolve()
                    .then(() => Promise.all(promises))
                    .timeout(infraDependencies);
            })
            .timeout(gracePeriod) // die before we go killed
            .then(() => {
                logger.info('Shutdown completed, exiting');
                process.exit();
            })
            .catch((error) => {
                console.error(`error during shutdown: ${error.stack}`);
                process.exit();
            });
    }
}

module.exports = new Microservice();
