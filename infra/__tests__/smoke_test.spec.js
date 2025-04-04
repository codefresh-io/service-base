const { MongoMemoryServer } = require('mongodb-memory-server');
const { splitUriBySlash, getDbNameFromUri } = require('../helper');
const mongoClient = require('../mongo');

/**
 * @type {MongoMemoryServer}
 */
let mongod;
async function clientSetupByUriAndDbName() {
    const uri = mongod.getUri();
    const { port, dbPath, dbName } = mongod.instanceInfo;
    console.log(`using port ${port}`);
    console.log(`dbPath ${dbPath}`);
    console.log(`dbName ${dbName}`);

    await mongoClient.init({ mongo: { uri, dbName } });
    return { dbName, dbPath, uri, port };
}

describe('mongo init compatibility code', () => {
    beforeEach(async () => {
        mongod = await MongoMemoryServer.create();
    });
    afterEach(async () => {
        await mongoClient.stop();
        await mongod.stop();
    });

    it('splitUriBySlash', async () => {
        const { prefix, dbName } = splitUriBySlash('mongodb://localhost:27017/mytestingdb?xyz');
        expect(dbName)
            .toBe('mytestingdb');
        expect(prefix)
            .toBe('mongodb://localhost:27017');
    });

    it('smokeTest explicit dbName with clientSetupByUriAndDbName', async () => {
        await clientSetupByUriAndDbName();
        const users = mongoClient.collection('users');

        const mockUser = { _id: 'some-user-id', name: 'John' };
        await users.insertOne(mockUser);

        const insertedUser = await users.findOne({ _id: 'some-user-id' });
        expect(insertedUser).toEqual(mockUser);
    });

    it('smokeTest2.2.33  and 3.6 extracted dbname', async () => {
        const uri = mongod.getUri();
        const { dbName } = mongod.instanceInfo;
        expect(dbName)
            .toEqual(getDbNameFromUri(uri));
        await mongoClient.init({ mongo: { uri } });
        const users = mongoClient.collection('users');

        const mockUser = { _id: 'some-user-id', name: 'John' };
        await users.insertOne(mockUser);

        const insertedUser = await users.findOne({ _id: 'some-user-id' });
        expect(insertedUser).toEqual(mockUser);
    });

    it('db.db old use driver 2.x style API of uri no dbname param', async () => {
        const uri = mongod.getUri();
        await mongoClient.init({ mongo: { uri } });
        const pipelineManagerDB = mongoClient.client.db(process.env.PIPELINE_MANAGER_DB || 'pipeline-manager');
        const stepCollection = pipelineManagerDB.collection('steps');
        const steps = await stepCollection.find()
            .sort({ 'metadata.official': -1, 'metadata.categories': 1, 'metadata.name': 1, _id: -1 }).toArray();
        expect(steps.length).toEqual(0);
    });

    it('client.db 3.x the new style using client', async () => {
        const uri = mongod.getUri();
        const { dbName } = mongod.instanceInfo;
        expect(dbName).toEqual(getDbNameFromUri(uri));
        await mongoClient.init({ mongo: { uri } });
        const pipelineManagerDB = await mongoClient.client.db(process.env.PIPELINE_MANAGER_DB || 'pipeline-manager');
        const mockUser = { _id: 'some-user-id', name: 'John' };
        const stepCollection = pipelineManagerDB.collection('steps');
        await stepCollection.insertOne(mockUser);

        const insertedUser = await stepCollection.findOne({ _id: 'some-user-id' });
        expect(insertedUser).toEqual(mockUser);
    });

    it('additional uses', async () => {
        const uri = mongod.getUri();
        const { dbName } = mongod.instanceInfo;
        expect(dbName).toEqual(getDbNameFromUri(uri));
        await mongoClient.init({ mongo: { uri } });
        // eslint-disable-next-line prefer-destructuring
        const ObjectId = mongoClient.ObjectId;
        expect(ObjectId).toBeTruthy();

        const collection = mongoClient.collection('charts');
        await collection.createIndex({ account: 1, repository: 1, name: 1, version: 1 }, {
            unique: true,
            background: true,
        });
        await collection.createIndex({ created: 1 }, { expireAfterSeconds: 60 });
        const generateObjectId = () => new mongoClient.ObjectId().toString();
        const objectId = generateObjectId();
        expect(objectId).toBeTruthy();
    });
});
