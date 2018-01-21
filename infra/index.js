"use strict";

const _ = require('lodash')
const monitor = require('cf-monitor');
monitor.init();
const Promise       = require('bluebird'); // jshint ignore:line
const config        = require('./config');
const eventbus      = require('./eventbus');
const mongo         = require('./mongo');
const processEvents = require('./process-events');
const express       = require('./express');
const logging       = require('./logging');
const redis         = require('./redis');
const logger        = require('cf-logs').Logger('codefresh:infra:index');

class Microservice {

    constructor() {

    }

    init(initFn) {

        const enabledComponents = config.getConfigArray('enabledComponents');

        return logging.init(config)
            .then(() => {
                return processEvents.init(config)
                    .then(() => {
                        processEvents.on('SIGTERM', this.stop.bind(this));
                        processEvents.on('SIGINT', () => this.stop(2000).then(() => process.exit()));
                    });
            })
            .then(() => (enabledComponents.includes('mongo')) && mongo.init(config))
            .then(() => eventbus.init(config)
            .then(() => (enabledComponents.includes('redis')) && redis.init(config))
            .then((eventBus) => {
                return express.init(config, (app) => initFn(app, eventbus));
            })
            .then(() => {
                console.log(`Initialization completed`);
            })
            .catch((err) => {
                console.error(`Initialization error: ${err.stack}`);
                process.exit(1);
            })
            .done();
    }

    // TODO need to split shutdown process in to 2 phases.
    // - first phase need to make sure to not accept any new requests/events
    // - then a decent amount of time will be given to clear all on-going contexts
    // - second phase will close all dependencies connections like mongo, postgres etc
    stop(timeout) {
        logger.info('Starting shutdown...');
        let shutdownPromise = Promise.all([
            eventbus.stop(),
            mongo.stop(),
            express.stop(),
            redis.stop(),
        ])
            .then(() => {
                logger.info('Shutdown completed, exiting');
            });

        shutdownPromise =  timeout ? shutdownPromise.timeout(timeout) : shutdownPromise

        return shutdownPromise.catch(error => {
          console.log(`error during shutdown: ${error}`);
        });
    }

}

module.exports = new Microservice();
