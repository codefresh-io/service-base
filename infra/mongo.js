const { MongoClient, ObjectId } = require('mongodb');
const { getDbNameFromUri } = require('./helper');

class Mongo {
    constructor() {
        this.db = undefined;
        this.ObjectId = ObjectId;
    }

    /**
     * starts the connection to mongo
     * @returns {Promise<void>}
     */
    async init(config) {
        const clientSettings = { ...config.mongo.options };

        const logger = require('cf-logs').Logger('codefresh:infra:mongo'); // eslint-disable-line
        this.logger = logger;

        const { uri } = config.mongo;
        const dbName = config.mongo.dbName || getDbNameFromUri(uri);
        const client = await MongoClient.connect(uri, clientSettings);
        this.client = client;
        this.db = client.db(dbName);
        logger.info('Mongo driver connected');
    }


    /**
     * stops the connection to mongo
     * @returns {Promise<void>}
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
