'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const os = require('os');
const internalServices = requie('@codefresh-io/internal-service-config')

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
    url: process.env.API_URL || 'codefresh.dev',
    protocol: process.env.API_PROTOCOL || 'http'
};

base.eventbus = {
    uri: process.env.EVENTBUS_URI || 'amqp://codefresh.dev',
    reconnectInterval: process.env.EVENTBUS_INTERVAL || 5,
    serviceName: name
};

base.postgres = {
    host: process.env.POSTGRES_HOST || 'codefresh.dev',
    database: process.env.POSTGRES_DATABASE || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
};

base.mongo = {
    uri: process.env.MONGO_URI || `mongodb://codefresh.dev/${name}`
};

base.logger = {
    filePath: process.env.LOGS_PATH || path.join(__dirname, '../../logs', 'kubernetes-logs.log'),
    console: true,
    handleExceptions: false,
    showNamespace: true,
    env_module: `${name}_${os.hostname()}`,
    showRequestId: true,
    level: "debug",
    consoleOptions: {
        timestamp: function () {
            return new Date().toISOString();
        },
        formatter: function (options) {
            // Return string will be passed to logger.
            return options.timestamp() + ' ' + options.level.toUpperCase() + ' >> ' +
                   (undefined !== options.message ? options.message : '') +
                   (options.meta && Object.keys(options.meta).length ?
                   ' << ' + JSON.stringify(options.meta) : '' );
        }
    },
    basePath: null,
    baseNamespace: "codefresh"
};

base.httpLogger = {
    level: process.env.HTTP_LOGGER_LEVEL || 'debug',
    format: 'dev'
};

base.newrelic = {
    license_key: process.env.NEWRELIC_LICENSE_KEY
};

base.redis= {
    url: process.env.REDIS_URL || 'codefresh.dev',
    password: process.env.REDIS_PASSWORD || 'redisPassword',
    db: process.env.REDIS_DB || 1
};

_.merge(base,internalServices);

require(path.join(appRoot, 'config', base.env))(base);


module.exports = base;
