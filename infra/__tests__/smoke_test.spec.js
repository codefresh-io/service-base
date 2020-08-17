const { splitUriBySlash, getDbNameFromUri } = require('../helper');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongo = require('../mongo');

describe('mongo init compatability code', () => {

    it('splitUriBySlash', async () => {
        const { prefix, dbName } = splitUriBySlash('mongodb://localhost:27017/mytestingdb?xyz');
        expect(dbName)
            .toBe('mytestingdb');
        expect(prefix)
            .toBe('mongodb://localhost:27017');
    });


    it('smokeTest explicit ', async () => {
        const mongod = new MongoMemoryServer();
        const uri = await mongod.getUri();
        // eslint-disable-next-line no-unused-vars
        const port = await mongod.getPort();
        // eslint-disable-next-line no-unused-vars
        const dbPath = await mongod.getDbPath();
        const dbName = await mongod.getDbName();
        await mongo.init({ mongo: { uri, dbName } });
        const users = mongo.collection('users');

        const mockUser = { _id: 'some-user-id', name: 'John' };
        await users.insertOne(mockUser);

        const insertedUser = await users.findOne({ _id: 'some-user-id' });
        expect(insertedUser)
            .toEqual(mockUser);
    });

    it('smokeTest2.2.33  and 3.6 implicit dbname', async () => {
        const mongod = new MongoMemoryServer();
        const uri = await mongod.getUri();
        // eslint-disable-next-line no-unused-vars
        const port = await mongod.getPort();
        // eslint-disable-next-line no-unused-vars
        const dbPath = await mongod.getDbPath();
        const dbName = await mongod.getDbName();
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
