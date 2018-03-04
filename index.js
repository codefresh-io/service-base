'use strict';

const config = require('./infra/config');
const service = require('./infra');
const {getAuthenticatedEntity, request} = require('@codefresh-io/http-infra');
const Promise = require('bluebird');
const express = require('express');

const OPTIONAL_COMPONENTS = {
  mongo: { name: 'mongoClient' },
  redis: { },
  eventbus: { },
  encryption: { dependencies: ['mongo'] },
};

const exportedComponents = {
  initService: service.init.bind(service),
  validation: require('./infra/validation'),
  makeEndpoint: require('./infra/express').makeEndpoint,
  getAuthenticatedEntity,
  request,
  Promise,
  express,
  config
};

const enabledComponents = config.getConfigArray('enabledComponents')
enabledComponents.forEach(key => {
  const component = OPTIONAL_COMPONENTS[key];
  if (!component) {
    throw new Error(`Could not find component '${key}'.`);
  }
  (component.dependencies || []).forEach(dependency => {
    if (!enabledComponents.includes(dependency)) {
      throw new Error(`Component '${key}'' is dependent on component '${dependency}' which is missing.`);
    }
  });
  exportedComponents[component.name || key] = require(`./infra/${key}`);
})

module.exports = exportedComponents;
