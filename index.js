

const config = require('./infra/config');
const service = require('./infra');
const { 
    getAuthenticatedEntity,
    setAuthenticatedEntity,
    request,
    authEntitiy
} = require('@codefresh-io/http-infra');
const Promise = require('bluebird');
const express = require('express');
const monitor = require('cf-monitor');
const logging = require('./infra/logging');

const OPTIONAL_COMPONENTS = {
    mongo: { name: 'mongoClient' },
    redis: { },
    eventbus: { },
    encryption: { dependencies: ['mongo'] },
};

const exportedComponents = {
    initService: service.init.bind(service),
    stopService: service.stop.bind(service),
    validation: require('./infra/validation'),
    makeEndpoint: require('./infra/express').makeEndpoint,
    getAuthenticatedEntity,
    setAuthenticatedEntity,
    request,
    authEntitiy,
    Promise,
    express,
    expressApp: require('./infra/express').expressApp,
    getLogger: logging.getLogger,
    config,
    monitor,
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
