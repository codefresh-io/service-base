const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const internalServiceConfig = require('@codefresh-io/internal-service-config');
const { getRequestId, getAuthenticatedEntity } = require('@codefresh-io/http-infra');

const APPLICATION_DOMAIN = process.env.APP_DOMAIN || 'local.codefresh.io';

function findAppRoot(dir = path.dirname(require.main.filename)) {
    return !_.includes(dir, 'node_modules') && fs.existsSync(path.join(dir, 'package.json'))
        ? dir
        : findAppRoot(path.resolve(dir, '..'));
}

function getApproot() {
    if ((process.env.NODE_ENV === 'test')
        && (_.includes(__dirname, 'node_modules'))) {
        return path.resolve(__dirname).split('/node_modules')[0];
    }
    return findAppRoot();
}

const APP_ROOT = getApproot();
const SERVICE_CONFIG_PATH = path.join(APP_ROOT, 'service.config');
const PACKAGE_JSON_PATH = path.join(APP_ROOT, 'package.json');
const OPENAPI_JSON_PATH = path.join(APP_ROOT, 'openapi.json');

const packageJson = require(PACKAGE_JSON_PATH); // eslint-disable-line
let openapiJson;
if (fs.existsSync(OPENAPI_JSON_PATH)) {
    openapiJson = require(OPENAPI_JSON_PATH); // eslint-disable-line
}

const name = (openapiJson && openapiJson['x-service-name']) || packageJson.name.replace(/^@codefresh-io\//, '');

const base = {};

base.root = APP_ROOT;
base.env = process.env.NODE_ENV || 'kubernetes';
base.port = process.env.PORT || 9001;
base.name = name;
base.api = {
    url: process.env.API_URL || APPLICATION_DOMAIN,
    protocol: process.env.API_PROTOCOL || 'http',
};

base.eventbus = {
    uri: process.env.EVENTBUS_URI || (`amqp://${APPLICATION_DOMAIN}`),
    reconnectInterval: process.env.EVENTBUS_INTERVAL || 5,
    serviceName: name,
};

/** @type {import('pg').PoolConfig} */
base.postgres = {
    host: process.env.POSTGRES_HOST || APPLICATION_DOMAIN,
    port: Number.parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DATABASE || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: process.env.POSTGRES_SSL_ENABLE === 'true',
};

base.mongo = {
    uri: process.env.MONGO_URI || `mongodb://${APPLICATION_DOMAIN}/${name}`,
    /** @type {import('mongodb').MongoClientOptions} */
    options: {},
};

if (process.env.MTLS_CERT_PATH) {
    base.mongo.options.tls = true;
    base.mongo.options.tlsCertificateKeyFile = process.env.MTLS_CERT_PATH;
    base.mongo.options.tlsInsecure = process.env.MONGO_MTLS_VALIDATE === 'false';
}

base.logger = {
    filePath: process.env.LOGS_PATH || path.join(__dirname, '../../logs', 'kubernetes-logs.log'),
    console: true,
    handleExceptions: false,
    showNamespace: true,
    level: process.env.LOGGER_LEVEL || 'debug',
    consoleOptions: {
        stderrLevels: ['error'],
        timestamp() {
            return new Date().toISOString();
        },
        formatter(options) {
            // Return string will be passed to logger.
            const shouldFormatOutput = process.env.FORMAT_LOGS_TO_ELK === 'true';
            if (shouldFormatOutput) {
                return JSON.stringify({
                    metadata: Object.assign(options.meta || {}, { level: options.level }),
                    data: Object.assign(options.data || {}, { message: options.message }),
                });
            }
            // human readable format
            return `${options.timestamp()} ${options.level.toUpperCase()} >> `
                + `${options.message || ''}`
                + `${options.meta && Object.keys(options.meta).length ? ` << ${JSON.stringify(options.meta)}` : ''}`;
        },
    },
    basePath: null,
    baseNamespace: 'codefresh',
    fields: {
        service: process.env.SERVICE_NAME || 'service-base',
        time: () => new Date().toISOString(),
        correlationId: () => {
            try {
                return getRequestId();
            } catch (err) {
                return {};
            }
        },
        authenticatedEntity: () => {
            try {
                const authEntity = getAuthenticatedEntity().toJson({ partial: true });
                if (_.get(authEntity, 'activeAccount')) {
                    authEntity.activeAccount = _.omit(authEntity.activeAccount, 'features');
                }
                return authEntity;
            } catch (err) {
                return {};
            }
        },
    },
};

base.httpLogger = {
    level: process.env.HTTP_LOGGER_LEVEL || 'debug',
    format: 'dev',
};

base.newrelic = { license_key: process.env.NEWRELIC_LICENSE_KEY };

base.safe = { secret: process.env.SAFE_SECRET || 'secret' };

base.redis = {
    url: process.env.REDIS_URL || APPLICATION_DOMAIN,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || 'redisPassword',
    db: process.env.REDIS_DB || 1,
};

if (process.env.REDIS_TLS === 'true') {
    if (process.env.REDIS_CLIENT_CERT_PATH && process.env.REDIS_CA_PATH && process.env.REDIS_CLIENT_KEY_PATH) {
        const redisCaCredentials = fs.readFileSync(process.env.REDIS_CA_PATH);
        const redisCertCredentials = fs.readFileSync(process.env.REDIS_CLIENT_CERT_PATH);
        const redisKeyCredentials = fs.readFileSync(process.env.REDIS_CLIENT_KEY_PATH);
        _.set(base, 'redis.tls.ca', redisCaCredentials);
        _.set(base, 'redis.tls.cert', redisCertCredentials);
        _.set(base, 'redis.tls.key', redisKeyCredentials);
        // if not passing rejectUnauthorized -- default value set to true
        _.set(base, 'redis.tls.rejectUnauthorized', process.env.REDIS_REJECT_UNAUTHORIZED !== 'false');
    } else {
        base.redis.tls = {};
    }
}

// This timers are associated with termination signals the service should handle
// 1. The grace period should first of all know that no more requests will be forward to the process
// 2. Stop listening on the port
// 3. Finish all accepted request
// 4. Close connections to all core infrastructure services
// 5. Kill the process
base.gracePeriodTimers = {
    totalPeriod: ((process.env.GRACE_PERIOD || 30) * 1000) - 300,
    secondsToAcceptAdditionalRequests: (process.env.SECONDS_TO_ACCEPT_ADDITIONAL_REQUESTS || 3) * 1000,
    secondsToProcessOngoingRequests: (process.env.SECONDS_TO_PROCESS_ONGOING_REQUESTS || 20) * 1000,
    secondsToCloseInfraConnections: (process.env.SECONDS_TO_CLOSE_INFRA_CONNECTIONS || 5) * 1000,
    skipGraceTimersValidation: (process.env.SKIP_GRACE_TIMERS_VALIDATION || 'false') === 'true',
};

base.openapi = { dependenciesSpec: false };

_.merge(base, internalServiceConfig.services); // TODO deprecate use of this root level
base.services = internalServiceConfig.services;

const serviceConfig = require(SERVICE_CONFIG_PATH); // eslint-disable-line
_.merge(base, serviceConfig);

base.getConfigVal = function (key) { // eslint-disable-line
    return _.get(this, key);
}.bind(base);

base.getConfigArray = function (key) { // eslint-disable-line
    return _.flatten([_.get(this, key, [])]);
}.bind(base);

module.exports = base;
