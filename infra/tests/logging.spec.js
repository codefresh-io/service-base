const _ = require('lodash');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const toJsonStub = sinon.stub();

// eslint-disable-next-line max-len
const config = proxyquire('../config', { '@codefresh-io/http-infra': { getAuthenticatedEntity: () => ({ toJson: toJsonStub }) } });
const logging = proxyquire('../logging', { './config': config });

describe('logging test', () => {
    it('authenticated entity should not change due to formatting when printing the log', async () => {
        const authEntity = {
            type: 'user',
            id: 'test',
            key: 'test',
            account: {
                name: 'test',
                id: 'test',
                key: 'test',
            },
            activeAccount: {
                name: 'test',
                id: 'test',
                key: 'test',
            },
        };
        toJsonStub.reset();
        toJsonStub.returns(authEntity);
        const authEntityClone = _.cloneDeep(authEntity);
        expect(authEntity).to.deep.equal(authEntityClone);
        await logging.init(config);
        const logger = logging.getLogger('test');
        logger.info('test');
        expect(authEntity).to.deep.equal(authEntityClone);
    });
});
