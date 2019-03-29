

const config = require('./infra/config');
const service = require('./infra');
const {
    getAuthenticatedEntity,
    setAuthenticatedEntity,
    request,
    authEntity
} = require('@codefresh-io/http-infra');
const Promise = require('bluebird');
const express = require('express');
const monitor = require('cf-monitor');
const logging = require('./infra/logging');
const routes = require('./infra/routes');
const internalServiceConfig = require('@codefresh-io/internal-service-config');

const OPTIONAL_COMPONENTS = {
    mongo: { name: 'mongoClient' },
    redis: { },
    eventbus: { },
    encryption: { dependencies: ['mongo'] },
};

const exportedComponents = {
    initService: service.init.bind(service),
    stopService: service.stop.bind(service),
    routes,
    validation: require('./infra/validation'),
    makeEndpoint: require('./infra/express').makeEndpoint,
    getAuthenticatedEntity,
    setAuthenticatedEntity,
    request,
    authEntity,
    Promise,
    express,
    expressApp: require('./infra/express').expressApp,
    getLogger: logging.getLogger,
    config,
    monitor,
    internalServiceConfig,
};

const enabledComponents = config.getConfigArray('enabledComponents');
enabledComponents.forEach((key) => {
    const component = OPTIONAL_COMPONENTS[key];
    if (!component) {
        throw new Error(`Could not find component '${key}'.`);
    }
    (component.dependencies || []).forEach((dependency) => {
        if (!enabledComponents.includes(dependency)) {
            throw new Error(`Component '${key}'' is dependent on component '${dependency}' which is missing.`);
        }
    });
    exportedComponents[component.name || key] = require(`./infra/${key}`);
});

module.exports = exportedComponents;
