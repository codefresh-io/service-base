'use strict';

let config = undefined
try {
    config = require('./config');
} catch (err) {
    throw new Error(`Failed to prepare configuration: ${err.stack}`);
}

const service = require('./infra');

module.exports = {
  initService: (initFn) => service.init(config, initFn),
  mongoClient: require('./infra/mongo'),
  redis: require('./infra/redis'),
  validation: require('./infra/validation'),
  makeEndpoint: require('./infra/express').makeEndpoint,
  encryption: require('./infra/encryption'),
  getAuthenticatedEntity: require('@codefresh-io/http-infra').getAuthenticatedEntity,
  config
};
