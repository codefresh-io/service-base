

const Promise = require('bluebird');
const { MongoClient, ObjectId } = require('mongodb');

const clientSettings = { promiseLibrary: Promise };

class Mongo {
    constructor() {
        this.db = undefined;
        this.ObjectId = ObjectId;
    }

    /**
     * starts the connection to mongo
     * @returns {*}
     */
    init(config) {
        const logger = require('cf-logs').Logger('codefresh:infra:mongo'); // eslint-disable-line
        this.logger = logger;
        return MongoClient.connect(config.mongo.uri, clientSettings)
            .then((db) => {
                this.db = db;
                logger.info(`Mongo driver connected to: ${config.mongo.uri}`);
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
