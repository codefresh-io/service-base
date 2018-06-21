

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
        this._ready = true;
    }

    markAsNotReady() {
        this._ready = false;
    }

    markAsHealthy() {
        this._healty = true;
    }

    markAsUnhealthy() {
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
                return processEvents.init(config)
                    .then(() => {
                        processEvents.on('SIGTERM', () => this.stop(30000));
                        processEvents.on('SIGINT', () => this.stop());
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
    stop(timeout = 15000) { // eslint-disable-line
        const enabledComponents = config.getConfigArray('enabledComponents');
        logger.info(`Starting shutdown... Time to finish: ${timeout}`);
        this.markAsNotReady();
        return Promise.all([
            enabledComponents.includes('mongo') && mongo.stop(timeout),
            enabledComponents.includes('eventbus') && eventbus.stop(timeout),
            enabledComponents.includes('redis') && redis.stop(timeout),
        ])
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
