const _ = require('lodash');
const Joi = require('joi');
const YAML = require('js-yaml');
const Ajv = require('ajv');

Joi.objectId = Joi.extend(require('./validation-extensions/joi-objectid-extension')).objectId;

const customYamlJoi = Joi.extend((joi) => ({ // eslint-disable-line
    type: 'yaml',
    base: Joi.string(),
    prepare(value, helpers) {
        try {
            YAML.safeLoad(value);
            return { value };
        } catch (err) {
            return { errors: helpers.error('yaml', { v: value }) };
        }
    },
}));
Joi.yaml = customYamlJoi.yaml;

const customJsonSchemaStringJoi = Joi.extend((joi) => ({ // eslint-disable-line
    base: Joi.string(),
    type: 'jsonSchemaString',
    messages: { pre: 'is not a valid JSON Schema: {{err}}' },
    prepare(value, helpers) {
        try {
            const ajv = new Ajv({ validateSchema: true }); // options can be passed, e.g. {allErrors: true}
            ajv.compile(JSON.parse(value));
            return { value };
        } catch (err) {
            return { errors: helpers.error('jsonSchemaString.pre', { v: value, err: err.toString().replace('Error: schema is invalid: ', '') }) }; // eslint-disable-line max-len
        }
    },
}));
Joi.jsonSchemaString = customJsonSchemaStringJoi.jsonSchemaString;

const throwValidationError = (error) => {
    const validationErrorMessage = _.get(error, 'details[0].message');
    return Promise.reject(validationErrorMessage ? new Error(validationErrorMessage) : error);
};


function validateField(field, val, options = { optional: false }) {
    if (val === undefined && _.get(options, 'optional')) {
        return Promise.resolve();
    }
    const extractedSchema = this.extract(field);
    const { error, value } = extractedSchema.validate(val, { messages: { key: `"${field}" ` } });
    if (error) {
        return throwValidationError(error, field);
    }
    return { error, value };
}


function validateFields(partialObject, options) {
    return Promise.reduce(Object.keys(partialObject), (ret, field) => this.validateField(field, partialObject[field], options), 0);
}

function validateWithContext(obj, context) {
    return this.validate(Object.assign({}, obj, context))
        .then(normalized => _.omit(normalized, Object.keys(context)));
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
            .then(({ error, value }) => {
                if (error) {
                    return throwValidationError(error);
                }
                return Promise.resolve(value);
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
        .keys({ [discriminator]: Joi.valid(...Object.keys(childSchemas)).required() })
        .keys(extendedSchema);
}
