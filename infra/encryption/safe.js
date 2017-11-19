'use strict';

const _    = require('lodash');
const Promise = require('bluebird');
const uuid = require('node-uuid');
const cryptoAsync = require('@ronomon/crypto-async');

const config = require('../../config');
const mongoClient = require('../mongo');

const ALGORITHM     = 'AES-256-CTR';
const CRYPTO_PREFIX = '$$$crypto$$$';

const Safe = function (safeModel) {
    this.safeModel = safeModel;
};

function getOrCreateSafe(safeId) {
    const collection = mongoClient.collection('safe');
    return collection.findOne({ _id: safeId })
      .catch(err => {
        throw new Error(`Error occurred while querying for safe : ${_id}`);
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
          .catch(() => {
            throw new Error(`Error occurred while creating safe: ${_id}`);
        });
      });
}

// decrypt cipher text: try to decrypt with crypto library first
// if did not find CRYPTO_PREFIX prefix, try to use old triplesec decryption
Safe.prototype.read_crypto = function (ciphertext) {
    const deferred = Promise.defer();

    const key = Buffer.alloc(32, _.get(config, 'safe.secret'));
    const iv = Buffer.alloc(16, this.safeModel.key);

    const encrypt = 0; // 0 = Decrypt
    cryptoAsync.cipher(ALGORITHM, encrypt, key, iv, Buffer.from(ciphertext, 'hex'),
      (error, plaintext) => {
          if (error) {
              deferred.reject(error);
              return;
          }
          deferred.resolve(plaintext.toString());
      }
    );
    return deferred.promise;
};

// encrypt text and add CRYPTO_PREFIX prefix (to mark the new encryption)
Safe.prototype.write_crypto = function (plaintext) {
    const deferred = Promise.defer();

    const key = Buffer.alloc(32, _.get(config, 'safe.secret'));
    const iv = Buffer.alloc(16, this.safeModel.key);

    const encrypt = 1; // 1 = Encrypt
    cryptoAsync.cipher(ALGORITHM, encrypt, key, iv, Buffer.from(plaintext),
      (error, ciphertext) => {
          if (error) {
              deferred.reject(error);
              return;
          }
          deferred.resolve(`${CRYPTO_PREFIX}${ciphertext.toString('hex')}`);
      }
    );
    return deferred.promise;
};


Safe.prototype.read = function (ciphertext) {
  return this.read_crypto(ciphertext.slice(CRYPTO_PREFIX.length));
};

// aliases write to write_crypto
Safe.prototype.write = Safe.prototype.write_crypto;

// export
module.exports.getOrCreateSafe = getOrCreateSafe;
