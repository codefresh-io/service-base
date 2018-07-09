/* eslint-disable */

const chai = require('chai');
const Promise = require('bluebird'); // jshint ignore:line
const proxyquire = require('proxyquire').noCallThru();

const expect = chai.expect;

describe.only('Safe unit tests', () => {

  function generateSafeId() {
    return 'safe-id';
  }

  function proxy() {
    return proxyquire('./index.js', {
      './safe': {
        getOrCreateSafe() {
          const prefix = 'ENCRYPTED-';
          return Promise.resolve({
            write: (value) => {
              return Promise.resolve(`${prefix}${value}`);
            },
            read: (value) => {
              return Promise.resolve(value.split(prefix)[1]);
            }
          });
        }
      },
    });
  }

  function decryptObjectValues(...values) {
    const {
      decryptObjectValues
    } = proxy();
    return Promise.resolve(decryptObjectValues(...values));
  }

  function encryptObjectValues(...values) {
    const {
      encryptObjectValues
    } = proxy();
    return Promise.resolve(encryptObjectValues(...values));
  }

  function replaceEncryptedValues(...values){
    const {
        replaceEncryptedValues
      } = proxy();
      return Promise.resolve(replaceEncryptedValues(...values));
  }

  describe('encryptObjectValues', () => {
    it('should encrypt all object', () => {
      const objToEncrypt = {
        keyToBeEncrypted: 'value-1',
        keyToBeEncrypted2: 'value-2'
      };
      const keysToEncrypt = Object.keys(objToEncrypt);
      return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
        .then((res) => {
          expect(res).to.be.deep.equal({
            keyToBeEncrypted: 'ENCRYPTED-value-1',
            keyToBeEncrypted2: 'ENCRYPTED-value-2'
          });
        });
    });

    it('should encrypt selected keys in object', () => {
      const objToEncrypt = {
        keyToBeEncrypted: 'value-1',
        keyToNotBeEncrypted: 'value-2'
      };
      const keysToEncrypt = ['keyToBeEncrypted']
      return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
        .then((res) => {
          expect(res).to.be.deep.equal({
            keyToBeEncrypted: 'ENCRYPTED-value-1',
            keyToNotBeEncrypted: 'value-2'
          });
        })
    });

    it('should encrypt nested object with selected keys', () => {
      const objToEncrypt = {
        prop: {
          key_1: 'not-encrypted',
          key_2: {
            key_3: 'encrypted-value'
          },
        }
      };
      const keysToEncrypt = ['prop.key_2.key_3']
      return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
        .then((res) => {
          const expected = {
            prop: {
              key_1: 'not-encrypted',
              key_2: {
                key_3: 'ENCRYPTED-encrypted-value'
              },
            }
          };
          expect(res).to.be.deep.equal(expected);
        })
    });
  });

  describe('decryptObjectValues', () => {
    it('should decrypt encrypted object', () => {
      const objToEncrypt = {
        keyToBeEncrypted: 'value-1',
        keyToBeEncrypted2: 'value-2'
      };
      const keysToEncrypt = Object.keys(objToEncrypt);
      return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
        .then((res) => {
          return decryptObjectValues(generateSafeId(), res, keysToEncrypt);
        })
        .then((decrypted) => {
          expect(decrypted).to.be.deep.equal(objToEncrypt);
        });
    });
    it('should decrypt selected keys in object', () => {
      const objToEncrypt = {
        keyToBeEncrypted: 'value-1',
        keyToNotBeEncrypted: 'value-2'
      };
      const keysToEncrypt = ['keyToBeEncrypted']
      return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
        .then((res) => {
          return decryptObjectValues(generateSafeId(), res, keysToEncrypt);
        })
        .then((decrypted) => {
          expect(decrypted).to.be.deep.equal(objToEncrypt);
        });
    });
    it('should decrypt nested object with selected keys', () => {
      const objToEncrypt = {
        prop: {
          key_1: 'not-encrypted',
          key_2: {
            key_3: 'encrypted-value'
          },
        }
      };
      const keysToEncrypt = ['prop.key_2.key_3']
      return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
        .then((res) => {
          return decryptObjectValues(generateSafeId(), res, keysToEncrypt);
        })
        .then((decrypted) => {
          expect(decrypted).to.be.deep.equal(objToEncrypt);
        });
    });
  });

  describe('replaceEncryptedValues', () => {
      it('should replace encrypted values with *****', () => {
        const objToEncrypt = {
            keyToBeEncrypted: 'value-1',
            keyToBeEncrypted2: 'value-2'
          };
          const keysToEncrypt = Object.keys(objToEncrypt);
          return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
            .then((res) => {
                return replaceEncryptedValues(res, keysToEncrypt);
            })
            .then((encryptedObj) => {
                expect(encryptedObj).to.be.deep.equal({
                    keyToBeEncrypted: '*****',
                    keyToBeEncrypted2: '*****'
                });
            });
      });
      it('should replace encrypted in selected encrypted obj values with *****', () => {
        const objToEncrypt = {
            keyToBeEncrypted: 'value-1',
            keyToBeEncrypted2: 'value-2'
          };
          const keysToEncrypt = ['keyToBeEncrypted'];
          return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
            .then((res) => {
                return replaceEncryptedValues(res, keysToEncrypt);
            })
            .then((encryptedObj) => {
                expect(encryptedObj).to.be.deep.equal({
                    keyToBeEncrypted: '*****',
                    keyToBeEncrypted2: 'value-2'
                });
            });
      });
      it('should replace encrypted values in nested encrypted obj with *****', () => {
        const objToEncrypt = {
            prop: {
              key_1: 'not-encrypted',
              key_2: {
                key_3: 'encrypted-value'
              },
            }
          };
          const keysToEncrypt = ['prop.key_2.key_3']
          return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
            .then((res) => {
                return replaceEncryptedValues(res, keysToEncrypt);
            })
            .then((encryptedObj) => {
                expect(encryptedObj).to.be.deep.equal({
                    prop: {
                        key_1: 'not-encrypted',
                        key_2: {
                          key_3: '*****'
                        },
                      }
                });
            });
      });
  });
});