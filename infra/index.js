"use strict";

const monitor = require('cf-monitor');
monitor.init();
const Promise       = require('bluebird'); // jshint ignore:line
const eventbus      = require('./eventbus');
const mongo         = require('./mongo');
const processEvents = require('./process-events');
const express       = require('./express');
const logging       = require('./logging');
const logger        = require('cf-logs').Logger('codefresh:infra:index');

class Microservice {

    constructor() {

    }

    init(config, initFn) {
        return logging.init(config)
            .then(() => {
                return processEvents.init(config)
                    .then(() => {
                        processEvents.on('SIGTERM', this.stop.bind(this));
                    });
            })
            .then(() => {
                return Promise.all([
                    mongo.init(config)
                ]);
            })
            .then(() => {
                return eventbus.init(config)
            })
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
    stop() {
        logger.info('Starting shutdown...');
        return Promise.all([
            eventbus.stop(),
            mongo.stop(),
            express.stop()
        ])
            .then(() => {
                logger.info('Shutdown completed, exiting');
            });
    }

}

module.exports = new Microservice();