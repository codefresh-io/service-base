

const Promise = require('bluebird');
const { MongoClient, ObjectId } = require('mongodb');
const { getDbNameFromUri } = require('./helper');

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
        const clientSettings = {
            promiseLibrary: Promise,
            reconnectTries: config.mongo.reconnectTries,
            reconnectInterval: config.mongo.reconnectInterval,
        };

        const logger = require('cf-logs').Logger('codefresh:infra:mongo'); // eslint-disable-line
        this.logger = logger;
        logger.info(`Mongo got config ${JSON.stringify(config.mongo)}`);
        const { uri } = config.mongo;
        const dbName = config.mongo.dbName || getDbNameFromUri(uri);
        logger.info(`Use Uri ${uri} settings ${JSON.stringify(clientSettings)}, the dbName is ${dbName}`);
        return MongoClient.connect(uri, clientSettings)
            .then(async (client) => {
                this.client = client;
                this.db = await client.db(dbName);
                logger.info('Mongo driver connected');
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
        return this.client.close();
    }

    collection(collectionName) {
        return this.db.collection(collectionName);
    }
}

module.exports = new Mongo();
