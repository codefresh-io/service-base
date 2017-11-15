'use strict';

let config = undefined
try {
    config = require('./config');
} catch (err) {
    throw new Error(`Failed to prepare configuration: ${err.stack}`);
}

const service = require('./infra');

module.exports = {
	initService: (initFn) => service.init(config, initFn)
};
