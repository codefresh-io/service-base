'use strict';

const Promise    = require('bluebird');
const logger     = require('cf-logs').Logger('codefresh:infra:mongo');
const mongoose   = require('mongoose');
mongoose.Promise = require('bluebird');


class Mongo {

    constructor() {

    }

    /**
     * starts the connection to mongo
     * @returns {*}
     */
    init(config) {
        return mongoose.connect(config.mongo.uri)
            .then(() => {
                console.log(`Mongoose connected to: ${config.mongo.uri}`);
            });
    }


    /**
     * stops the connection to mongo
     * @returns {*}
     */
    stop() {
        return Promise.resolve();
    }
}


module.exports = new Mongo();