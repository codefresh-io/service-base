const { ObjectId } = require('mongodb');

const joiObjectId = {
    type: 'objectId',
    messages: { objectId: 'must be a valid ObjectId' },
    coerce(value) {
        if (!value) {
            return { value };
        }

        // Convert string to object ID
        if (typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/)) {
            return { value: new ObjectId(value) };
        }

        return { value };
    },
    validate(value, helpers) {
        if (!(value instanceof ObjectId)) {
            const errors = helpers.error('objectId');
            return { value, errors };
        }
        return { value };
    },
};

module.exports = joiObjectId;
