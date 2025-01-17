// @ts-check
const { MongoClient, ObjectId } = require('mongodb');
const { mongodb, logs } = require('@codefresh-io/cf-telemetry');
const { getDbNameFromUri } = require('./helper');

class Mongo {
    constructor() {
        this.db = undefined;
        this.ObjectId = ObjectId;
        this.logger = new logs.Logger('codefresh:infra:mongo');
    }

    /**
     * starts the connection to mongo
     * @returns {Promise<void>}
     */
    async init(config) {
        try {
            const clientSettings = { ...config.mongo.options };
            const { uri } = config.mongo;
            const dbName = config.mongo.dbName || getDbNameFromUri(uri);
            this.logger.info(`Mongo db name ${dbName}`);
            const client = new MongoClient(uri, clientSettings);
            mongodb.monitorMongoDBClient(client);

            this.client = await client.connect();
            this.logger.info('Mongo driver connected');
            this.db = this.client.db(dbName);
            this.logger.info('Mongo db initialized');
        } catch (error) {
            this.logger.error(error, 'Error connecting to MongoDB');
            throw error;
        }
    }


    /**
     * stops the connection to mongo
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.client) return;
        await this.client.close();
    }

    /**
     * @param {string} collectionName
     * @returns {import('mongodb').Collection}
     */
    collection(collectionName) {
        // @ts-ignore
        return this.db.collection(collectionName);
    }
}

module.exports = new Mongo();
