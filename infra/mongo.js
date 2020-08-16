

const Promise = require('bluebird');
const { MongoClient, ObjectId } = require('mongodb');
const { splitUriBySlash } = require('./helper');

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
        const { uri, dbname } = splitUriBySlash(config.mongo.uri);
        return MongoClient.connect(uri, clientSettings)
            .then( async (client) => {
                this.db = await client.db(dbname);
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
        return this.db.close();
    }

    collection(collectionName) {
        return this.db.collection(collectionName);
    }
}

module.exports = new Mongo();
