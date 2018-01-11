'use strict';

const _    = require('lodash');
const Promise = require('bluebird');
const uuid = require('node-uuid');
const cryptoAsync = require('@ronomon/crypto-async');

const config = require('../config');
const mongoClient = require('../mongo');

const ALGORITHM     = 'AES-256-CTR';
const CRYPTO_PREFIX = '$$$crypto$$$';
const STRINGIFY_CRYPTO_PREFIX = '$$$crypto-obj$$$';

const Safe = function (safeModel) {
    this.safeModel = safeModel;
};

function getOrCreateSafe(safeId) {
    if (!safeId) {
      throw new Error(`Error creating safe: SafeId was not specified.`);
    }
    const collection = mongoClient.collection('safe');
    return collection.findOne({ _id: safeId })
      .catch(err => {
        throw new Error(`Error occurred while querying for safe : ${safeId}. Caused by: ${err.toString()}`);
      })
      .then(safe => {
        if (safe) {
          return new Safe(safe);
        }

        const newSafe = {
            _id: safeId,
            key: (new Buffer(uuid.v4())).toString('base64')
        };
        return collection.save(newSafe)
          .then(() => new Safe(newSafe))
          .catch((err) => {
            throw new Error(`Error occurred while creating safe: ${safeId}. Caused by: ${err.toString()}`);
        });
      });
}

// decrypt cipher text: try to decrypt with crypto library first
// if did not find CRYPTO_PREFIX prefix, try to use old triplesec decryption
Safe.prototype.read_crypto = function (ciphertext) {
    const deferred = Promise.defer();

    const key = Buffer.alloc(32, _.get(config, 'safe.secret'));
    const iv = Buffer.alloc(16, this.safeModel.key);

    const shouldParse = ciphertext.startsWith(STRINGIFY_CRYPTO_PREFIX);
    const prefixLength = (shouldParse ? STRINGIFY_CRYPTO_PREFIX : CRYPTO_PREFIX).length;

    const encrypt = 0; // 0 = Decrypt
    cryptoAsync.cipher(ALGORITHM, encrypt, key, iv, Buffer.from(ciphertext.slice(prefixLength), 'hex'),
      (error, plaintext) => {
          if (error) {
              deferred.reject(error);
              return;
          }
          const ret = plaintext.toString();
          deferred.resolve(shouldParse ? JSON.parse(ret) : ret);
      }
    );
    return deferred.promise;
};

// encrypt text and add CRYPTO_PREFIX prefix (to mark the new encryption)
Safe.prototype.write_crypto = function (plaintext) {
    const deferred = Promise.defer();

    const key = Buffer.alloc(32, _.get(config, 'safe.secret'));
    const iv = Buffer.alloc(16, this.safeModel.key);

    const shouldStringify = !_.isString(plaintext);
    const textToEncrypt = shouldStringify ? JSON.stringify(plaintext) : plaintext;

    const encrypt = 1; // 1 = Encrypt
    cryptoAsync.cipher(ALGORITHM, encrypt, key, iv, Buffer.from(textToEncrypt),
      (error, ciphertext) => {
          if (error) {
              deferred.reject(error);
              return;
          }
          deferred.resolve(`${shouldStringify ? STRINGIFY_CRYPTO_PREFIX : CRYPTO_PREFIX}${ciphertext.toString('hex')}`);
      }
    );
    return deferred.promise;
};


Safe.prototype.read = Safe.prototype.read_crypto;
Safe.prototype.write = Safe.prototype.write_crypto;

// export
module.exports.getOrCreateSafe = getOrCreateSafe;
