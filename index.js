'use strict';

let config = undefined;
try {
    config = require('./config');
} catch (err) {
    throw new Error(`Failed to prepare configuration: ${err.stack}`);
}

const service = require('./infra');
const httpInfra = require('@codefresh-io/http-infra');

module.exports = {
  initService: (initFn, options) => service.init(config, initFn, options),
  mongoClient: require('./infra/mongo'),
  redis: require('./infra/redis'),
  validation: require('./infra/validation'),
  makeEndpoint: require('./infra/express').makeEndpoint,
  encryption: require('./infra/encryption'),
  getAuthenticatedEntity: httpInfra.getAuthenticatedEntity,
  request: httpInfra.request,
  config
};
