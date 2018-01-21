'use strict';

const Promise   = require('bluebird');
const eventBus  = require('@codefresh-io/eventbus');
const monitor   = require('cf-monitor');
const logger    = require('cf-logs').Logger("codefresh:infra:eventbus");


class Eventbus {

    constructor() {
        this.eventbusInitialized = false;
    }

    /**
     * starts the connection to eventbus
     * @returns {*}
     */
    init(config) {
        return Promise.resolve()
            .then(() => {
                this.config = config;

                var deferred = Promise.defer();

                //TODO a fallback for case where rabbitmq is not up. should be removed once rabbitmq is fully used
                setTimeout(() => {
                    deferred.resolve(this);
                }, 30000);

                eventBus.init({
                    bus: {
                        url: this.config.eventbus.uri,
                        reconnectInterval: 5
                    },
                    store: {
                        host: this.config.postgres.host,
                        database: this.config.postgres.database,
                        user: this.config.postgres.user,
                        password: this.config.postgres.password
                    },
                    microServiceName: this.config.eventbus.serviceName
                });

                eventBus.on('ready', () => {
                    console.log('Eventbus ready');
                    this.eventbusInitialized = true;
                    deferred.resolve(this);
                });

                eventBus.on('error', (err) => {
                    const error = new Error(`Eventbus error: ${err.stack}`);
                    logger.error(error.stack);
                    monitor.noticeError(error);
                });

                return deferred.promise;
            })
    }


    /**
     * stops the connection to eventbus
     * @returns {*}
     */
    stop() {
        if (!this.eventbusInitialized) {
            return Promise.resolve();
        }

        var deferred = Promise.defer();

        eventBus.on('close', () => {
            logger.info('Eventbus client closed');
            deferred.resolve();
        });

        eventBus.quit();

        return deferred.promise;
    }

    subscribe(eventName, handler) {
        const listener = eventBus.subscribe(eventName, handler);
        listener.on('error', (err) => {
            logger.error(`${eventName} handler failed: ${err.stack}`);
            monitor.noticeError(err);
        });
        return listener
    }

}


module.exports = new Eventbus();
