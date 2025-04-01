const Promise = require('bluebird');
const monitor = require('@codefresh-io/cf-monitor');
const redis = require('redis');

class Redis {
    constructor() {
        this.client = undefined;
        this.redisInitialized = false;
    }

    /**
     * starts the connection to redis
     * @returns {*}
     */
    init(config) {
        const logger = require('cf-logs').Logger('codefresh:infra:redis'); // eslint-disable-line
        this.logger = logger;
        const deferred = Promise.defer();

        // TODO a fallback for case where redis is not up. should be removed once redis is fully used
        setTimeout(() => {
            deferred.resolve();
        }, 30000);

        this.client = redis.createClient({
            host: config.redis.url,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db,
            tls: config.redis.tls,
        });

        this.client.on('ready', () => {
            logger.info('Redis client ready');
            this.redisInitialized = true;
            deferred.resolve();
        });

        this.client.on('connect', () => {
            logger.info('Redis client connecting');
        });

        this.client.on('reconnecting', () => {
            logger.info('Redis client reconnecting');
        });

        this.client.on('error', (error) => {
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
        const logger = this.logger; // eslint-disable-line
        if (!this.redisInitialized) {
            return Promise.resolve();
        }

        const deferred = Promise.defer();

        this.client.on('end', () => {
            logger.info('Redis client ended');
            deferred.resolve();
        });

        this.client.quit();

        return deferred.promise;
    }
}

module.exports = new Redis();
