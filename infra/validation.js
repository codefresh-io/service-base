const _ = require('lodash');
const Promise = require('bluebird');
const Joi = require('joi').extend(require('@wegolook/joi-objectid'));
const YAML = require('js-yaml');
const Ajv = require('ajv');

const customYamlJoi = Joi.extend((joi) => ({ // eslint-disable-line
    name: 'yaml',
    language: {},
    pre(value, state, options) {
        try {
            YAML.safeLoad(value);
            return value;
        } catch {
            return this.createError('yaml', { v: value }, state, options);
        }
    },
    rules: [],
}));
Joi.yaml = customYamlJoi.yaml;

const customJsonSchemaStringJoi = Joi.extend((joi) => ({ // eslint-disable-line
    base: Joi.string(),
    name: 'jsonSchemaString',
    language: { pre: 'is not a valid JSON Schema: {{err}}' },
    pre(value, state, options) {
        try {
            const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
            ajv.compile(JSON.parse(value));
            return value;
        } catch (err) {
            return this.createError('jsonSchemaString.pre', { v: value, err: err.toString().replace('Error: schema is invalid: ', '') }, state, options); // eslint-disable-line max-len
        }
    },
    rules: [],
}));
Joi.jsonSchemaString = customJsonSchemaStringJoi.jsonSchemaString;

function validateField(field, val, options = { optional: false }) {
    if (val === undefined && _.get(options, 'optional')) {
        return Promise.resolve();
    }

    return Joi.reach(this, field).validate(val, { language: { key: `"${field}" ` } });
}

function validateFields(partialObject, options) {
    return Promise.reduce(Object.keys(partialObject), (ret, field) => this.validateField(field, partialObject[field], options), 0);
}

function validateWithContext(obj, context) {
    return this.validate({ ...obj, ...context })
        .then((normalized) => _.omit(normalized, Object.keys(context)));
}

module.exports = {
    Joi,

    createSchema(baseSchema, discriminator, childSchemas) {
        const schema = _createSchema(baseSchema, discriminator, childSchemas); // eslint-disable-line
        return Object.assign(schema, {
            validate: _wrapValidate(schema.validate), // eslint-disable-line
            validateField,
            validateFields,
            validateWithContext,
        });
    },
};

function _wrapValidate(validate) {
    // const validate = Promise.promisify(rawJoiValidate);
    return function (schema) { // eslint-disable-line
        return Promise.resolve()
            .then(validate.bind(this, schema))
            .catch((err) => {
                const validationErrorMessage = _.get(err, 'details[0].message');
                return Promise.reject(validationErrorMessage ? new Error(validationErrorMessage) : err);
            });
    };
}

function _createSchema(baseSchema, discriminator, childSchemas) {
    if (!discriminator) {
        return Joi.object(baseSchema);
    }

    const extendedSchema = {};
    _.forEach(childSchemas, (childSchema, discriminatorVal) => {
        _.forEach(childSchema, (valueSchema, key) => {
            extendedSchema[key] = _.get(extendedSchema, key, Joi.forbidden())
                .when(discriminator, { is: discriminatorVal, then: valueSchema });
        });
    });

    return Joi.object(baseSchema)
        .keys({ [discriminator]: Joi.valid(Object.keys(childSchemas)).required() })
        .keys(extendedSchema);
}
