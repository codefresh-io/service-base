

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('node-uuid');
const crypto = require('crypto');

const config = require('../config');
const mongoClient = require('../mongo');

const ALGORITHM = 'AES-256-CTR';
const CRYPTO_PREFIX = '$$$crypto$$$';
const STRINGIFY_CRYPTO_PREFIX = '$$$crypto-obj$$$';

async function cipher(algorithm, encrypt, key, iv, data) {
    if (encrypt) {
        const cipherObject = crypto.createCipheriv(algorithm, key, iv);
        let ciphertext = cipherObject.update(data, 'utf8', 'hex');
        ciphertext += cipherObject.final('hex');
        return ciphertext;
    }
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let plaintext = decipher.update(data, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
}

const Safe = function (safeModel) { // eslint-disable-line
    this.safeModel = safeModel;
};

function getOrCreateSafe(safeId) {
    if (!safeId) {
        throw new Error('Error creating safe: SafeId was not specified.');
    }
    const collection = mongoClient.collection('safe');
    return collection.findOne({ _id: safeId })
        .catch((err) => {
            throw new Error(`Error occurred while querying for safe : ${safeId}. Caused by: ${err.toString()}`);
        })
        .then((safe) => {
            if (safe) {
                return new Safe(safe);
            }

            const newSafe = {
                _id: safeId,
                key: (new Buffer(uuid.v4())).toString('base64'), // eslint-disable-line
            };
            return collection.insertOne(newSafe)
                .then(() => new Safe(newSafe))
                .catch((err) => {
                    throw new Error(`Error occurred while creating safe: ${safeId}. Caused by: ${err.toString()}`);
                });
        });
}

// decrypt cipher text: try to decrypt with crypto library first
// if did not find CRYPTO_PREFIX prefix, try to use old triplesec decryption
Safe.prototype.read_crypto = function (ciphertext) { // eslint-disable-line
    const deferred = Promise.defer();

    const key = Buffer.alloc(32, _.get(config, 'safe.secret'));
    const iv = Buffer.alloc(16, this.safeModel.key);

    const shouldParse = ciphertext.startsWith(STRINGIFY_CRYPTO_PREFIX);
    const prefix = shouldParse ? STRINGIFY_CRYPTO_PREFIX : CRYPTO_PREFIX;

    // don't try to encrypt empty strings
    // this causes segfault with node.js >= 14.x.x
    if (ciphertext === CRYPTO_PREFIX) {
        deferred.resolve('');
        return deferred.promise;
    }

    const encrypt = 0; // 0 = Decrypt
    cipher(ALGORITHM, encrypt, key, iv, Buffer.from(ciphertext.slice(prefix.length), 'hex')).then((plaintext) => {
        const ret = plaintext.toString();
        deferred.resolve(shouldParse ? JSON.parse(ret) : ret);
    }).catch((error) => {
        if (error) {
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

// encrypt text and add CRYPTO_PREFIX prefix (to mark the new encryption)
Safe.prototype.write_crypto = function (plaintext) { // eslint-disable-line
    const deferred = Promise.defer();
    const key = Buffer.alloc(32, _.get(config, 'safe.secret'));
    const iv = Buffer.alloc(16, this.safeModel.key);

    const shouldStringify = !_.isString(plaintext);
    const prefix = shouldStringify ? STRINGIFY_CRYPTO_PREFIX : CRYPTO_PREFIX;
    const textToEncrypt = shouldStringify ? JSON.stringify(plaintext) : plaintext;

    // don't try to encrypt empty strings
    // this causes segfault with node.js >= 14.x.x
    if (textToEncrypt === '') {
        deferred.resolve(prefix);
        return deferred.promise;
    }

    const encrypt = 1; // 1 = Encrypt
    cipher(ALGORITHM, encrypt, key, iv, Buffer.from(textToEncrypt)).then((ciphertext) => {
        deferred.resolve(`${prefix}${ciphertext.toString('hex')}`);
    }).catch((error) => {
        if (error) {
            deferred.reject(error);
        }
    });
    return deferred.promise;
};


Safe.prototype.read = Safe.prototype.read_crypto;
Safe.prototype.write = Safe.prototype.write_crypto;

// export
module.exports.getOrCreateSafe = getOrCreateSafe;
