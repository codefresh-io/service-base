'use strict';

const chai    = require('chai');
const Promise = require('bluebird'); // jshint ignore:line
const helpers = require('../server/test/helpers.js');
const INIT    = require('../server/api/index.js');
const Account = require('../server/api/accounts/accounts.model');
const safe    = require('./safe');

const expect = chai.expect;

describe.skip('Safe Unit Tests', () => {

    before(() => {
        return Promise.resolve()
            .then(() => {
                INIT.init({ uri: process.env.TEST_MONGO_URI });
                return Promise.fromCallback(helpers.dropAllData);
            });
    });

    after(() => {
        return Promise.fromCallback(helpers.dropAllData);
    });

    beforeEach(() => {
        return Promise.fromCallback(helpers.dropAllData);
    });

    describe('Get Or Create', () => {

        it('Create a new safe', (done) => {
            createAccount('new-key')
                .then((account) => {
                    safe.getOrCreateSafe(account)
                        .then((accountSafe) => {
                            accountSafe.safeModel.account._id.should.equal(account._id, 'Unexpected account ID');
                            expect(accountSafe.safeModel.key).to.exist; // jshint ignore:line
                            done();
                        }).catch((err) => {
                            done(err);
                        });
                });

        });

        it('Create a new safe and get it once more', (done) => {
            createAccount('new-key')
                .then((account) => {
                    return safe.getOrCreateSafe(account)
                        .then((firstSafe) => {
                            return safe.getOrCreateSafe(account)
                                .then((secondSafe) => {
                                    firstSafe.safeModel._id.toString().should.equal(secondSafe.safeModel._id.toString(),
                                        'The second invocation shouldn\'t create a new safe ID');
                                    firstSafe.safeModel.key.should.equal(secondSafe.safeModel.key,
                                        'The second invocation shouldn\'t create a new safe');
                                    done();
                                });
                        });
                })
                .catch((err) => {
                    done(err);
                });
        });
    });

    describe('Read and write', () => {

        it('Successfully read and write', (done) => {
            createSafe()
                .then((createdSafe) => {
                    return createdSafe.write('mysecret')
                        .then((writtenSecret) => {
                            return createdSafe.read(writtenSecret);
                        })
                        .then((decrypted) => {
                            decrypted.should.equal('mysecret', 'Unexpected decrypted value');
                            done();
                        });
                })
                .catch((err) => {
                    done(err);
                });
        });

        // ignore prefer-arrow-callback rule, since mocha does not support this.timeout with arrow function
        // eslint-disable-next-line prefer-arrow-callback
        it('Fallback to tripplesec read', function (done) {
            this.timeout(5000);
            // triplesec is very sensitive to CPU load and fails frequently on timeout with CI builds
            createSafe()
                .then((createdSafe) => {
                    return createdSafe.write_triplesec('mysecret with triplecec')
                        .then((writtenSecret) => {
                            return createdSafe.read(writtenSecret);
                        })
                        .then((decrypted) => {
                            decrypted.should.equal('mysecret with triplecec', 'Unexpected decrypted value');
                            done();
                        });
                })
                .catch((err) => {
                    done(err);
                })
                .done();
        });

        it('Tamper with the safe key and fail to read and write', (done) => {
            createSafe()
                .then((createdSafe) => {
                    return createdSafe.write('mysecret')
                        .then((writtenSecret) => {
                            createdSafe.safeModel.key = 'jim';
                            createdSafe.read(writtenSecret)
                                .then((decrypted) => {
                                    decrypted.should.not.equal('mysecret', 'Unexpected decrypted value');
                                    done();
                                })
                                .catch(() => {
                                    done();
                                });
                        });
                });

        });
    });
});

function createSafe() {
    return createAccount('new-key')
        .then((account) => {
            return safe.getOrCreateSafe(account);
        });
}

function createAccount(username) {
    const userMetaData = [
        {
            userName: username,
            email: `${username}@email.com`,
            provider: { name: 'github', credentials: { accessToken: 'token' } },
            roles: ['User', 'Admin'],
            account: { name: `${username}-account`, provider: 'github', isAdmin: true },
            user_data: { image: '' }
        }
    ];
    return Promise.fromCallback(cb => helpers.storeTestUsers(userMetaData, cb))
        .then(() => {
            return Account.findOne({ name: `${username}-account` });
        });
}
