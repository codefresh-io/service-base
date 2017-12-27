'use strict';

const service = require('./infra');
const {getAuthenticatedEntity, request} = require('@codefresh-io/http-infra');

module.exports = {
  initService: service.init.bind(service),
  mongoClient: require('./infra/mongo'),
  redis: require('./infra/redis'),
  validation: require('./infra/validation'),
  makeEndpoint: require('./infra/express').makeEndpoint,
  encryption: require('./infra/encryption'),
  getAuthenticatedEntity,
  request,
  config: require('./infra/config')
};
