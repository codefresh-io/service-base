'use strict';

const Promise = require('bluebird');
const logger = require('cf-logs').Logger('codefresh:infra:redis');
const redis = require('redis');

class Redis {

    constructor() {
        this.redisClient;
        this.redisInitialized = false;
    }

    /**
     * starts the connection to redis
     * @returns {*}
     */
    init(config) {

        var deferred = Promise.defer();

        //TODO a fallback for case where redis is not up. should be removed once redis is fully used
        setTimeout(() => {
            deferred.resolve();
        }, 30000);

        this.redisClient =
            redis.createClient({
                host: config.redis.url,
                password: config.redis.password,
                db: config.redis.db
            });

        this.redisClient.on('ready', () => {
            logger.info('Redis client ready');
            this.redisInitialized = true;
            deferred.resolve();
        });

        this.redisClient.on('connect', () => {
            logger.info('Redis client connected');
        });

        this.redisClient.on('reconnecting', () => {
            logger.info('Redis client reconnecting');
        });

        this.redisClient.on('error', (err) => {
            const error = new CFError({
                cause: err,
                message: 'Redis client error'
            });
            logger.error(error.message);
            monitor.noticeError(error);
        });

        return deferred.promise;

    }


    /**
     * stops the connection to redis
     * @returns {*}
     */
    stop() {
        if (!this.redisInitialized) {
            return Promise.resolve();
        }

        var deferred = Promise.defer();

        this.redisClient.on('end', () => {
            logger.info('Redis client ended');
            deferred.resolve();
        });

        this.redisClient.quit();

        return deferred.promise;
    }
}

module.exports = new Redis();
