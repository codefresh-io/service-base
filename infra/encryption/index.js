const _ = require('lodash');
const Promise = require('bluebird');
const safe = require('./safe');

function _encryptDecrypt(safeId, values, encrypt = true) {
    return safe.getOrCreateSafe(safeId)
        .then(safeObj => Promise.all((values || [])
            .map(val => safeObj[encrypt ? 'write' : 'read'](val))));
}

function _encryptDecryptObjectValues(safeId, obj, keysToEncrypt, encrypt = true) {
    const fieldsToEncrypt = _.pick(obj, keysToEncrypt);
    const keys = _.keys(fieldsToEncrypt);
    const values = _.values(fieldsToEncrypt);
    return _encryptDecrypt(safeId, values, encrypt)
        .then(encryptedValues => _.zipObject(keys, encryptedValues))
        .then(encryptedFields => Object.assign({}, obj, encryptedFields));
}

function encryptObjectValues(safeId, obj, keysToEncrypt) {
    return _encryptDecryptObjectValues(safeId, obj, keysToEncrypt, true);
}

function decryptObjectValues(safeId, obj, keysToEncrypt) {
    return _encryptDecryptObjectValues(safeId, obj, keysToEncrypt, false);
}

module.exports = {
    encryptObjectValues,
    decryptObjectValues
};
