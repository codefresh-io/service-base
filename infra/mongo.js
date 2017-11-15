'use strict';

const Promise = require('bluebird');
const logger = require('cf-logs').Logger('codefresh:infra:mongo');
const {MongoClient} = require('mongodb');

const clientSettings = {
  promiseLibrary: Promise
}

class Mongo {

    constructor() {
      this.db = undefined;
    }

    /**
     * starts the connection to mongo
     * @returns {*}
     */
    init(config) {
        return MongoClient.connect(config.mongo.uri, clientSettings)
            .then(db => {
                this.db = db;
                console.log(`Mongo driver connected to: ${config.mongo.uri}`);
            });
    }


    /**
     * stops the connection to mongo
     * @returns {*}
     */
    stop() {
        if (!this.db) {
          return Promise.resolve();
        }
        return this.db.close();
    }

    collection(collectionName) {
      return this.db.collection(collectionName);
    }
}

module.exports = new Mongo();
