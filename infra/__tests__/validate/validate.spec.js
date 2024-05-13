const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoClient = require('../../mongo');
const { Joi, createSchema } = require('../../validation');
const { ValidationError } = require('joi');
const { readFileSync } = require('fs');
const { ObjectId } = require('mongodb');

describe('testing validation module', () => {
    it('ObjectId', async () => {
        const dbName = 'users';
        const mongods = [await MongoMemoryServer.create({
            instance: {
                port: 27407,
                dbName,
            },
            binary: { version: '4.2.0' },
        }), await MongoMemoryServer.create({
            instance: {
                port: 27607,
                dbName,
            },
            binary: { version: '6.0.14' },
        })];

        // eslint-disable-next-line no-restricted-syntax
        for (const mongod of mongods) {
            const uri = mongod.getUri();
            // eslint-disable-next-line no-await-in-loop
            await mongoClient.init({
                mongo: {
                    uri,
                    dbName,
                },
            });
            const users = mongoClient.collection('users');
            const mockUser = { name: 'John' };
            // eslint-disable-next-line no-await-in-loop
            const id = (await users.insertOne(mockUser)).insertedId.toString();
            expect(() => Joi.assert(id, Joi.objectId())).not.toThrow();
        }
        expect(() => Joi.assert('someRandomId', Joi.objectId())).toThrow(ValidationError);
        expect(() => Joi.assert(12345678, Joi.objectId())).toThrow(ValidationError);
    });

    it('customYamlSchema', () => {
        const correctDoc = readFileSync('infra/__tests__/validate/auxiliary-files/yamls/correct.yaml', { encoding: 'utf8' });
        const brokenDoc = readFileSync('infra/__tests__/validate/auxiliary-files/yamls/broken.yaml', { encoding: 'utf8' });
        expect(() => Joi.assert(correctDoc, Joi.yaml())).not.toThrow();
        expect(() => Joi.assert(brokenDoc, Joi.yaml())).toThrow(ValidationError);
    });

    it('jsonSchemaString', () => {
        const validSchema = readFileSync('infra/__tests__/validate/auxiliary-files/jsons/validJsonSchema.json', { encoding: 'utf8' });
        const invalidSchema = readFileSync('infra/__tests__/validate/auxiliary-files/jsons/invalidJsonSchema.json', { encoding: 'utf8' });
        const brokenJson = readFileSync('infra/__tests__/validate/auxiliary-files/jsons/brokenJson.json', { encoding: 'utf8' });
        expect(() => Joi.assert(validSchema, Joi.jsonSchemaString())).not.toThrow();
        expect(() => Joi.assert(invalidSchema, Joi.jsonSchemaString())).toThrow(ValidationError);
        expect(() => Joi.assert(brokenJson, Joi.jsonSchemaString())).toThrow(ValidationError);
    });

    it('createSchema', async () => {
        const schema = createSchema({
            id: Joi.objectId().required(),
            name: Joi.string().required(),
        }, 'type', { argo: { spec: Joi.object({ testField: Joi.boolean() }).required() } });
        const invalidValue = { id: '123' };
        const validValue = { id: '663cdd877065d5748d788886', name: 'Somename', type: 'argo', spec: { testField: false } };
        const validateCheck = async (value) => {
            try {
                const res = await schema.validate(value);
                return { value: res };
            } catch (error) {
                throw error.message;
            }
        };
        await expect(validateCheck(invalidValue)).rejects.toEqual('must be a valid ObjectId');
        await expect(validateCheck(validValue)).resolves.toEqual({ value: { ...validValue, id: new ObjectId(validValue.id) } });
        await expect(schema.validateField('id', invalidValue.id)).rejects.toEqual(new Error('must be a valid ObjectId'));
        await expect(schema.validateField('id', validValue.id).value).toEqual(new ObjectId(validValue.id));
    });
});
