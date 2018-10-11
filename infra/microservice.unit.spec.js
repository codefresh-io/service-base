/* eslint-disable */

const chai = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const cflogs = require('cf-logs');
const expect = chai.expect;
const sinon = require('sinon');

describe('Microservice', () => {


  const proxy = proxyquire('./index.js', {
    './config': {
      'getConfigArray' : function () {
        return [];
      },
      'gracePeriodTimers': {
        'totalPeriod' : 100000,
        'secondsToAcceptAdditionalRequests' : 10,
        'secondsToProcessOngoingRequests' : 10,
        'secondsToCloseInfraConnections' : 10
      }

    },
    './logging' : {
      'init' : async () => {}
    },
    './express' : {
      'stop' : () => {}
    },
    'logger' : {
      'info' : () => {}
    }

  });
  proxy.init = (function(){
    this.logger = cflogs.Logger('codefresh:infra:index');
  }).bind(proxy);




  describe('shutdown', () => {
    it('shutdown custom function', async () => {

      sinon.stub(process, 'exit');

      proxy.init();

      await proxy.stop(function(){
          expect(true).to.equal(true);
      });



    });

  });

});
