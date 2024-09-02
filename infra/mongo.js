const mongoose = require('mongoose');

const { ObjectId } = mongoose.Types;
const { getDbNameFromUri } = require('./helper');

class Mongo {
    constructor() {
        this.db = undefined;
        this.ObjectId = ObjectId;
    }

    /**
     * starts the connection to mongo
     */
    async init(config) {
        const clientSettings = { ...config.mongo.options };

        const logger = require('cf-logs').Logger('codefresh:infra:mongo'); // eslint-disable-line
        this.logger = logger;

        const { uri } = config.mongo;
        logger.info(`Mongo db uri ${uri}`);
        const dbName = config.mongo.dbName || getDbNameFromUri(uri);
        const connection = await mongoose.createConnection(uri, clientSettings).asPromise();

        logger.info(`Mongo db name ${dbName}`);
        this.client = connection.getClient();
        logger.info('Mongo driver connected');
        this.db = this.client.db(dbName);
        logger.info('Mongo db initialized');
    }


    /**
     * stops the connection to mongo
     */
    async stop() {
        if (!this.db) {
            return;
        }
        await this.client.close();
    }

    collection(collectionName) {
        return this.db.collection(collectionName);
    }
}

module.exports = new Mongo();
