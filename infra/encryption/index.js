const _ = require('lodash');
const Promise = require('bluebird');
const safe = require('./safe');

function _encryptDecryptValue(safeObj, value, encrypt = true) {
    return safeObj[encrypt ? 'write' : 'read'](value);
}

function _encryptDecryptObjectValues(safeId, obj, keysToEncrypt = [], encrypt = true) {
    if (keysToEncrypt.length === 0) {
        return Promise.resolve(obj);
    }
    const pairs = _.chain(keysToEncrypt)
        .map(k => _.has(obj, k) && _.assign({ key: k, value: _.get(obj, k) }))
        .compact()
        .value();

    const resObj = _.clone(obj);

    return safe.getOrCreateSafe(safeId)
        .then((safeObj) => {
            const Promises = pairs.map(kv => _encryptDecryptValue(safeObj, kv.value, encrypt)
                .then(res => _.set(resObj, kv.key, res)));
            return Promise.all(Promises);
        })
        .then(() => resObj);
}

function encryptObjectValues(safeId, obj, keysToEncrypt) {
    return _encryptDecryptObjectValues(safeId, obj, keysToEncrypt, true);
}

function decryptObjectValues(safeId, obj, keysToEncrypt) {
    return _encryptDecryptObjectValues(safeId, obj, keysToEncrypt, false);
}

function replaceEncryptedValues(encryptedObject = {}, keys = [], replaceWith = '*****') {
    _.map(keys, (k => _.has(encryptedObject, k) && _.set(encryptedObject, k, replaceWith)));
    return encryptedObject;
}

module.exports = {
    encryptObjectValues,
    decryptObjectValues,
    getSafe: safeId => safe.getOrCreateSafe(safeId),
    replaceEncryptedValues,
};
