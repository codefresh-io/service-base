'use strict';

const Promise   = require('bluebird');
const eventBus  = require('@codefresh-io/eventbus');
const monitor   = require('cf-monitor');
const CFError   = require('cf-errors');
class Eventbus {

    constructor() {
        this.eventbusInitialized = false;
    }

    /**
     * starts the connection to eventbus
     * @returns {*}
     */
    init(config) {
        const logger = require('cf-logs').Logger("codefresh:infra:eventbus");
        this.logger = logger;
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
                    logger.info('Eventbus ready');
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
        const logger = this.logger;
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
      const logger = this.logger;
      return eventBus.subscribe(eventName, handler)
        .then((listener) => {
          logger.info(`Listening on event ${eventName}`);
          listener.on('error', (err) => {
            logger.error(`${eventName} handler failed: ${err.stack}`);
            monitor.noticeError(err);
            return listener;
          });
        });
    }

    publish(eventName, data, returnPromise = false) {
        const logger = this.logger;

        logger.debug(`publishing event: ${eventName}`);
        const promise = eventBus.publish(eventName, data);

        if (returnPromise) {
            return promise;
        } else {
            promise
                .then(() => {
                    logger.debug(`event: ${eventName} published successfully`);
                })
                .catch((err) => {
                    const error = new CFError({
                        cause: err,
                        message: `Failed to publish event ${name}`
                    });
                    logger.error(error.stack);
                    monitor.noticeError(error);
                });
        }
    }

}


module.exports = new Eventbus();
