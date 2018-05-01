'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const os = require('os');
const internalServices = require('@codefresh-io/internal-service-config');
const { getRequestId, getAuthenticatedEntity } = require('@codefresh-io/http-infra');

const APPLICATION_DOMAIN = process.env.APP_DOMAIN || 'local.codefresh.io';

function findAppRoot(dir = path.dirname(require.main.filename)) {
    return fs.existsSync(path.join(dir, 'package.json'))
        ? dir
        : findAppRoot(path.resolve(dir, '..'));
}
const appRoot = process.env.NODE_ENV === 'test' ? path.resolve(__dirname).split('/node_modules')[0] : findAppRoot();


const packageJson = require(path.join(appRoot, 'package.json'));

const name = packageJson.name.replace(/^@codefresh-io\//, '');

const base = {};

base.env  = process.env.NODE_ENV || 'kubernetes';
base.port = process.env.PORT || 9001;
base.name = name;
base.api  = {
    url: process.env.API_URL || APPLICATION_DOMAIN,
    protocol: process.env.API_PROTOCOL || 'http'
};

base.eventbus = {
    uri: process.env.EVENTBUS_URI || ('amqp://' + APPLICATION_DOMAIN),
    reconnectInterval: process.env.EVENTBUS_INTERVAL || 5,
    serviceName: name
};

base.postgres = {
    host: process.env.POSTGRES_HOST || APPLICATION_DOMAIN,
    database: process.env.POSTGRES_DATABASE || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
};

base.mongo = {
    uri: process.env.MONGO_URI || `mongodb://${APPLICATION_DOMAIN}/${name}`
};

base.logger = {
    filePath: process.env.LOGS_PATH || path.join(__dirname, '../../logs', 'kubernetes-logs.log'),
    console: true,
    handleExceptions: false,
    showNamespace: true,
    level: "debug",
    consoleOptions: {
        timestamp: function () {
            return new Date().toISOString();
        },
        formatter: function (options) {
            // Return string will be passed to logger.
            const shouldFormatOutput = process.env['FORMAT_LOGS_TO_ELK'] === 'true';
            if (shouldFormatOutput) {
                return JSON.stringify({
                    metadata: options.meta || {},
                    data: Object.assign(options.data || {}, { message: options.message }),
                });
            }
            // human readable format
            return `${options.timestamp()} ${options.level.toUpperCase()} >> ` +
            `${options.message || ''}` +
            `${options.meta && Object.keys(options.meta).length ? ` << ${JSON.stringify(options.meta)}` : ''}`;
        }
    },
    basePath: null,
    baseNamespace: "codefresh",
    fields: {
        service: process.env['SERVICE_NAME'] || 'service-base',
        time: () => { return new Date().toISOString(); },
        correlationId: () => {
            try {
                return getRequestId();
            } catch (err) {
                return {};
            }
        },
        authenticatedEntity: () => {
            try {
                const object = getAuthenticatedEntity().toJson({partial: true});
                return object;
            } catch (err) {
                return {};
            }
        },
    },
};

base.httpLogger = {
    level: process.env.HTTP_LOGGER_LEVEL || 'debug',
    format: 'dev'
};

base.newrelic = {
    license_key: process.env.NEWRELIC_LICENSE_KEY
};

base.safe = {
  secret: process.env.SAFE_SECRET || 'secret'
};

base.redis= {
    url: process.env.REDIS_URL || APPLICATION_DOMAIN,
    password: process.env.REDIS_PASSWORD || 'redisPassword',
    db: process.env.REDIS_DB || 1
};
_.merge(base, internalServices); // TODO deprecate use of this root level
base.services = internalServices;

const serviceConfig = require(path.join(appRoot, 'service.config'));

_.merge(base, serviceConfig);

base.getConfigVal = function(key) {
  return _.get(this, key);
}.bind(base);

base.getConfigArray = function(key) {
  return _.flatten([_.get(this, key, [])]);
}.bind(base);

module.exports = base;
