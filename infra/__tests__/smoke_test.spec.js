const { splitUriBySlash, getDbNameFromUri } = require('../helper');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongo = require('../mongo');
// had import issue when used in projects.
// eslint-disable-next-line no-unused-vars
const cryptoasync = require('@ronomon/crypto-async');

let mongod;
beforeEach(async () => {
    mongod = new MongoMemoryServer();
});
afterEach(async () => {
    await mongo.stop();
    await mongod.stop();
});
describe('mongo init compatability code', () => {
    it('splitUriBySlash', async () => {
        const { prefix, dbName } = splitUriBySlash('mongodb://localhost:27017/mytestingdb?xyz');
        expect(dbName)
            .toBe('mytestingdb');
        expect(prefix)
            .toBe('mongodb://localhost:27017');
    });


    it('smokeTest explicit ', async () => {
        const uri = await mongod.getUri();
        const port = await mongod.getPort();
        console.log(`using port ${port}`);
        const dbPath = await mongod.getDbPath();
        console.log(`dbPath ${dbPath}`);
        const dbName = await mongod.getDbName();
        console.log(`dbName ${dbName}`);

        await mongo.init({ mongo: { uri, dbName } });
        const users = mongo.collection('users');

        const mockUser = { _id: 'some-user-id', name: 'John' };
        await users.insertOne(mockUser);

        const insertedUser = await users.findOne({ _id: 'some-user-id' });
        expect(insertedUser)
            .toEqual(mockUser);
    });

    it('smokeTest2.2.33  and 3.6 implicit dbname', async () => {
        const uri = await mongod.getUri();
        const port = await mongod.getPort();
        console.log(`using port ${port}`);
        const dbPath = await mongod.getDbPath();
        console.log(`dbPath ${dbPath}`);
        const dbName = await mongod.getDbName();
        console.log(`dbName ${dbName}`);
        expect(dbName)
            .toEqual(getDbNameFromUri(uri));
        await mongo.init({ mongo: { uri } });
        const users = mongo.collection('users');

        const mockUser = { _id: 'some-user-id', name: 'John' };
        await users.insertOne(mockUser);

        const insertedUser = await users.findOne({ _id: 'some-user-id' });
        expect(insertedUser)
            .toEqual(mockUser);
    });
});
