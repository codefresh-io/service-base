/* eslint-disable */

const chai = require('chai');
const Promise = require('bluebird'); // jshint ignore:line
const proxyquire = require('proxyquire').noCallThru();

const expect = chai.expect;

describe('Safe unit tests', () => {

  function generateSafeId() {
    return 'safe-id';
  }

  const safeProxy = proxyquire('./safe.js', {
    '../config': {
      safe: {
        secret: {
          key: 'secret'
        }
      }
    },
    '../mongo': {
      collection(){
        return {
          findOne(){
            return Promise.resolve('id');
          }
        }
      }
    }
  });

  function proxy() {
    return proxyquire('./index.js', {
      './safe': safeProxy
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

const CRYPTO_PREFIX = '$$$crypto$$$';
const STRINGIFY_CRYPTO_PREFIX = '$$$crypto-obj$$$';

  describe('encryptObjectValues', () => {
    it('should encrypt all object', () => {
      const objToEncrypt = {
        keyToBeEncrypted: 'value-1',
        keyToBeEncrypted2: 'value-2'
      };
      const keysToEncrypt = Object.keys(objToEncrypt);
      return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
        .then((res) => {
          expect(res.keyToBeEncrypted).to.have.string(CRYPTO_PREFIX);
          expect(res.keyToBeEncrypted2).to.have.string(CRYPTO_PREFIX);
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
          expect(res.keyToBeEncrypted).to.have.string(CRYPTO_PREFIX);
          expect(res.keyToNotBeEncrypted).to.not.have.string(CRYPTO_PREFIX);
        });
    });

    it('should encrypt sub object in object', () => {
      const objToEncrypt = {
        keyToBeEncrypted: {
          key: 'value'
        },
        keyToNotBeEncrypted: 'value-2'
      };
      const keysToEncrypt = ['keyToBeEncrypted']
      return encryptObjectValues(generateSafeId(), objToEncrypt, keysToEncrypt)
        .then((res) => {
          expect(res.keyToBeEncrypted).to.have.string(STRINGIFY_CRYPTO_PREFIX);
          expect(res.keyToNotBeEncrypted).to.not.have.string(CRYPTO_PREFIX);
        });
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
          expect(res.prop.key_2.key_3).to.have.string(CRYPTO_PREFIX);
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

    it('should decrypt sub object in object', () => {
      const objToEncrypt = {
        keyToBeEncrypted: {
          key: 'value'
        },
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