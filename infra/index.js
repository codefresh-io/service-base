

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

class Microservice {
    constructor() {
        this._ready = false;
        this._healthy = false;
    }

    isReady() {
        return this._ready;
    }

    isHealthy() {
        return this._healthy;
    }

    markAsReady() {
        this.logger.info('Service marked as ready');
        this._ready = true;
    }

    markAsNotReady() {
        this.logger.info('Service marked as not ready');
        this._ready = false;
    }

    markAsHealthy() {
        this.logger.info('Service marked as healthy');
        this._healthy = true;
    }

    markAsUnhealthy() {
        this.logger.info('Service marked as unhealthy');
        this._healthy = false;
    }

    init(initFn, stopFn) {
        const enabledComponents = config.getConfigArray('enabledComponents');
        const opt = {
            isReady: this.isReady.bind(this),
            isHealthy: this.isHealthy.bind(this),

        };
        return logging.init(config)
            .then(() => {
                this.logger = cflogs.Logger('codefresh:infra:index');
                let sigintCount = 0;
                this._validateGraceTimers();
                return processEvents.init(config)
                    .then(() => {
                        processEvents.on('SIGTERM', () => this.stop(stopFn));
                        processEvents.on('SIGINT', () => {
                            if (sigintCount >= 1) {
                                process.exit();
                            } else {
                                sigintCount++; // eslint-disable-line
                                this.stop(stopFn);
                            }
                        });
                    });
            })
            .then(() => (enabledComponents.includes('mongo')) && mongo.init(config))
            .then(() => (enabledComponents.includes('eventbus')) && eventbus.init(config))
            .then(() => (enabledComponents.includes('redis')) && redis.init(config))
            .then(eventBus => express.init(config, app => initFn(app, eventbus), opt)) // eslint-disable-line
            .then(() => {
                this.logger.info('Initialization completed');
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
    stop(shutdownFunction) { // eslint-disable-line
        const enabledComponents = config.getConfigArray('enabledComponents');
        const gracePeriod = config.gracePeriodTimers.totalPeriod;

        // time in seconds to accept incoming request after marking as not ready
        const incomingHttpRequests = config.gracePeriodTimers.secondsToAcceptAdditionalRequests;

        // time in seconds to process all on going request
        const ongoingHttpRequest = config.gracePeriodTimers.secondsToProcessOngoingRequests;

        // time in seconds to close all connection to all infra-core services
        const infraDependencies = config.gracePeriodTimers.secondsToCloseInfraConnections;

        this.logger.info(`Starting shutdown... Timeout: ${gracePeriod}`);
        const promises = [];
        if (enabledComponents.includes('mongo')) {
            this.logger.info('About to stop mongo');
            promises.push(mongo.stop.bind(mongo));
        }
        if (enabledComponents.includes('eventbus')) {
            this.logger.info('About to stop eventbus');
            promises.push(eventbus.stop.bind(eventbus));
        }
        if (enabledComponents.includes('redis')) {
            this.logger.info('About to stop redis');
            promises.push(redis.stop.bind(redis));
        }
        return Promise
            .resolve()
            .then(() => {
                this.markAsNotReady();
                this.logger.info(`Waiting more ${incomingHttpRequests} ms to accept more request`);
                return Promise.resolve()
                    .delay(incomingHttpRequests);
            })
            .then(() => {
                this.logger.info(`Waiting more ${ongoingHttpRequest} ms to process all ongoing requests`);
                return Promise.resolve()
                    .delay(ongoingHttpRequest)
                    .then(() => express.stop());
            })
            .then(() => {
                this.logger.info(`Setting up ${infraDependencies} ms to finish all core service connections timeout`);
                return Promise.resolve()
                    .then(() => Promise.all(promises))
                    .timeout(infraDependencies);
            })
            .then(() => {
                if (shutdownFunction) {
                    this.logger.info('Execute shutdown custom function');
                    shutdownFunction();
                }
            })
            .timeout(gracePeriod)
            .then(() => {
                this.logger.info('Shutdown completed, exiting');
                process.exit();
            })
            .catch((error) => {
                console.error(`error during shutdown: ${error.stack}`);
                process.exit();
            });
    }

    _validateGraceTimers() { // eslint-disable-line
        const gracePeriod = config.gracePeriodTimers.totalPeriod;
        const incomingHttpRequests = config.gracePeriodTimers.secondsToAcceptAdditionalRequests;
        const ongoingHttpRequest = config.gracePeriodTimers.secondsToProcessOngoingRequests;
        const infraDependencies = config.gracePeriodTimers.secondsToCloseInfraConnections;

        if (gracePeriod < (incomingHttpRequests + ongoingHttpRequest + infraDependencies)) {
            const message = `Total grace period: ${gracePeriod}, the service needs at least ${incomingHttpRequests + ongoingHttpRequest + infraDependencies} to perform graceful shuwdown. Check service configuration`; // eslint-disable-line
            if (!config.gracePeriodTimers.skipGraceTimersValidation) {
                this.logger.warn(message);
            } else {
                throw new Error(message);
            }
        }
    }
}

module.exports = new Microservice();
